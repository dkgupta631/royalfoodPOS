# Royalfood POS

A restaurant point-of-sale web app: sign-in, shifts, table POS, 3D floor view, goods, tables and zones, inventory, members, activity log, queue calling, reservations, receipts and QR table ordering.

It is a static site (plain HTML, CSS and JavaScript, no build step). **Google Sheets is the database**, reached through a small Google Apps Script web app. Hosting is **GitHub Pages**.

## Try it 

Open `index.html` through any web server (for example `python3 -m http.server` and then http://localhost:8000).
Until a Google Sheet is connected the app runs in **demo mode**: sign in with `admin` / `admin123`, and data stays in that browser only.

## 1. Connect the Google Sheet

1. Open your sheet (`deltafood_POS_DB`) → **Extensions → Apps Script**.
2. Delete the sample code and paste in everything from [`apps-script/Code.gs`](apps-script/Code.gs).
3. Change `REGISTER_CODE` near the top to your own secret. New users need it to register.
4. Choose the `setup` function in the toolbar and press **Run**. Approve the permission prompt. This creates the tabs (Users, Zones, Tables, Categories, Products, Bills, Members, Shifts, Logs, Queue, Reservations) and the first user `admin` / `admin123`.
5. **Deploy → New deployment → Web app**. Set *Execute as: Me* and *Who has access: Anyone*. Press **Deploy** and copy the **Web app URL** (it ends in `/exec`).
6. Paste that URL into [`assets/js/config.js`](assets/js/config.js):

   ```js
   API_URL: 'https://script.google.com/macros/s/XXXX/exec',
   ```

7. Commit and push. On first sign-in the app fills the empty sheet with starter zones, tables and dishes.

After you edit `Code.gs` later, publish it with **Deploy → Manage deployments → Edit → Version: New version**.

**Replace the default admin.** Register your own account from the sign-in page → Register (it asks for your invite code), then delete the `admin` row in the **Users** tab. To make yourself owner, set the `role` cell of your row to `owner`.

## Registration

`register.html` walks a new user through choosing a service, a package (Buffet, A la carte, Full Options), add-on functions with monthly or yearly billing, and a sign-up form. It then creates the account with a 7-day trial and saves the package, price, table count, phone, email and address in the **Users** tab. There is no online payment and no SMS code step; the invite code is what stops strangers from registering.

## Goods

The Goods page lists every dish with its picture, code, name, price and stock. **Extra** and **Edit** open one popup with three tabs:

- **Detail**: picture (paste an image link or upload a photo), code, group, name in two languages, explanation, price, Buffet, price by weight, on sale.
- **Inventory**: turn stock tracking on or off and set the quantity.
- **Extra**: options such as "Extra rice +10". In POS, staff pick them when adding the dish and the option price is added to the line.

The product columns `code`, `nameEn`, `image`, `desc`, `descEn`, `buffet`, `byWeight` and `extras` were added to the **Products** tab. Paste the current `apps-script/Code.gs` into Apps Script and deploy a **New version**, otherwise the sheet drops these fields. Starter-menu photos are in `assets/img/foods` (credits in `CREDITS.md` there).

## Row ids

Every tab uses plain number ids: 1, 2, 3 … Each device takes its ids from a small block of numbers handed out by the script, so two devices never create the same id. With more than one device the numbers can skip (for example 1–10 on one device, 11–20 on another). On a single device the numbers run 1, 2, 3 … without gaps.

To convert a sheet that still has old ids such as `P1` or `Bmwh…`: let every device finish syncing, then in Apps Script choose the `renumberIds` function and press **Run** once, and reload the app on every device. Table QR codes contain the table id, so print them again afterwards.

## 2. Deploy with GitHub Pages

1. Push this folder to your repository's `main` branch.
2. On GitHub: **Settings → Pages → Build and deployment → Source: Deploy from a branch → `main` / `(root)` → Save**.
3. After a minute the site is live at `https://<user>.github.io/<repo>/`.

## Settings

All in [`assets/js/config.js`](assets/js/config.js): brand name, currency, tax percent, member points rate and the support contacts shown on the Home page.

**Language.** Pages open in `DEFAULT_LANG` (Thai). On a visitor's first page the site looks up the country of their IP address (api.country.is, with Cloudflare's trace page as a fallback) and switches to the language `LANG_BY_COUNTRY` gives for it; countries not in that list keep the default. A language the visitor picks from the menu is remembered and always wins. Set `LANG_BY_IP: false` to turn the lookup off.

## How data is stored

| Tab | Holds |
| --- | --- |
| Users | Accounts. Passwords are stored as SHA-256 hashes, never as plain text |
| Zones, Tables | Floor layout |
| Categories, Products | Menu, prices and stock |
| Bills | One row per bill; the ordered dishes are a JSON list in the `items` column |
| Members | Customers and points |
| Shifts | Cash drawer open and close records |
| Logs | Who did what and when |
| Queue, Reservations | Walk-in queue and bookings |

The app keeps a copy of the data in the browser, so screens respond instantly. Changes are sent to the sheet in the background and retried if the connection drops (the red sync icon in the top bar shows the state). Other devices pick up changes about every 25 seconds.

## Things to know

- The Apps Script URL is public by design (the browser must reach it). Reading and writing data needs a sign-in token that lasts 6 hours; the QR menu and QR ordering endpoints are open so guests can order without an account.
- Editing rows by hand in the sheet is fine. Keep the header row and the `id` column unchanged.
- Google Sheets suits a single restaurant. Each save takes about a second, and very heavy traffic will hit Apps Script quotas.
- Photos on the sign-in page are loaded from Unsplash; icons from Lucide; QR codes from qrcodejs; flag images from flag-icons (MIT), stored in `assets/img/flags/`.

## Files

```
index.html            sign-in
register.html         registration: service → package → options → form → success
app.html              the POS application
menu.html             guest menu opened by a table's QR code
assets/css/style.css  all styles, animations, dark mode, mobile layout
assets/js/config.js   settings
assets/js/db.js       data layer (Google Sheets or demo storage)
assets/js/i18n.js     logo and translations (ไทย, ខ្មែរ, ລາວ, 中文, EN)
assets/js/login.js    sign-in page
assets/js/register.js registration flow; package prices and photos are at the top
assets/js/register-i18n.js  registration texts in the five languages
assets/css/register.css  registration styles
assets/js/app.js      all POS screens
apps-script/Code.gs   Google Sheets backend
```
