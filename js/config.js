/*
 * ============================================================
 *  CREAM CAFE — SITE CONFIG
 *  Edit this one file to change café details across the site.
 *  Items marked [CONFIRM] must be checked with the owner.
 * ============================================================
 */
window.CAFE_CONFIG = {
  name: "Cream Cafe",
  tagline: "Your cosy corner in BRS Nagar",

  // ---- Contact ----
  phoneDisplay: "089088 88875",
  phoneTel: "+918908888875",          // used for tel: links
  whatsapp: "918908888875",           // country code + number, no "+" or spaces
  email: "",                          // [CONFIRM] optional — leave "" to hide

  // ---- Payments ----
  upiId: "cafe@upi",                  // [CONFIRM] real UPI ID (VPA)
  upiPayeeName: "Cream Cafe",         // [CONFIRM] name exactly as registered on the UPI ID

  // ---- Hours ----
  // 24h "HH:MM". A close time earlier than the open time means "past midnight".
  hours: {
    open: "12:00",                    // [CONFIRM] opening time (placeholder)
    close: "01:00",                   // closes 1:00 AM (from Google listing)
    openDisplay: "12:00 PM",          // [CONFIRM]
    closeDisplay: "1:00 AM",
    days: "Open daily"
  },

  // ---- Address & map ----
  address: {
    line1: "SCF-29, Lower Ground Floor",
    line2: "Bhai Randhir Singh Nagar (BRS Nagar)",
    city: "Ludhiana",
    state: "Punjab",
    pincode: "141012",
    country: "IN",
    entranceNote: "We're on the Lower Ground Floor — take the stairs down from the SCF-29 frontage."  // [CONFIRM] exact directions
  },
  // Approximate BRS Nagar coordinates — [CONFIRM] exact pin from the Google listing
  geo: { lat: 30.8916, lng: 75.8232 },
  googleMapsUrl: "https://www.google.com/maps/search/?api=1&query=Cream+Cafe+SCF-29+BRS+Nagar+Ludhiana",   // [CONFIRM] paste the exact listing "Share" link
  directionsUrl: "https://www.google.com/maps/dir/?api=1&destination=Cream+Cafe+SCF-29+BRS+Nagar+Ludhiana",
  mapEmbedUrl: "https://www.google.com/maps?q=Cream+Cafe,+SCF-29,+BRS+Nagar,+Ludhiana&output=embed",
  googleRating: { score: 4.8, count: 63 },

  // ---- Services ----
  services: { dineIn: true, driveThrough: true, delivery: true },
  pureVeg: false,                     // [CONFIRM] set true to show a "100% Vegetarian" badge

  // ---- Ordering ----
  currency: "₹",
  directOrderDiscountPercent: 10,     // [CONFIRM] offer for ordering via the website; 0 to disable
  delivery: {
    radiusKm: 4,                      // [CONFIRM]
    fee: 40,                          // [CONFIRM]
    freeAbove: 499,                   // [CONFIRM] free delivery when item subtotal >= this
    minOrder: 199                     // [CONFIRM] minimum item subtotal for delivery
  },
  orderIdPrefix: "CC",                // Order IDs look like CC-1014-0001 (CC-MMDD-sequence)

  // ---- Menu prices ----
  // false = show "₹XXX" for prices not yet confirmed (menu.json "priceConfirmed": false).
  // true  = show the estimated prices everywhere (handy while pitching the order flow).
  showEstimatedPrices: false,

  // ---- Social ----
  instagram: "",                      // [CONFIRM] e.g. "https://instagram.com/creamcafe" — "" hides it

  // ---- Demo banner (remove when the owner approves) ----
  demo: {
    enabled: true,
    text: "Demo website prepared for Cream Cafe by Harnoor Singh",
    url: "https://harnoor-mu.vercel.app"
  },
  credit: { text: "Website by Harnoor Singh", url: "https://harnoor-mu.vercel.app" },

  siteUrl: "https://creamcafe.netlify.app"   // [CONFIRM] final domain (also update sitemap.xml, robots.txt, JSON-LD, og:url)
};
