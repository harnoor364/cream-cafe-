/*
 * Shared site behaviour: config binding, demo banner, nav, cart store + badge,
 * menu loading, add-to-order buttons, scroll reveal, lightbox, toast.
 */
(function () {
  "use strict";
  var C = window.CAFE_CONFIG || {};
  var P = window.CCPricing;
  var CC = (window.CC = window.CC || {});
  document.documentElement.classList.remove("no-js");

  // ---------- Safe storage (private mode / blocked storage fall back to memory) ----------
  var mem = {};
  CC.store = {
    get: function (k, fallback) {
      try { var v = window.localStorage.getItem(k); return v == null ? fallback : JSON.parse(v); }
      catch (e) { return k in mem ? mem[k] : fallback; }
    },
    set: function (k, v) {
      try { window.localStorage.setItem(k, JSON.stringify(v)); }
      catch (e) { mem[k] = v; }
    }
  };

  // ---------- Helpers ----------
  CC.esc = function (s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (ch) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch];
    });
  };
  CC.money = function (n) { return P.formatINR(n, C.currency); };
  CC.isEstimate = function (item) { return !item.priceConfirmed; };
  /** Price label for menu cards: "₹XXX" while unconfirmed (unless showEstimatedPrices). */
  CC.priceLabel = function (item) {
    if (item.priceConfirmed || C.showEstimatedPrices) return CC.money(item.price);
    return (C.currency || "₹") + "XXX";
  };
  CC.waUrl = function (text) { return P.waLink(C.whatsapp, text || ""); };
  CC.openWhatsApp = function (text) {
    var url = CC.waUrl(text);
    var w = window.open(url, "_blank", "noopener");
    if (!w) window.location.href = url;
    return url;
  };

  // ---------- Cart store ----------
  var CART_KEY = "cc_cart_v1";
  function readCart() {
    var c = CC.store.get(CART_KEY, []);
    return Array.isArray(c) ? c.filter(function (l) { return l && l.id && l.qty > 0; }) : [];
  }
  CC.cart = {
    lines: readCart,
    qty: function (id) {
      var l = readCart().find(function (x) { return x.id === id; });
      return l ? l.qty : 0;
    },
    count: function () { return readCart().reduce(function (s, l) { return s + l.qty; }, 0); },
    /** Set quantity for an item (snapshot of name/price kept so the order page works offline). */
    setQty: function (item, qty) {
      var lines = readCart();
      var i = lines.findIndex(function (x) { return x.id === item.id; });
      qty = Math.max(0, Math.min(50, Math.round(qty)));
      if (qty === 0) { if (i > -1) lines.splice(i, 1); }
      else {
        var snap = { id: item.id, name: item.name, price: item.price, priceConfirmed: !!item.priceConfirmed, veg: item.veg !== false, qty: qty };
        if (i > -1) lines[i] = snap; else lines.push(snap);
      }
      CC.store.set(CART_KEY, lines);
      document.dispatchEvent(new CustomEvent("cart:change", { detail: { id: item.id, qty: qty } }));
    },
    clear: function () {
      CC.store.set(CART_KEY, []);
      document.dispatchEvent(new CustomEvent("cart:change", { detail: {} }));
    }
  };

  function updateBadges(bump) {
    var n = CC.cart.count();
    document.querySelectorAll("[data-cart-count]").forEach(function (el) {
      el.textContent = n > 99 ? "99+" : String(n);
      el.hidden = n === 0;
      if (bump && n > 0) { el.classList.remove("bump"); void el.offsetWidth; el.classList.add("bump"); }
    });
    document.querySelectorAll(".cart-link").forEach(function (a) {
      a.setAttribute("aria-label", "Your order, " + n + (n === 1 ? " item" : " items"));
    });
    var pill = document.getElementById("orderPill");
    if (pill) {
      var lines = CC.cart.lines();
      var sub = lines.reduce(function (s, l) { return s + l.price * l.qty; }, 0);
      var anyEst = lines.some(function (l) { return !l.priceConfirmed; });
      pill.classList.toggle("show", n > 0);
      pill.querySelector("[data-pill-count]").textContent = n + (n === 1 ? " item" : " items");
      pill.querySelector("[data-pill-total]").textContent = (anyEst && !C.showEstimatedPrices) ? "View order →" : CC.money(sub) + " →";
    }
  }
  document.addEventListener("cart:change", function () { updateBadges(true); });
  window.addEventListener("storage", function (e) { if (e.key === CART_KEY) { updateBadges(false); CC.refreshSteppers && CC.refreshSteppers(); } });

  // ---------- Menu data ----------
  var menuPromise = null;
  CC.loadMenu = function () {
    if (!menuPromise) {
      menuPromise = fetch("data/menu.json", { cache: "no-cache" })
        .then(function (r) { if (!r.ok) throw new Error("menu " + r.status); return r.json(); })
        .then(function (m) { CC.menu = m; CC.menuIndex = {}; m.items.forEach(function (it) { CC.menuIndex[it.id] = it; }); return m; });
    }
    return menuPromise;
  };

  // ---------- Add / stepper controls ----------
  CC.actionHtml = function (item, light, compact) {
    var q = CC.cart.qty(item.id);
    if (q === 0) {
      return '<button type="button" class="btn btn-primary btn-add" data-add="' + CC.esc(item.id) + '" aria-label="Add ' + CC.esc(item.name) + ' to order">' + (compact ? "Add +" : "Add to Order") + "</button>";
    }
    return '<div class="qty' + (light ? " qty-light" : "") + '" role="group" aria-label="Quantity of ' + CC.esc(item.name) + '">' +
      '<button type="button" data-dec="' + CC.esc(item.id) + '" aria-label="Remove one ' + CC.esc(item.name) + '">−</button>' +
      '<output aria-live="polite">' + q + '</output>' +
      '<button type="button" data-inc="' + CC.esc(item.id) + '" aria-label="Add one more ' + CC.esc(item.name) + '">+</button></div>';
  };
  CC.refreshSteppers = function () {
    document.querySelectorAll("[data-action-for]").forEach(function (slot) {
      var item = CC.menuIndex && CC.menuIndex[slot.getAttribute("data-action-for")];
      if (item) slot.innerHTML = CC.actionHtml(item, slot.hasAttribute("data-light"), slot.hasAttribute("data-compact"));
    });
  };
  document.addEventListener("click", function (e) {
    var t = e.target.closest("[data-add],[data-inc],[data-dec]");
    if (!t || !CC.menuIndex) return;
    var id = t.getAttribute("data-add") || t.getAttribute("data-inc") || t.getAttribute("data-dec");
    var item = CC.menuIndex[id];
    if (!item) return;
    var q = CC.cart.qty(id);
    var isAdd = t.hasAttribute("data-add");
    CC.cart.setQty(item, t.hasAttribute("data-dec") ? q - 1 : q + 1);
    if (isAdd) CC.toast(item.name + " added to your order");
    var slot = t.closest("[data-action-for]");
    CC.refreshSteppers();
    // keep keyboard focus on the control the user was using
    if (slot) {
      var next = slot.querySelector(isAdd ? "[data-inc]" : (t.hasAttribute("data-dec") ? "[data-dec]" : "[data-inc]")) || slot.querySelector("button");
      if (next) next.focus();
    }
  });

  // ---------- Toast ----------
  var toastEl, toastTimer;
  CC.toast = function (msg) {
    if (!toastEl) {
      toastEl = document.createElement("div");
      toastEl.className = "toast"; toastEl.setAttribute("role", "status"); toastEl.setAttribute("aria-live", "polite");
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove("show"); }, 2200);
  };

  // ---------- Config → page ----------
  CC.fullAddress = function () {
    var a = C.address || {};
    return [a.line1, a.line2, a.city, a.state + " " + a.pincode].filter(Boolean).join(", ");
  };
  CC.hoursText = function () { return C.hours.days + " · " + C.hours.openDisplay + " – " + C.hours.closeDisplay; };
  CC.isOpenNow = function () { return P.isOpenAt(C.hours, new Date()); };

  function bindConfig() {
    var texts = {
      name: C.name, phone: C.phoneDisplay, address: CC.fullAddress(), hours: CC.hoursText(),
      open: C.hours.openDisplay, close: C.hours.closeDisplay, entrance: C.address.entranceNote,
      rating: String(C.googleRating.score), reviews: String(C.googleRating.count), upi: C.upiId,
      radius: String(C.delivery.radiusKm), fee: CC.money(C.delivery.fee), freeAbove: CC.money(C.delivery.freeAbove),
      minOrder: CC.money(C.delivery.minOrder), discount: String(C.directOrderDiscountPercent), year: String(new Date().getFullYear())
    };
    document.querySelectorAll("[data-cfg]").forEach(function (el) {
      var k = el.getAttribute("data-cfg");
      if (texts[k] != null) el.textContent = texts[k];
    });
    var hrefs = {
      tel: "tel:" + C.phoneTel, whatsapp: CC.waUrl("Hi " + C.name + "! "), maps: C.googleMapsUrl, directions: C.directionsUrl
    };
    // "Order Now" → Swiggy when configured, otherwise the on-site menu
    document.querySelectorAll('[data-href="swiggy"]').forEach(function (el) {
      if (C.swiggyUrl) { el.setAttribute("href", C.swiggyUrl); el.setAttribute("target", "_blank"); el.setAttribute("rel", "noopener"); }
      else { el.setAttribute("href", "menu.html"); el.removeAttribute("target"); el.removeAttribute("rel"); }
    });
    document.querySelectorAll("[data-href]").forEach(function (el) {
      var k = el.getAttribute("data-href");
      if (hrefs[k]) el.setAttribute("href", hrefs[k]);
    });
    document.querySelectorAll("iframe[data-map]").forEach(function (f) { f.src = C.mapEmbedUrl; });
    if (C.directOrderDiscountPercent <= 0) document.querySelectorAll("[data-if-discount]").forEach(function (el) { el.hidden = true; });
    if (!C.services.driveThrough) document.querySelectorAll("[data-if-drive]").forEach(function (el) { el.hidden = true; });
    if (!C.services.delivery) document.querySelectorAll("[data-if-delivery]").forEach(function (el) { el.hidden = true; });
    if (C.pureVeg) document.querySelectorAll("[data-if-pureveg]").forEach(function (el) { el.hidden = false; });
    if (C.instagram) document.querySelectorAll("[data-if-instagram]").forEach(function (el) { el.hidden = false; el.querySelector("a").href = C.instagram; });

    // Open/closed status chips
    var open = CC.isOpenNow();
    document.querySelectorAll("[data-open-status]").forEach(function (el) {
      el.classList.toggle("is-open", open);
      var label = el.querySelector("[data-open-label]");
      if (label) label.textContent = open ? "Open now · till " + C.hours.closeDisplay : "Opens " + C.hours.openDisplay + " · till " + C.hours.closeDisplay;
    });

    // Demo banner + credit
    var banner = document.getElementById("demoBanner");
    if (banner) {
      if (!C.demo || !C.demo.enabled) banner.remove();
      else {
        banner.querySelector("button").addEventListener("click", function () {
          banner.remove();
          try { sessionStorage.setItem("cc_demo_dismissed", "1"); } catch (e) { /* ignore */ }
        });
      }
    }
  }

  // ---------- Nav ----------
  function initNav() {
    var toggle = document.querySelector(".nav-toggle");
    var nav = document.getElementById("mainNav");
    if (toggle && nav) {
      toggle.addEventListener("click", function () {
        var open = toggle.getAttribute("aria-expanded") !== "true";
        toggle.setAttribute("aria-expanded", String(open));
        nav.classList.toggle("open", open);
      });
      document.addEventListener("keydown", function (e) {
        if (e.key === "Escape" && nav.classList.contains("open")) { toggle.click(); toggle.focus(); }
      });
      nav.addEventListener("click", function (e) { if (e.target.closest("a") && nav.classList.contains("open")) toggle.click(); });
    }
    var header = document.querySelector(".site-header");
    var onScroll = function () { header && header.classList.toggle("scrolled", window.scrollY > 8); };
    window.addEventListener("scroll", onScroll, { passive: true }); onScroll();
    if (window.matchMedia("(pointer: coarse)").matches || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) document.documentElement.classList.add("is-touch");
  }

  // ---------- Scroll reveal ----------
  CC.observeReveal = function (root) {
    var els = (root || document).querySelectorAll(".reveal:not(.in), .reveal-stagger:not(.in)");
    if (!("IntersectionObserver" in window)) { els.forEach(function (el) { el.classList.add("in"); }); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); } });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    els.forEach(function (el) { io.observe(el); });
  };

  // ---------- Lightbox ----------
  function initLightbox() {
    var gallery = document.querySelector("[data-gallery]");
    if (!gallery) return;
    var items = Array.prototype.slice.call(gallery.querySelectorAll("button"));
    var lb = document.createElement("div");
    lb.className = "lightbox"; lb.setAttribute("role", "dialog"); lb.setAttribute("aria-modal", "true"); lb.setAttribute("aria-label", "Photo viewer");
    lb.innerHTML = '<figure style="margin:0"><img alt=""><figcaption></figcaption></figure>' +
      '<button class="lb-btn lb-close" aria-label="Close">×</button><button class="lb-btn lb-prev" aria-label="Previous photo">‹</button><button class="lb-btn lb-next" aria-label="Next photo">›</button>';
    document.body.appendChild(lb);
    var img = lb.querySelector("img"), cap = lb.querySelector("figcaption"), idx = 0, lastFocus;
    function show(i) {
      idx = (i + items.length) % items.length;
      var src = items[idx].querySelector("img");
      img.src = src.getAttribute("src"); img.alt = src.alt; cap.textContent = src.alt;
    }
    function open(i) { lastFocus = document.activeElement; show(i); lb.classList.add("open"); document.body.style.overflow = "hidden"; lb.querySelector(".lb-close").focus(); }
    function close() { lb.classList.remove("open"); document.body.style.overflow = ""; lastFocus && lastFocus.focus(); }
    items.forEach(function (b, i) { b.addEventListener("click", function () { open(i); }); });
    lb.querySelector(".lb-close").addEventListener("click", close);
    lb.querySelector(".lb-prev").addEventListener("click", function () { show(idx - 1); });
    lb.querySelector(".lb-next").addEventListener("click", function () { show(idx + 1); });
    lb.addEventListener("click", function (e) { if (e.target === lb) close(); });
    document.addEventListener("keydown", function (e) {
      if (!lb.classList.contains("open")) return;
      if (e.key === "Escape") close();
      if (e.key === "ArrowLeft") show(idx - 1);
      if (e.key === "ArrowRight") show(idx + 1);
    });
    var x0 = null;
    lb.addEventListener("touchstart", function (e) { x0 = e.touches[0].clientX; }, { passive: true });
    lb.addEventListener("touchend", function (e) {
      if (x0 == null) return;
      var dx = e.changedTouches[0].clientX - x0;
      if (Math.abs(dx) > 40) show(idx + (dx < 0 ? 1 : -1));
      x0 = null;
    });
  }

  // ---------- Forms: simple validation + "send on WhatsApp" ----------
  CC.validateForm = function (form) {
    var ok = true, first = null;
    form.querySelectorAll("input, select, textarea").forEach(function (el) {
      var field = el.closest(".field");
      if (!field || el.disabled || el.closest("[hidden]")) return;
      var valid = el.checkValidity();
      field.classList.toggle("invalid", !valid);
      if (!valid) { ok = false; first = first || el; }
    });
    if (first) first.focus();
    return ok;
  };
  function initForms() {
    document.querySelectorAll("form[data-validate]").forEach(function (form) {
      form.setAttribute("novalidate", "");
      form.addEventListener("submit", function (e) { if (!CC.validateForm(form)) e.preventDefault(); });
      form.addEventListener("input", function (e) {
        var f = e.target.closest(".field");
        if (f && f.classList.contains("invalid") && e.target.checkValidity()) f.classList.remove("invalid");
      });
    });
    document.querySelectorAll("[data-wa-form]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var form = document.getElementById(btn.getAttribute("data-wa-form"));
        if (!CC.validateForm(form)) return;
        var lines = [btn.getAttribute("data-wa-title") || "Hi " + C.name + "!"];
        form.querySelectorAll("[data-wa-label]").forEach(function (el) {
          if (el.value && el.value.trim()) lines.push(el.getAttribute("data-wa-label") + ": " + el.value.trim());
        });
        CC.openWhatsApp(lines.join("\n"));
      });
    });
    // min date = today for date pickers
    var today = new Date(); today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
    document.querySelectorAll("input[type=date][data-min-today]").forEach(function (d) { d.min = today.toISOString().slice(0, 10); });
  }

  document.addEventListener("DOMContentLoaded", function () {
    bindConfig();
    initNav();
    initLightbox();
    initForms();
    updateBadges(false);
    CC.observeReveal();
  });
})();
