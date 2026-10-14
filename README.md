# Cream Cafe — demo website

A pitch demo for **Cream Cafe**, SCF-29, Lower Ground Floor, BRS Nagar, Ludhiana.
It's plain HTML, CSS and JavaScript with no framework, no build step and no backend, so it deploys to Netlify as-is.

> ⚠️ **Demo mode is ON.** Every page has `noindex, nofollow`, `robots.txt` blocks all crawlers, Netlify sends an `X-Robots-Tag: noindex` header, and a demo banner credits Harnoor Singh. See [Going live](#going-live-remove-demo-mode).

## Structure

```
index.html        Home: hero, why-us, popular dishes, desserts, mocktails, offers, reviews, gallery, map, WhatsApp signup
menu.html         Full menu from data/menu.json, with category tabs, search and add/quantity buttons
order.html        Cart → order type → details → payment → bill → UPI QR → WhatsApp
parties.html      Party packages + enquiry form (Netlify Forms + WhatsApp)
contact.html      Table booking form (Netlify Forms + WhatsApp), hours, map
thank-you.html    Shown after any Netlify form submission
404.html          Not-found page
css/style.css     All styles (mobile-first). Colours/fonts are variables at the top.
js/config.js      ← ALL café details live here
js/pricing.js     Bill maths, order ID, UPI link, WhatsApp message (pure functions, unit-tested)
js/common.js      Shared: config binding, banner, nav, cart (localStorage), lightbox, forms
js/home.js / menu.js / order.js   Page scripts
data/menu.json    ← the menu
images/           Placeholder photos (swap these for real ones)
tests/            Unit tests for the pricing logic
robots.txt, sitemap.xml, netlify.toml
```

## Run it locally

`menu.json` is loaded with `fetch`, so open the site through a local server, not by double-clicking the file:

```bash
npx serve .          # or: python3 -m http.server 8000
node --test tests/pricing.test.js   # pricing/order unit tests
```

## Editing café details: `js/config.js`

Every value is commented. The main ones:

| Setting | What it controls |
|---|---|
| `phoneDisplay`, `phoneTel`, `whatsapp` | Call and WhatsApp buttons everywhere; orders are sent to `whatsapp` |
| `upiId`, `upiPayeeName` | UPI QR code and the "Pay with UPI App" button |
| `hours.open` / `hours.close` (+ `openDisplay`, `closeDisplay`) | Hours text and the live "Open now" badge (handles closing after midnight) |
| `address.*`, `address.entranceNote` | Address and the "Lower Ground Floor" note |
| `googleMapsUrl`, `directionsUrl`, `mapEmbedUrl`, `geo` | Rating badge link, Directions button, map embed, delivery-distance check |
| `directOrderDiscountPercent` | Direct-order discount (set `0` to hide the discount everywhere) |
| `delivery.radiusKm / fee / freeAbove / minOrder` | Delivery rules on the order page |
| `services.driveThrough / delivery` | Set `false` to hide that order type |
| `pureVeg` | `true` shows a "100% Vegetarian" badge in the footer |
| `showEstimatedPrices` | `false` (default) shows **₹XXX** for unconfirmed prices on the menu; `true` shows the estimates |
| `orderOnlineUrl` | Where the **Order Now** buttons (navbar + home hero) go — currently the café's Zomato page, opened in a new tab. Set `""` to use the site's own menu/ordering |
| `demo.enabled` | Turns the demo banner on or off |

The static HTML also has default values (phone, address and so on) so the pages still read correctly without JavaScript. The JSON-LD in `index.html`, `sitemap.xml` and the `og:`/canonical URLs are static too, so update those by hand if the domain, phone or hours change.

## Editing the menu: `data/menu.json`

```json
{
  "id": "veg-lasagna",            // unique, used in the cart (don't reuse ids)
  "category": "pasta",            // one of the category ids at the top of the file
  "name": "Veg Lasagna",
  "description": "…",
  "price": 329,                   // whole rupees
  "priceConfirmed": false,        // set true once the owner confirms the price
  "veg": true,                    // false shows the red non-veg mark
  "popular": true,                // "Popular" tag
  "sample": false,                // true = invented filler item; replace or delete
  "image": "images/lasagna.jpg"   // optional; shows a thumbnail on the menu
}
```

* **Prices are estimates.** Menu cards show `₹XXX` until `priceConfirmed` is `true`. The order page always calculates with the numbers and marks unconfirmed ones with `*`, and the WhatsApp message notes that prices are estimates.
* Items marked `"sample": true` are realistic placeholders. Replace them with the real menu.
* The home page "Popular dishes" list is the `POPULAR` array at the top of `js/home.js`. The three mocktail cards on the home page use the ids `mojito`, `watermelon-martini` and `daiquiri`.
* Menu sections follow the café's printed menu (Italian Pizza, Pasta, Continental Main Course & Starters, Grilled Sandwiches & Wraps, Salads, Sides, Ice Creams & Sundaes, Waffles, Shakes, Smoothies, Cold/Hot Coffee, Tea, Iced Tea, Mocktails, Soft Drinks). The menu photos received were thumbnails too small to read, so most items are typical `sample` fillers. Take clear photos of every page and replace them with the real items and prices.

## Replacing images

Keep the **same filename** and just overwrite the file. Every placeholder says "*filename* · replace with real photo".

| File | Where | Suggested size |
|---|---|---|
| `hero.jpg` | Home hero arch (portrait) | 900×1125 |
| `interior-1/2/3.jpg` | Gallery (currently cropped from the Google listing photo, which is low-res) | 1200×900 |
| `lasagna.jpg`, `pasta-red-sauce.jpg`, `farmhouse-pizza.jpg`, `falafel-pita.jpg`, `corn-sandwich.jpg`, `baked-veggies.jpg` | Popular dishes + menu thumbnails | 1200×900 |
| `ice-cream-1/2/3.jpg`, `shake.jpg` | Desserts section, menu | 1200×900 |
| `mojito.jpg`, `watermelon-martini.jpg`, `daiquiri.jpg` | Mocktail cards | 1200×900 |
| `gallery-1…5.jpg` | Gallery (real café photos, but low-res thumbnails, so swap for full-size originals) | 1200×900 |
| `party-birthday/date-night/group/kitty.jpg` | Parties page | 1200×900 |
| `og-image.jpg` | WhatsApp/Facebook link preview | 1200×630 |
| `favicon.svg`, `apple-touch-icon.png` | Browser icon | — |

Compress photos before uploading (for example with squoosh.app, quality about 75, under 200 KB each). Images are lazy-loaded.

## How ordering works

1. The customer adds items (cart saved in `localStorage`, with an in-memory fallback in private mode). The bag icon shows a count badge.
2. **Order type:** Pickup / Drive-through (car number required) / Delivery (address required; radius, fee, free-above and minimum come from config; there's an optional "check my distance" using the phone's location).
3. **Bill:** subtotal → direct-order discount → delivery fee (free when subtotal ≥ `freeAbove`) → total. Delivery is blocked below `minOrder`.
4. **Place Order** creates an ID like `CC-1014-0001` (MMDD + daily sequence per device).
   * **UPI:** a QR is generated in the browser (qrcodejs from cdnjs) containing `upi://pay?pa=…&am=<exact total>&tn=Order CC-…`. On phones a "Pay with UPI App" button opens GPay/PhonePe/Paytm. "I've paid" then opens WhatsApp.
   * **Cash / pay at counter:** opens WhatsApp straight away.
5. WhatsApp opens to `918908888875` with a formatted order (ID, items, qty, prices, discount, delivery, total, type, customer details, payment). A confirmation screen follows.

> There is no payment verification (no backend). The café should check UPI payments arrived before preparing an order. Order numbers are per device, not global.

## Forms (Netlify Forms)

`offers-signup` (home), `party-enquiry` (parties) and `table-booking` (contact) are detected automatically by Netlify on deploy. Submissions appear under **Site → Forms**; turn on email notifications there. The party and booking forms also have a "send on WhatsApp" button. Forms only submit on Netlify, not on a local server.

## Deploy on Netlify

1. Push this repo to GitHub, then in Netlify choose **Add new site → Import from Git** and pick the repo. Leave the build command empty and set the publish directory to `.` (already set in `netlify.toml`).
   *Or* drag the project folder onto <https://app.netlify.com/drop>.
2. In **Site configuration → Forms**, make sure form detection is enabled, then redeploy once.
3. (Later) add the custom domain and replace `creamcafe.netlify.app` in: `js/config.js` (`siteUrl`), the canonical/`og:` tags in each HTML page, the JSON-LD in `index.html`, `sitemap.xml` and `robots.txt`.

## Going live (remove demo mode)

When the owner approves:

1. **Every HTML page:** delete `<meta name="robots" content="noindex, nofollow">` (marked with a `DEMO:` comment).
2. **`robots.txt`:** replace with `User-agent: *` / `Allow: /` / `Sitemap: https://<domain>/sitemap.xml`.
3. **`netlify.toml`:** delete the `X-Robots-Tag` line.
4. **Demo banner:** set `demo.enabled: false` in `js/config.js` (or delete the `DEMO BANNER` block in each page). Keep the footer credit "Website by Harnoor Singh".
5. Remove the "replace with real photo" placeholders (swap in real images), set `priceConfirmed: true` on the real prices, and remove `sample` items.
6. Submit `sitemap.xml` in Google Search Console and link the site from the Google Business Profile.

SEO is already in place: a unique title and description per page targeting "Cream Cafe BRS Nagar", "best cafe in BRS Nagar Ludhiana", "late night cafe Ludhiana" and "ice cream cafe Ludhiana"; `CafeOrCoffeeShop` JSON-LD (address, phone, hours, cuisine, menu URL, rating); Open Graph tags for WhatsApp previews; and `sitemap.xml`.

## ✅ [CONFIRM] with the owner

**Business details**
- [ ] Opening time (placeholder **12:00 PM**; closing 1:00 AM is from Google). Update `config.js` and the JSON-LD
- [ ] UPI ID (placeholder `cafe@upi`) and the payee name exactly as registered
- [ ] Exact Google Maps listing link (Share → copy link) and exact map pin (`geo` lat/lng, also in the JSON-LD)
- [ ] Entrance directions for the Lower Ground Floor (`address.entranceNote`)
- [ ] Is the café **pure vegetarian**? (`pureVeg`; all items are currently marked veg)
- [ ] Instagram handle / email, if any
- [ ] Final domain name

**Menu & prices**
- [ ] Clear, full-resolution photos of every menu page (items + prices), since the ones received were too small to read
- [ ] Food photos used: is the green pasta **pesto pasta**? Is the pink martini in the two-drink photo a **daiquiri**?
- [ ] Full real menu with prices (all current prices are estimates shown as ₹XXX)
- [ ] Mojito, Watermelon Martini and Daiquiri are **mocktails** (alcohol-free)? Currently labelled "Mocktails"
- [ ] The current "new" ice cream flavours, to name them on the site
- [ ] Which dishes to feature as "Popular"

**Ordering**
- [ ] **Order Now → Zomato** (`orderOnlineUrl`): confirm online ordering is active on Cream Cafe's Zomato listing, or swap in a Swiggy link if they have one
- [ ] Do they want online orders via WhatsApp to 089088 88875?
- [ ] Direct-order discount: **10%**?
- [ ] Delivery radius **4 km**, fee **₹40**, free above **₹499**, minimum **₹199**?
- [ ] Is drive-through pickup handled as described ("we bring it to your car")?

**Offers & parties**
- [ ] Offers: "10% off direct orders", "Couple's Combo" (contents + price), "Late-night cravings"
- [ ] Party packages (Birthday, Date Night/Anniversary, Group, Kitty): inclusions, guest numbers and prices (placeholders ₹XXX)
- [ ] Do they accept table bookings, and for which time slots?

**Content permissions**
- [ ] OK to quote the 3 Google review snippets on the home page (marked in a code comment)
- [ ] OK to show "4.8 ★ · 63 reviews" (update the count in `config.js` and the JSON-LD as it grows)
- [ ] Permission to photograph the café and food for the site (and confirm use of the Google-listing interior photo until then)
