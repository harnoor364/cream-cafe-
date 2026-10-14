// Run with: node --test tests/
const test = require("node:test");
const assert = require("node:assert/strict");
const P = require("../js/pricing.js");

const config = {
  name: "Cream Cafe", currency: "₹", directOrderDiscountPercent: 10,
  delivery: { radiusKm: 4, fee: 40, freeAbove: 499, minOrder: 199 }
};
const lines = (...pairs) => pairs.map(([price, qty], i) => ({ id: "i" + i, name: "Item " + i, price, qty }));

test("pickup: subtotal, 10% discount, no delivery fee", () => {
  const b = P.computeBill(lines([329, 2], [159, 1]), "pickup", config);
  assert.equal(b.subtotal, 817);
  assert.equal(b.discount, 82); // 81.7 rounded
  assert.equal(b.deliveryFee, 0);
  assert.equal(b.total, 735);
  assert.equal(b.itemCount, 3);
  assert.equal(b.canOrder, true);
});

test("drive-through behaves like pickup for pricing", () => {
  const b = P.computeBill(lines([179, 1]), "drive", config);
  assert.deepEqual([b.subtotal, b.discount, b.deliveryFee, b.total], [179, 18, 0, 161]);
});

test("delivery below free threshold pays the fee", () => {
  const b = P.computeBill(lines([269, 1]), "delivery", config);
  assert.equal(b.deliveryFee, 40);
  assert.equal(b.total, 269 - 27 + 40);
  assert.equal(b.freeDeliveryGap, 230);
  assert.equal(b.belowMinimum, false);
});

test("delivery at exactly the free threshold is free", () => {
  const b = P.computeBill(lines([499, 1]), "delivery", config);
  assert.equal(b.deliveryFee, 0);
  assert.equal(b.freeDeliveryGap, 0);
  assert.equal(b.total, 499 - 50);
});

test("delivery below minimum order is blocked", () => {
  const b = P.computeBill(lines([179, 1]), "delivery", config);
  assert.equal(b.belowMinimum, true);
  assert.equal(b.minimumGap, 20);
  assert.equal(b.canOrder, false);
  // ...but the same cart is fine for pickup
  assert.equal(P.computeBill(lines([179, 1]), "pickup", config).canOrder, true);
});

test("delivery at exactly the minimum is allowed", () => {
  const b = P.computeBill(lines([199, 1]), "delivery", config);
  assert.equal(b.belowMinimum, false);
  assert.equal(b.total, 199 - 20 + 40);
});

test("discount can be disabled", () => {
  const b = P.computeBill(lines([300, 1]), "pickup", { ...config, directOrderDiscountPercent: 0 });
  assert.equal(b.discount, 0);
  assert.equal(b.total, 300);
});

test("empty cart cannot be ordered and has no delivery fee", () => {
  const b = P.computeBill([], "delivery", config);
  assert.equal(b.total, 0);
  assert.equal(b.deliveryFee, 0);
  assert.equal(b.canOrder, false);
});

test("order id format CC-MMDD-0001", () => {
  assert.equal(P.makeOrderId("CC", new Date(2026, 9, 14), 1), "CC-1014-0001");
  assert.equal(P.makeOrderId("CC", new Date(2026, 0, 5), 23), "CC-0105-0023");
});

test("UPI link carries exact amount and order note", () => {
  const url = P.upiLink({ upiId: "cafe@upi", payeeName: "Cream Cafe", amount: 735, note: "Order CC-1014-0001" });
  assert.equal(url, "upi://pay?pa=cafe%40upi&pn=Cream%20Cafe&am=735.00&cu=INR&tn=Order%20CC-1014-0001");
});

test("WhatsApp message includes items, totals, customer and payment", () => {
  const ls = [{ id: "a", name: "Veg Lasagna", price: 329, qty: 2 }];
  const order = {
    id: "CC-1014-0001", type: "delivery", lines: ls, bill: P.computeBill(ls, "delivery", config),
    customer: { name: "Aman", phone: "98765 43210", address: "12 BRS Nagar", landmark: "Near park", notes: "Extra cheese" },
    paymentLabel: "Cash on delivery", hasEstimatedPrices: false
  };
  const msg = P.buildWhatsAppMessage(order, config);
  for (const s of ["CC-1014-0001", "Type: Delivery", "2 x Veg Lasagna — ₹658", "Subtotal: ₹658", "discount (10%): -₹66",
    "Delivery fee: FREE", "*Total: ₹592*", "Name: Aman", "Address: 12 BRS Nagar", "Landmark: Near park", "Payment: Cash on delivery", "Instructions: Extra cheese"]) {
    assert.ok(msg.includes(s), "missing: " + s + "\n" + msg);
  }
  assert.ok(!msg.includes("Car:"));
  assert.ok(P.waLink("918908888875", msg).startsWith("https://wa.me/918908888875?text=*New%20order"));
});

test("opening hours past midnight", () => {
  const h = { open: "12:00", close: "01:00" };
  const at = (H, M) => new Date(2026, 9, 14, H, M);
  assert.equal(P.isOpenAt(h, at(11, 59)), false);
  assert.equal(P.isOpenAt(h, at(12, 0)), true);
  assert.equal(P.isOpenAt(h, at(23, 30)), true);
  assert.equal(P.isOpenAt(h, at(0, 45)), true);
  assert.equal(P.isOpenAt(h, at(1, 0)), false);
  assert.equal(P.isOpenAt(h, at(3, 0)), false);
});

test("distance check", () => {
  const km = P.distanceKm({ lat: 30.8916, lng: 75.8232 }, { lat: 30.9116, lng: 75.8232 });
  assert.ok(km > 2.1 && km < 2.3, String(km));
});
