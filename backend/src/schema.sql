-- Sound System & DJ Booking Portal - PostgreSQL Schema
-- साउंड सिस्टम & DJ बुकिंग पोर्टल - डेटाबेस स्कीमा

DROP TABLE IF EXISTS invoices CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS bookings CASCADE;
DROP TABLE IF EXISTS packages CASCADE;
DROP TABLE IF EXISTS sound_sets CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- 0. Users (superadmin + admins). Superadmin creates/manages admin accounts.
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    phone VARCHAR(20),
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('superadmin', 'admin')),
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'inactive')),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 1. Sound Sets / Equipment inventory owned by an admin (vendor)
CREATE TABLE sound_sets (
    id SERIAL PRIMARY KEY,
    owner_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    name_en VARCHAR(150) NOT NULL,
    name_hi VARCHAR(150) NOT NULL,
    description_en TEXT,
    description_hi TEXT,
    location VARCHAR(150) DEFAULT 'Warehouse',
    image_url VARCHAR(255),
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. Event Packages owned by an admin (vendor)
CREATE TABLE packages (
    id SERIAL PRIMARY KEY,
    owner_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    name_en VARCHAR(150) NOT NULL,
    name_hi VARCHAR(150) NOT NULL,
    event_type VARCHAR(50) NOT NULL,
    items_en TEXT NOT NULL,
    items_hi TEXT NOT NULL,
    description_en TEXT,
    description_hi TEXT,
    price NUMERIC(10, 2) NOT NULL,
    image_url VARCHAR(255),
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 3. Bookings (Date scheduling + advance receipt system)
CREATE TABLE bookings (
    id SERIAL PRIMARY KEY,
    booking_code VARCHAR(20) UNIQUE NOT NULL,
    customer_name VARCHAR(150) NOT NULL,
    customer_phone VARCHAR(20) NOT NULL,
    customer_email VARCHAR(150),
    customer_address TEXT,
    event_type VARCHAR(50) NOT NULL,
    event_date DATE NOT NULL,
    event_location TEXT,
    package_id INTEGER REFERENCES packages(id),
    sound_set_id INTEGER REFERENCES sound_sets(id),
    owner_id INTEGER REFERENCES users(id),
    total_amount NUMERIC(10, 2) NOT NULL,
    advance_percent INTEGER NOT NULL DEFAULT 20,
    advance_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
    balance_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
    gst_required BOOLEAN DEFAULT FALSE,
    status VARCHAR(30) NOT NULL DEFAULT 'pending_advance',
    -- statuses: pending_advance, confirmed, delivered, completed, cancelled
    delivery_status VARCHAR(30) DEFAULT 'not_delivered', -- not_delivered, delivered, returned
    delivered_at TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_bookings_event_date ON bookings(event_date);
CREATE INDEX idx_bookings_sound_set ON bookings(sound_set_id);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_owner ON bookings(owner_id);

-- 4. Payments (Advance + Balance payments)
CREATE TABLE payments (
    id SERIAL PRIMARY KEY,
    booking_id INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    amount NUMERIC(10, 2) NOT NULL,
    payment_type VARCHAR(20) NOT NULL, -- advance, balance
    payment_mode VARCHAR(20) NOT NULL, -- UPI, QR, PhonePe, GooglePay, Cash, BankTransfer
    transaction_id VARCHAR(100),
    status VARCHAR(20) DEFAULT 'success', -- success, pending, failed
    paid_at TIMESTAMP DEFAULT NOW()
);

-- 5. Invoices (Final GST / Non-GST invoice)
CREATE TABLE invoices (
    id SERIAL PRIMARY KEY,
    booking_id INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    invoice_number VARCHAR(30) UNIQUE NOT NULL,
    is_gst BOOLEAN DEFAULT FALSE,
    subtotal NUMERIC(10, 2) NOT NULL,
    gst_percent NUMERIC(5, 2) DEFAULT 0,
    gst_amount NUMERIC(10, 2) DEFAULT 0,
    total_amount NUMERIC(10, 2) NOT NULL,
    pdf_path VARCHAR(255),
    generated_at TIMESTAMP DEFAULT NOW()
);

-- 6. Custom Booking Fields — each admin (vendor) can define extra fields
--    they need from customers at booking time (e.g. "Hall Name", "Guest Count").
CREATE TABLE booking_field_defs (
    id SERIAL PRIMARY KEY,
    owner_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    field_key VARCHAR(60) NOT NULL,
    label_en VARCHAR(150) NOT NULL,
    label_hi VARCHAR(150) NOT NULL,
    field_type VARCHAR(20) NOT NULL DEFAULT 'text' CHECK (field_type IN ('text', 'number', 'textarea', 'date', 'select', 'checkbox')),
    options TEXT, -- comma-separated choices, only used when field_type = 'select'
    is_required BOOLEAN DEFAULT FALSE,
    display_order INTEGER DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(owner_id, field_key)
);

-- 7. Values the customer filled in for each admin's custom fields, snapshotted
--    per booking so they remain intact even if the field definition later changes.
CREATE TABLE booking_field_values (
    id SERIAL PRIMARY KEY,
    booking_id INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    field_key VARCHAR(60) NOT NULL,
    label_en VARCHAR(150),
    label_hi VARCHAR(150),
    value TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- NOTE: users, sound_sets and packages seed data is inserted programmatically
-- by `npm run db:init` (src/scripts/initDb.js) so that admin passwords can be
-- securely hashed with bcrypt instead of being stored in plain SQL.
