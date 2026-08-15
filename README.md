# 🔊 Sound System & DJ Booking Portal
## साउंड सिस्टम & DJ बुकिंग पोर्टल

A full-stack web application for sound/DJ equipment rental businesses to manage customer bookings, sound rental setup, date scheduling, and advance payment receipts — fully bilingual in **English and Hindi (हिंदी)**.

एक फुल-स्टैक वेब एप्लिकेशन जो साउंड/DJ इक्विपमेंट रेंटल बिज़नेस के लिए ग्राहक बुकिंग, साउंड रेंटल सेटअप, डेट शेड्यूलिंग और एडवांस पेमेंट रसीद प्रबंधित करता है — पूरी तरह **अंग्रेज़ी और हिंदी** दोनों भाषाओं में।

---

## 🧱 Tech Stack

| Layer      | Technology                     |
|------------|---------------------------------|
| Frontend   | React.js (React Router, i18next for EN/HI) |
| Backend    | Node.js + Express.js            |
| Database   | PostgreSQL                      |
| PDF        | pdfkit (GST / Non-GST invoices) |
| QR Codes   | qrcode (UPI payment QR)         |

---

## ✨ Features (as requested)

0. **🔐 Superadmin & Admin Roles / सुपरएडमिन व एडमिन रोल**
   - **Superadmin** logs into `/superadmin` and can **create admin (vendor) accounts**, **suspend / reactivate / deactivate** any admin account, and see **total platform revenue** plus a per-admin revenue breakdown.
   - **Admin** (a sound/DJ rental business) logs into `/admin` and gets their **own dashboard**: manage their own sound equipment & packages (add / edit / delete-as-inactive / view / filter, with an optional photo for each item), track bookings, mark deliveries, collect balance payments and download invoices — all scoped only to their own data.
   - A suspended/inactive admin cannot log in, and their equipment/packages automatically stop showing up to customers.

0.1 **🧾 Admin-defined Custom Booking Fields / कस्टम बुकिंग फील्ड्स**
   - From the **Booking Fields** tab, an admin can **add** whatever extra information they need from a customer (e.g. "Guest Count", "Venue/Hall Name", "Reference By") — choosing a field type (short text, number, long text, date, dropdown, or yes/no), marking it required or optional, and can **remove** a field at any time.
   - These exact fields automatically appear on the **customer's booking form** for that vendor's packages, and the values the customer fills in are saved with the booking and visible to the admin under "View Details" on the bookings table.

1. **साउंड सेट & इवेंट पैकेज सिलेक्शन / Sound Set & Event Package Selection**
   Customers pick their event type (Wedding, Birthday, Bhagwat Katha, Jagran, Orchestra, DJ Night) and choose a matching sound package (e.g. 4 Top + 2 Bass + DJ Setup + Mic) — pulled live from all active vendors.

2. **इवेंट डेट Availability चेकर / Event Date Availability Checker**
   Customers select an event date and the system checks in real time whether each sound set is free or already booked on that date (with race-condition safe booking).

3. **एडवांस पेमेंट & ऑनलाइन बुकिंग पर्ची / Advance Payment & Online Booking Slip**
   Customers pay 20% or 50% advance token money via UPI / QR Code / PhonePe / Google Pay (a scannable UPI QR is generated in-app). Both the customer and the sound owner receive a WhatsApp receipt instantly (mock notifier included — plug in Twilio/Meta WhatsApp Business API for production). The booking form is a single straightforward flow — no numbered "step-by-step" wizard.

4. **बैलेंस पेमेंट & डिलीवरी ट्रैकिंग / Balance Payment & Delivery Tracking**
   On the event day, the owning admin marks equipment as delivered, records the remaining balance payment, and the system auto-generates a final **GST or Non-GST PDF invoice**.

5. **एडमिन कंट्रोल डैशबोर्ड / Admin Control Dashboard**
   Each admin sees, from their own dashboard: which of their sound sets went where on which date, how much advance has come in, how much balance is pending, and can track/cancel/complete bookings — plus a day-wise "Sound Set Location Tracker".

The entire customer-facing and admin/superadmin UI supports a **one-click language toggle between Hindi and English**.

6. **🏠 Homepage Layout**
   - An **animated auto-rotating hero slider** at the top (Wedding / DJ Night / Jagran / Orchestra), each slide with its own call-to-action.
   - An **"Events We Power" showcase** section in the body with representative photos (placeholder images from picsum.photos — swap in your own real event photos before going live) that deep-link straight into the booking page for that event type.
   - A floating **"Book Now" button** fixed to the bottom-right corner on every customer-facing page.
   - A rich **footer** with Quick Links, About Us, Contact Us, Privacy Policy, and Admin/Superadmin Login — the old top-nav "Book Now"/"Admin" buttons have been moved out of the header into the floating button and footer respectively.

