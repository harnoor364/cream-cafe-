/*
 * Bill calculation — pure functions, no DOM. Used by the order page and by tests/pricing.test.js.
 *
 * Rules (all amounts in whole rupees):
 *  - subtotal  = sum(price × qty)
 *  - discount  = round(subtotal × directOrderDiscountPercent / 100)
 *  - delivery  = 0 unless order type is "delivery"; then 0 if subtotal >= freeAbove, otherwise the fee
 *  - delivery orders need subtotal >= minOrder
 *  - total     = subtotal − discount + delivery
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.CCPricing = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var ORDER_TYPES = {
    pickup: "Pickup",
    drive: "Drive-through pickup",
    delivery: "Delivery"
  };

  function toInt(n) {
    n = Number(n);
    return isFinite(n) ? Math.round(n) : 0;
  }

  /**
   * @param {Array<{price:number, qty:number}>} lines
   * @param {"pickup"|"drive"|"delivery"} orderType
   * @param {object} config  window.CAFE_CONFIG
   */
  function computeBill(lines, orderType, config) {
    var d = (config && config.delivery) || {};
    var pct = Math.max(0, Number((config && config.directOrderDiscountPercent) || 0));
    var subtotal = 0, count = 0;
    (lines || []).forEach(function (l) {
      var q = Math.max(0, toInt(l.qty));
      subtotal += toInt(l.price) * q;
      count += q;
    });
    var discount = Math.round(subtotal * pct / 100);
    var isDelivery = orderType === "delivery";
    var freeAbove = toInt(d.freeAbove);
    var minOrder = toInt(d.minOrder);
    var deliveryFee = 0;
    if (isDelivery && subtotal > 0) deliveryFee = (freeAbove > 0 && subtotal >= freeAbove) ? 0 : toInt(d.fee);
    var belowMinimum = isDelivery && subtotal < minOrder;
    return {
      itemCount: count,
      subtotal: subtotal,
      discountPercent: pct,
      discount: discount,
      deliveryFee: deliveryFee,
      isDelivery: isDelivery,
      freeDeliveryGap: isDelivery && freeAbove > 0 && subtotal < freeAbove ? freeAbove - subtotal : 0,
      belowMinimum: belowMinimum,
      minimumGap: belowMinimum ? minOrder - subtotal : 0,
      total: Math.max(0, subtotal - discount + deliveryFee),
      canOrder: count > 0 && !belowMinimum
    };
  }

  function formatINR(n, symbol) {
    return (symbol || "₹") + toInt(n).toLocaleString("en-IN");
  }

  /** Order ID like CC-1014-0001 (prefix-MMDD-daily sequence). */
  function makeOrderId(prefix, date, seq) {
    var mm = String(date.getMonth() + 1).padStart(2, "0");
    var dd = String(date.getDate()).padStart(2, "0");
    return (prefix || "CC") + "-" + mm + dd + "-" + String(seq).padStart(4, "0");
  }

  function upiLink(opts) {
    var p = [
      "pa=" + encodeURIComponent(opts.upiId),
      "pn=" + encodeURIComponent(opts.payeeName),
      "am=" + Number(opts.amount).toFixed(2),
      "cu=INR",
      "tn=" + encodeURIComponent(opts.note || "")
    ];
    return "upi://pay?" + p.join("&");
  }

  /** Plain-text order for WhatsApp (uses *bold* WhatsApp formatting). */
  function buildWhatsAppMessage(order, config) {
    var cur = config.currency || "₹";
    var f = function (n) { return formatINR(n, cur); };
    var b = order.bill;
    var c = order.customer || {};
    var hr = "------------------------------";
    var out = [];
    out.push("*New order — " + config.name + "*");
    out.push("Order ID: *" + order.id + "*");
    out.push("Type: " + ORDER_TYPES[order.type]);
    out.push(hr);
    order.lines.forEach(function (l) {
      out.push(l.qty + " x " + l.name + " — " + f(l.price * l.qty));
    });
    out.push(hr);
    out.push("Subtotal: " + f(b.subtotal));
    if (b.discount > 0) out.push("Direct-order discount (" + b.discountPercent + "%): -" + f(b.discount));
    if (b.isDelivery) out.push("Delivery fee: " + (b.deliveryFee === 0 ? "FREE" : f(b.deliveryFee)));
    out.push("*Total: " + f(b.total) + "*");
    out.push(hr);
    out.push("Name: " + c.name);
    out.push("Phone: " + c.phone);
    if (order.type === "delivery") {
      out.push("Address: " + c.address);
      if (c.landmark) out.push("Landmark: " + c.landmark);
    }
    if (order.type === "drive") out.push("Car: " + c.car);
    out.push("Payment: " + order.paymentLabel);
    if (c.notes) out.push("Instructions: " + c.notes);
    if (order.hasEstimatedPrices) out.push("_(Prices shown are website estimates — please confirm final amount.)_");
    return out.join("\n");
  }

  function waLink(number, text) {
    return "https://wa.me/" + number + "?text=" + encodeURIComponent(text);
  }

  /** Straight-line distance in km between two {lat,lng}. */
  function distanceKm(a, b) {
    var R = 6371, rad = Math.PI / 180;
    var dLat = (b.lat - a.lat) * rad, dLng = (b.lng - a.lng) * rad;
    var h = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return 2 * R * Math.asin(Math.sqrt(h));
  }

  /** Is the café open at `date`? Handles closing after midnight (e.g. 12:00 → 01:00). */
  function isOpenAt(hours, date) {
    var toMin = function (s) { var p = String(s).split(":"); return Number(p[0]) * 60 + Number(p[1] || 0); };
    var o = toMin(hours.open), c = toMin(hours.close), now = date.getHours() * 60 + date.getMinutes();
    if (o === c) return true;
    return o < c ? (now >= o && now < c) : (now >= o || now < c);
  }

  return {
    ORDER_TYPES: ORDER_TYPES,
    computeBill: computeBill,
    formatINR: formatINR,
    makeOrderId: makeOrderId,
    upiLink: upiLink,
    buildWhatsAppMessage: buildWhatsAppMessage,
    waLink: waLink,
    distanceKm: distanceKm,
    isOpenAt: isOpenAt
  };
});
