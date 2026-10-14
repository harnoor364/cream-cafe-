/*
 * Order page: cart, order type, customer details, payment, bill,
 * UPI QR (qrcodejs from cdnjs) and WhatsApp hand-off.
 */
(function () {
  "use strict";
  var C = window.CAFE_CONFIG, P = window.CCPricing, CC = window.CC;
  var SEQ_KEY = "cc_order_seq", CUST_KEY = "cc_customer_v1";
  var $ = function (id) { return document.getElementById(id); };
  var form, pendingOrder = null;

  function orderType() { var r = form.querySelector("input[name=orderType]:checked"); return r ? r.value : "pickup"; }
  function payment() { var r = form.querySelector("input[name=payment]:checked"); return r ? r.value : "cash"; }
  function cashLabel(type) {
    return { pickup: "Pay at counter (cash / card / UPI)", drive: "Pay at your car (cash / UPI)", delivery: "Cash on delivery" }[type];
  }

  // ---------- Cart lines ----------
  function renderCart() {
    var lines = CC.cart.lines();
    var list = $("cartLines");
    $("cartEmpty").hidden = lines.length > 0;
    $("cartFilled").hidden = lines.length === 0;
    list.innerHTML = lines.map(function (l) {
      var est = !l.priceConfirmed ? '<span class="est" title="Estimated price">*</span>' : "";
      return '<li class="cart-line">' +
        '<div><div class="cl-name"><span class="veg-mark' + (l.veg === false ? " nonveg" : "") + '" role="img" aria-label="' + (l.veg === false ? "Non-vegetarian" : "Vegetarian") + '"></span>' + CC.esc(l.name) + "</div>" +
        '<div class="cl-unit">' + CC.money(l.price) + est + " each</div></div>" +
        '<div class="cl-total">' + CC.money(l.price * l.qty) + est + "</div>" +
        '<div class="cl-controls"><div class="qty qty-light" role="group" aria-label="Quantity of ' + CC.esc(l.name) + '">' +
        '<button type="button" data-line-dec="' + CC.esc(l.id) + '" aria-label="Remove one ' + CC.esc(l.name) + '">−</button><output aria-live="polite">' + l.qty + "</output>" +
        '<button type="button" data-line-inc="' + CC.esc(l.id) + '" aria-label="Add one more ' + CC.esc(l.name) + '">+</button></div>' +
        '<button type="button" class="cl-remove" data-line-remove="' + CC.esc(l.id) + '">Remove</button></div>' +
        "</li>";
    }).join("");
    renderBill();
  }

  // ---------- Bill ----------
  function currentBill() { return P.computeBill(CC.cart.lines(), orderType(), C); }
  function renderBill() {
    var b = currentBill();
    var lines = CC.cart.lines();
    var anyEst = lines.some(function (l) { return !l.priceConfirmed; });
    var star = anyEst ? '<span class="est">*</span>' : "";
    var rows = '<div><dt>Subtotal (' + b.itemCount + (b.itemCount === 1 ? " item" : " items") + ")</dt><dd data-bill=\"subtotal\">" + CC.money(b.subtotal) + star + "</dd></div>";
    if (b.discount > 0) rows += '<div class="discount"><dt>Direct-order discount (' + b.discountPercent + '%)</dt><dd data-bill="discount">−' + CC.money(b.discount) + "</dd></div>";
    if (b.isDelivery) rows += '<div><dt>Delivery fee</dt><dd data-bill="delivery">' + (b.deliveryFee === 0 && b.subtotal > 0 ? "FREE" : CC.money(b.deliveryFee)) + "</dd></div>";
    rows += '<div class="total"><dt>Total</dt><dd data-bill="total">' + CC.money(b.total) + star + "</dd></div>";
    $("bill").innerHTML = rows;

    var msg = $("billMsg");
    msg.hidden = true; msg.className = "bill-msg";
    if (b.belowMinimum && b.itemCount > 0) {
      msg.hidden = false; msg.classList.add("warn");
      msg.textContent = "Minimum order for delivery is " + CC.money(C.delivery.minOrder) + " — add " + CC.money(b.minimumGap) + " more, or choose pickup.";
    } else if (b.freeDeliveryGap > 0 && b.itemCount > 0) {
      msg.hidden = false; msg.classList.add("info");
      msg.textContent = "Add " + CC.money(b.freeDeliveryGap) + " more for FREE delivery.";
    } else if (b.isDelivery && b.deliveryFee === 0 && b.itemCount > 0) {
      msg.hidden = false; msg.classList.add("info");
      msg.textContent = "You've unlocked free delivery!";
    }
    $("estNote").hidden = !anyEst;
    var btn = $("placeOrder");
    btn.disabled = !b.canOrder;
    btn.querySelector("[data-place-total]").textContent = b.itemCount ? " · " + CC.money(b.total) : "";
    $("mobileTotal") && ($("mobileTotal").textContent = CC.money(b.total));
  }

  // ---------- Order type / payment UI ----------
  function syncType() {
    var t = orderType();
    form.querySelectorAll("[data-for]").forEach(function (el) {
      var show = el.getAttribute("data-for").split(" ").indexOf(t) > -1;
      el.hidden = !show;
      el.querySelectorAll("input, textarea, select").forEach(function (i) { i.disabled = !show; });
    });
    $("cashLabel").textContent = cashLabel(t);
    renderBill();
  }

  // ---------- Order ID ----------
  function peekOrderId() {
    var now = new Date();
    var key = P.makeOrderId("", now, 0).slice(1, 5); // MMDD
    var s = CC.store.get(SEQ_KEY, null);
    var n = s && s.d === key ? s.n + 1 : 1;
    return { id: P.makeOrderId(C.orderIdPrefix, now, n), d: key, n: n };
  }
  function commitOrderId(o) { CC.store.set(SEQ_KEY, { d: o.d, n: o.n }); }

  // ---------- Build order ----------
  function collect() {
    var v = function (name) { var el = form.elements[name]; return el && !el.disabled ? el.value.trim() : ""; };
    return { name: v("name"), phone: v("phone"), address: v("address"), landmark: v("landmark"), car: v("car"), notes: v("notes") };
  }
  function buildOrder() {
    var type = orderType(), pay = payment();
    var lines = CC.cart.lines();
    var idInfo = pendingOrder && pendingOrder.idInfo ? pendingOrder.idInfo : peekOrderId();
    var bill = P.computeBill(lines, type, C);
    return {
      idInfo: idInfo, id: idInfo.id, type: type, lines: lines, bill: bill, customer: collect(), payment: pay,
      paymentLabel: pay === "upi" ? "UPI — paid " + CC.money(bill.total) + " to " + C.upiId + " (please verify)" : cashLabel(type),
      hasEstimatedPrices: lines.some(function (l) { return !l.priceConfirmed; })
    };
  }

  // ---------- Modals ----------
  var lastFocus;
  function openModal(id) {
    lastFocus = document.activeElement;
    var m = $(id); m.classList.add("open"); document.body.style.overflow = "hidden";
    var f = m.querySelector("[data-autofocus]") || m.querySelector("button, a"); f && f.focus();
  }
  function closeModal(id) { $(id).classList.remove("open"); document.body.style.overflow = ""; lastFocus && lastFocus.focus && lastFocus.focus(); }

  function showPayment(order) {
    var link = P.upiLink({ upiId: C.upiId, payeeName: C.upiPayeeName || C.name, amount: order.bill.total, note: "Order " + order.id });
    $("payAmount").textContent = CC.money(order.bill.total);
    $("payOrderId").textContent = order.id;
    $("payUpiId").textContent = C.upiId;
    $("payAppBtn").setAttribute("href", link);
    var box = $("qrBox");
    box.innerHTML = "";
    box.setAttribute("data-upi", link);
    if (window.QRCode) {
      try {
        new window.QRCode(box, { text: link, width: 212, height: 212, colorDark: "#2B1911", colorLight: "#ffffff", correctLevel: window.QRCode.CorrectLevel.M });
        box.setAttribute("role", "img");
        box.setAttribute("aria-label", "UPI QR code to pay " + CC.money(order.bill.total) + " for order " + order.id);
      } catch (e) { box.textContent = "QR unavailable — please pay to the UPI ID below."; }
    } else {
      box.textContent = "QR couldn't load — please pay to the UPI ID below or use the UPI app button.";
    }
    openModal("payModal");
  }

  function sendOrder(order) {
    var text = P.buildWhatsAppMessage(order, C);
    var url = CC.openWhatsApp(text);
    commitOrderId(order.idInfo);
    CC.store.set("cc_last_order", { id: order.id, total: order.bill.total, type: order.type, at: Date.now() });
    // Remember details (not the address notes) for next time
    CC.store.set(CUST_KEY, { name: order.customer.name, phone: order.customer.phone, address: order.customer.address, landmark: order.customer.landmark, car: order.customer.car });
    pendingOrder = null;
    if ($("payModal").classList.contains("open")) closeModal("payModal");
    showDone(order, url);
    CC.cart.clear();
  }

  function showDone(order, url) {
    $("doneId").textContent = order.id;
    $("doneType").textContent = P.ORDER_TYPES[order.type];
    $("doneTotal").textContent = CC.money(order.bill.total);
    $("donePay").textContent = order.payment === "upi" ? "UPI" : cashLabel(order.type);
    $("doneWa").setAttribute("href", url);
    $("doneNext").textContent = {
      pickup: "We'll message you on WhatsApp when it's ready to collect.",
      drive: "Pull up outside and we'll bring it to your car (" + (order.customer.car || "car no. shared") + ").",
      delivery: "We'll confirm the delivery time on WhatsApp."
    }[order.type];
    openModal("doneModal");
  }

  // ---------- Delivery area check ----------
  function geoCheck() {
    var out = $("geoResult");
    if (!navigator.geolocation) { out.textContent = "Location isn't available on this device — just add your address and we'll confirm."; return; }
    out.className = "geo-result"; out.textContent = "Checking your location…";
    navigator.geolocation.getCurrentPosition(function (pos) {
      var km = P.distanceKm(C.geo, { lat: pos.coords.latitude, lng: pos.coords.longitude });
      var ok = km <= C.delivery.radiusKm;
      out.className = "geo-result " + (ok ? "geo-ok" : "geo-warn");
      out.textContent = ok
        ? "Great — you're about " + km.toFixed(1) + " km away, inside our " + C.delivery.radiusKm + " km delivery area."
        : "You're about " + km.toFixed(1) + " km away — outside our usual " + C.delivery.radiusKm + " km area. Send the order anyway and we'll confirm, or choose pickup.";
    }, function () {
      out.className = "geo-result"; out.textContent = "Couldn't get your location — add your address and we'll confirm.";
    }, { timeout: 10000, maximumAge: 300000 });
  }

  // ---------- Init ----------
  document.addEventListener("DOMContentLoaded", function () {
    form = $("orderForm");
    if (!form) return;

    // Prefill remembered customer details
    var saved = CC.store.get(CUST_KEY, null);
    if (saved) Object.keys(saved).forEach(function (k) { if (form.elements[k] && saved[k]) form.elements[k].value = saved[k]; });
    // Respect ?type=drive|delivery|pickup
    var qp = new URLSearchParams(location.search).get("type");
    if (qp && form.querySelector("input[name=orderType][value=" + qp + "]")) form.querySelector("input[name=orderType][value=" + qp + "]").checked = true;

    if (!CC.isOpenNow()) $("closedNote").hidden = false;

    syncType();
    renderCart();
    // Refresh names/prices from the latest menu.json (drop items no longer on the menu)
    CC.loadMenu().then(function () {
      CC.cart.lines().forEach(function (l) {
        var it = CC.menuIndex[l.id];
        if (!it) CC.cart.setQty({ id: l.id }, 0);
        else if (it.price !== l.price || it.name !== l.name || !!it.priceConfirmed !== l.priceConfirmed) CC.cart.setQty(it, l.qty);
      });
      renderCart();
    }).catch(function () { /* cart snapshots still work */ });

    document.addEventListener("cart:change", renderCart);
    $("cartLines").addEventListener("click", function (e) {
      var t = e.target.closest("[data-line-inc],[data-line-dec],[data-line-remove]");
      if (!t) return;
      var id = t.getAttribute("data-line-inc") || t.getAttribute("data-line-dec") || t.getAttribute("data-line-remove");
      var line = CC.cart.lines().find(function (l) { return l.id === id; });
      if (!line) return;
      var q = t.hasAttribute("data-line-remove") ? 0 : line.qty + (t.hasAttribute("data-line-inc") ? 1 : -1);
      CC.cart.setQty(line, q);
      var sel = t.hasAttribute("data-line-inc") ? "[data-line-inc=\"" + id + "\"]" : "[data-line-dec=\"" + id + "\"]";
      var again = $("cartLines").querySelector(sel);
      if (again) again.focus(); else $("orderHeading").focus();
    });

    form.addEventListener("change", function (e) {
      if (e.target.name === "orderType") { syncType(); pendingOrder = null; }
    });
    $("geoBtn") && $("geoBtn").addEventListener("click", geoCheck);
    form.addEventListener("input", function (e) {
      var f = e.target.closest(".field");
      if (f && f.classList.contains("invalid") && e.target.checkValidity()) f.classList.remove("invalid");
    });

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var b = currentBill();
      if (!b.itemCount) { CC.toast("Your order is empty — add something delicious first!"); return; }
      if (b.belowMinimum) { CC.toast("Delivery minimum is " + CC.money(C.delivery.minOrder)); return; }
      if (!CC.validateForm(form)) { CC.toast("Please fill in the highlighted details"); return; }
      pendingOrder = buildOrder();
      if (pendingOrder.payment === "upi") showPayment(pendingOrder);
      else sendOrder(pendingOrder);
    });

    $("paidBtn").addEventListener("click", function () { if (pendingOrder) sendOrder(pendingOrder); });
    $("copyUpi").addEventListener("click", function () {
      var done = function () { CC.toast("UPI ID copied"); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(C.upiId).then(done, function () { CC.toast(C.upiId); });
      else CC.toast(C.upiId);
    });
    document.querySelectorAll("[data-close-modal]").forEach(function (b) {
      b.addEventListener("click", function () { closeModal(b.getAttribute("data-close-modal")); });
    });
    document.addEventListener("keydown", function (e) {
      if (e.key !== "Escape") return;
      ["payModal", "doneModal"].forEach(function (id) { if ($(id).classList.contains("open")) closeModal(id); });
    });
    ["payModal", "doneModal"].forEach(function (id) {
      $(id).addEventListener("click", function (e) { if (e.target === $(id)) closeModal(id); });
    });
  });
})();