---

## 📁 Project Structure

```
sound-dj-booking-portal/
├── backend/                   # Node.js + Express + PostgreSQL API
│   ├── src/
│   │   ├── routes/            # auth, superadmin, adminInventory, packages, soundSets, availability, bookings, payments, admin
│   │   ├── middleware/        # auth.js (JWT + role guard), upload.js (multer image uploads)
│   │   ├── utils/              # invoice PDF generator, WhatsApp notifier, ID generators, password hashing
│   │   ├── scripts/initDb.js  # runs schema.sql + seeds superadmin/admin accounts & sample data
│   │   ├── schema.sql         # PostgreSQL schema (users, sound_sets, packages, bookings, payments, invoices)
│   │   ├── db.js               # PostgreSQL connection pool
│   │   └── server.js           # Express app entry point
│   ├── uploads/                # equipment/package photos (created automatically)
│   ├── invoices/                # generated invoice PDFs (created automatically)
│   ├── package.json
│   └── .env.example
├── frontend/                  # React.js SPA
│   ├── src/
│   │   ├── components/        # PackageSelector, AvailabilityChecker, BookingForm, AdminDashboard,
│   │   │                        EquipmentManager, PackageManager, SuperadminDashboard, ProtectedRoute, etc.
│   │   ├── context/AuthContext.jsx  # login state, JWT storage
│   │   ├── pages/              # HomePage, BookingPage, LoginPage, AdminPage, SuperadminPage
│   │   ├── i18n/                # en.json, hi.json translation files + i18next config
│   │   ├── services/api.js     # Axios wrapper for backend API calls (auto-attaches JWT)
│   │   ├── styles/App.css
│   │   ├── App.jsx
│   │   └── index.js
│   ├── package.json
│   └── .env.example
└── README.md                  # this file
```

---

## 🚀 Getting Started / शुरुआत कैसे करें

### 1. Prerequisites / आवश्यकताएं
- Node.js v18+
- PostgreSQL v13+ (running locally or remotely)

### 2. Database Setup / डेटाबेस सेटअप

Create a database:
```bash
createdb sound_dj_booking
```

### 3. Backend Setup

```bash
cd backend
cp .env.example .env
# Edit .env with your PostgreSQL credentials (PGHOST, PGUSER, PGPASSWORD, PGDATABASE, etc.)

npm install
npm run db:init     # creates tables & seeds sample packages/sound sets
npm run dev          # starts API server on http://localhost:5000
```

Health check: `GET http://localhost:5000/api/health`

`npm run db:init` prints seed login credentials in the terminal. By default:

| Role       | Email                     | Password    |
|------------|---------------------------|-------------|
| Superadmin | `superadmin@sounddj.com`  | `Super@123` |
| Admin      | `admin@sounddj.com`       | `Admin@123` |

(Change these via `SEED_SUPERADMIN_EMAIL` / `SEED_SUPERADMIN_PASSWORD` / `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` in `.env` before running `db:init`.)

### 4. Frontend Setup

```bash
cd frontend
cp .env.example .env
# By default REACT_APP_API_BASE_URL=http://localhost:5000/api

npm install
npm start            # starts React app on http://localhost:3000
```

Open **http://localhost:3000** in your browser. Use the language toggle (हिंदी / English) in the top navigation bar at any time.

---

## 🔌 Key API Endpoints

### Public (customer-facing)
| Method | Endpoint                                  | Purpose |
|--------|--------------------------------------------|---------|
| GET    | `/api/packages?event_type=wedding`         | List active packages (from active vendors) for an event type |
| GET    | `/api/sound-sets`                          | List all active sound sets (from active vendors) |
| GET    | `/api/availability?date=YYYY-MM-DD`        | Check which sound sets are free/booked on a date |
| POST   | `/api/bookings`                            | Create booking + record advance payment + send WhatsApp receipt |
| POST   | `/api/payments/generate-qr`                | Generate a scannable UPI QR code for an amount |
| GET    | `/api/booking-fields/by-package/:packageId`| Get the vendor's active custom fields to render on the booking form |

### Auth
| Method | Endpoint          | Purpose |
|--------|-------------------|---------|
| POST   | `/api/auth/login` | Login for admin/superadmin, returns a JWT |
| GET    | `/api/auth/me`    | Get the currently logged-in user |

