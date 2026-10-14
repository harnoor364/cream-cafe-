/* Menu page: category tabs, search, add/qty controls — all from data/menu.json */
(function () {
  "use strict";
  var CC = window.CC;
  var state = { cat: "all", q: "" };
  var els = {};

  function itemHtml(it) {
    var label = CC.priceLabel(it);
    return '<article class="menu-item' + (it.image ? " has-img" : "") + '">' +
      (it.image ? '<img src="' + CC.esc(it.image) + '" alt="" loading="lazy" decoding="async" width="84" height="84">' : "") +
      "<div>" +
      '<h3 class="mi-name"><span class="veg-mark' + (it.veg === false ? " nonveg" : "") + '" role="img" aria-label="' + (it.veg === false ? "Non-vegetarian" : "Vegetarian") + '"></span>' + CC.esc(it.name) + "</h3>" +
      '<p class="mi-desc">' + CC.esc(it.description) + "</p>" +
      '<div class="mi-meta"><span class="price' + (label.indexOf("XXX") > -1 ? " tbc" : "") + '">' + CC.esc(label) + "</span>" +
      (it.popular ? '<span class="tag tag-rose">Popular</span>' : "") +
      (it.sample ? '<span class="tag tag-sample" title="Sample item — replace with the café\'s real menu">Sample</span>' : "") +
      "</div></div>" +
      '<div class="mi-action" data-compact data-action-for="' + CC.esc(it.id) + '">' + CC.actionHtml(it, false, true) + "</div>" +
      "</article>";
  }

  function norm(s) { return String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, ""); }

  function render() {
    var m = CC.menu, q = norm(state.q).trim();
    var cats = m.categories.filter(function (c) { return state.cat === "all" || q || c.id === state.cat; });
    var html = "", total = 0;
    cats.forEach(function (c) {
      var items = m.items.filter(function (it) {
        if (it.category !== c.id) return false;
        if (!q) return true;
        return norm(it.name + " " + it.description + " " + c.name).indexOf(q) > -1;
      });
      if (!items.length) return;
      total += items.length;
      html += '<section class="menu-cat" aria-labelledby="h-' + c.id + '"><div class="menu-cat-head"><h2 id="h-' + c.id + '">' + CC.esc(c.name) + "</h2><p>" + CC.esc(c.blurb) + "</p></div>" +
        '<div class="menu-list">' + items.map(itemHtml).join("") + "</div></section>";
    });
    if (!total) {
      html = '<div class="empty-state"><svg class="icon big-icon" aria-hidden="true"><use href="#i-scoop"/></svg><p>No dishes match “' + CC.esc(state.q) + '”.<br>Try “pizza”, “shake” or “mojito”.</p></div>';
    }
    els.results.innerHTML = html;
    els.status.textContent = q ? total + (total === 1 ? " dish" : " dishes") + " found" : "";
  }

  function selectTab(cat, focus) {
    state.cat = cat;
    els.tabs.querySelectorAll(".tab").forEach(function (t) {
      var on = t.getAttribute("data-cat") === cat;
      t.setAttribute("aria-selected", String(on));
      t.tabIndex = on ? 0 : -1;
      if (on) { if (focus) t.focus(); t.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" }); }
    });
    if (state.q) { state.q = ""; els.search.value = ""; els.searchWrap.classList.remove("has-text"); }
    render();
  }

  document.addEventListener("DOMContentLoaded", function () {
    els.results = document.getElementById("menuResults");
    els.tabs = document.getElementById("menuTabs");
    els.search = document.getElementById("menuSearch");
    els.searchWrap = els.search.parentNode;
    els.status = document.getElementById("searchStatus");

    CC.loadMenu().then(function (m) {
      var tabs = [{ id: "all", name: "All" }].concat(m.categories);
      els.tabs.innerHTML = tabs.map(function (c) {
        return '<button type="button" class="tab" role="tab" aria-controls="menuResults" data-cat="' + c.id + '" aria-selected="false" tabindex="-1">' + CC.esc(c.name) + "</button>";
      }).join("");
      var fromHash = (location.hash || "").slice(1);
      selectTab(m.categories.some(function (c) { return c.id === fromHash; }) ? fromHash : "all");
    }).catch(function () {
      els.results.innerHTML = '<div class="empty-state"><p>Sorry, the menu couldn\'t load. Please refresh, or call us to order.</p></div>';
    });

    els.tabs.addEventListener("click", function (e) {
      var t = e.target.closest(".tab");
      if (!t) return;
      selectTab(t.getAttribute("data-cat"));
      if (history.replaceState) history.replaceState(null, "", t.getAttribute("data-cat") === "all" ? location.pathname : "#" + t.getAttribute("data-cat"));
    });
    els.tabs.addEventListener("keydown", function (e) {
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
      var list = Array.prototype.slice.call(els.tabs.querySelectorAll(".tab"));
      var i = list.indexOf(document.activeElement);
      if (i < 0) return;
      e.preventDefault();
      var next = list[(i + (e.key === "ArrowRight" ? 1 : -1) + list.length) % list.length];
      selectTab(next.getAttribute("data-cat"), true);
    });
    var timer;
    els.search.addEventListener("input", function () {
      clearTimeout(timer);
      els.searchWrap.classList.toggle("has-text", !!els.search.value);
      timer = setTimeout(function () {
        state.q = els.search.value;
        els.tabs.querySelectorAll(".tab").forEach(function (t) { t.setAttribute("aria-selected", String(!state.q && t.getAttribute("data-cat") === state.cat)); });
        if (CC.menu) render();
      }, 120);
    });
    els.searchWrap.querySelector(".clear").addEventListener("click", function () {
      els.search.value = ""; els.searchWrap.classList.remove("has-text"); state.q = ""; selectTab(state.cat); els.search.focus();
    });
  });
})();