### Admin (JWT required, role = admin) — scoped to the logged-in admin's own data
| Method | Endpoint                                  | Purpose |
|--------|--------------------------------------------|---------|
| GET    | `/api/bookings`                            | List own bookings (filter by status/date/phone) |
| GET    | `/api/bookings/:id`                        | Get single booking + payment history |
| PATCH  | `/api/bookings/:id/delivery`               | Mark equipment delivered |
| POST   | `/api/bookings/:id/balance-payment`        | Record balance payment + auto-generate GST/Non-GST invoice PDF |
| PATCH  | `/api/bookings/:id/cancel`                 | Cancel a booking |
| GET    | `/api/admin/summary`                       | Own dashboard totals: revenue, advance received, balance pending |
| GET    | `/api/admin/sound-set-tracker?date=...`    | Which of the admin's sound sets went where on a date |
| GET/POST/PUT | `/api/admin/equipment`, `/api/admin/equipment/:id` | List / add / edit own sound equipment (multipart, optional `image` field) |
| PATCH  | `/api/admin/equipment/:id/status`          | Soft delete/restore equipment (`active` / `inactive`) |
| GET/POST/PUT | `/api/admin/packages`, `/api/admin/packages/:id`   | List / add / edit own event packages (multipart, optional `image` field) |
| PATCH  | `/api/admin/packages/:id/status`           | Soft delete/restore a package (`active` / `inactive`) |
| GET/POST/PUT/DELETE | `/api/booking-fields`, `/api/booking-fields/:id` | List / add / edit / remove this admin's custom booking fields |
| PATCH  | `/api/booking-fields/:id/status`           | Enable/disable a custom field without deleting it |

### Superadmin (JWT required, role = superadmin)
| Method | Endpoint                                  | Purpose |
|--------|--------------------------------------------|---------|
| POST   | `/api/superadmin/admins`                   | Create a new admin (vendor) account |
| GET    | `/api/superadmin/admins?status=&search=`   | List all admins with status/search filters + their booking totals |
| PUT    | `/api/superadmin/admins/:id`               | Edit an admin's name/email/phone |
| PATCH  | `/api/superadmin/admins/:id/status`        | Set status: `active`, `suspended`, or `inactive` |
| GET    | `/api/superadmin/revenue`                  | Platform-wide revenue totals + per-admin breakdown |

Generated invoice PDFs are served statically at `/invoices/<invoice_number>.pdf`, and uploaded equipment/package photos at `/uploads/<filename>`.

---

## 💬 WhatsApp Receipts

`backend/src/utils/notify.js` ships in **mock mode** by default (logs the receipt to the console) so the whole booking flow can be demoed without any paid API keys. To go live, set `WHATSAPP_PROVIDER` in `.env` and implement the relevant branch using:
- Twilio WhatsApp API
- Meta WhatsApp Cloud API
- Gupshup

---

## 💳 Payments

The included UPI QR generator (`/api/payments/generate-qr`) builds a standard `upi://pay` deep link and renders it as a QR code — works with any UPI app (PhonePe, Google Pay, Paytm, etc.). For a production-grade solution with automatic payment confirmation, integrate a gateway like Razorpay, Cashfree, or PhonePe's Payment Gateway API and update `transaction_id` capture accordingly.

---

## 🧾 GST / Non-GST Invoicing

When admin collects the balance payment, the customer's `gst_required` flag (set at booking time) determines whether the auto-generated PDF invoice includes GST (rate configurable via `GST_PERCENT` in `.env`, default 18%) or is a plain non-GST invoice.

---

## 🌐 Bilingual Support (हिंदी / English)

All UI text lives in `frontend/src/i18n/en.json` and `frontend/src/i18n/hi.json`. Add new keys to both files to keep translations in sync. The selected language is remembered in `localStorage` across visits.

---

## 📌 Notes for Production

- Rotate `JWT_SECRET` to a long random value and never commit real `.env` files.
- Replace the mock WhatsApp notifier with a real WhatsApp Business API integration.
- Add a real payment gateway with server-side payment verification instead of manually entered transaction IDs.
- Uploaded images are stored on local disk (`backend/uploads/`) — for production, point this at S3/Cloudinary/similar object storage instead.
- Configure HTTPS, environment secrets, and a production PostgreSQL instance (e.g. AWS RDS, Supabase, Railway) before going live.
- Consider adding refresh tokens / shorter JWT expiry + rate limiting on `/api/auth/login`.

---

## 📄 License

Provided as-is for the requesting business's internal use/customization.
