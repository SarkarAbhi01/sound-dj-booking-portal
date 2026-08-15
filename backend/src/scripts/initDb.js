/**
 * Run this once (and any time you want to reset with fresh sample data):
 *   npm run db:init
 *
 * 1. Executes schema.sql to (re)create all tables.
 * 2. Seeds a superadmin account and a demo admin (vendor) account.
 * 3. Seeds sample sound equipment & packages owned by the demo admin.
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { pool } = require('../db');

const SEED_SUPERADMIN_EMAIL = process.env.SEED_SUPERADMIN_EMAIL || 'superadmin@sounddj.com';
const SEED_SUPERADMIN_PASSWORD = process.env.SEED_SUPERADMIN_PASSWORD || 'Super@123';
const SEED_ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL || 'admin@sounddj.com';
const SEED_ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || 'Admin@123';
const SEED_ADMIN_NAME = process.env.SEED_ADMIN_NAME || 'Sharma Sound & DJ Services';

async function initDb() {
  const client = await pool.connect();
  try {
    const schemaPath = path.join(__dirname, '..', 'schema.sql');
    const sql = fs.readFileSync(schemaPath, 'utf8');
    console.log('Creating tables...');
    await client.query(sql);

    console.log('Seeding superadmin & demo admin accounts...');
    const superadminHash = await bcrypt.hash(SEED_SUPERADMIN_PASSWORD, 10);
    const adminHash = await bcrypt.hash(SEED_ADMIN_PASSWORD, 10);

    await client.query(
      `INSERT INTO users (name, email, password_hash, role, status) VALUES ($1,$2,$3,'superadmin','active')`,
      ['Super Admin', SEED_SUPERADMIN_EMAIL, superadminHash]
    );

    const adminResult = await client.query(
      `INSERT INTO users (name, email, password_hash, role, status) VALUES ($1,$2,$3,'admin','active') RETURNING id`,
      [SEED_ADMIN_NAME, SEED_ADMIN_EMAIL, adminHash]
    );
    const adminId = adminResult.rows[0].id;

    console.log('Seeding sample sound equipment...');
    await client.query(
      `INSERT INTO sound_sets (owner_id, name_en, name_hi, description_en, description_hi, location) VALUES
       ($1,'Sound Set A - Premium', 'साउंड सेट A - प्रीमियम', '8 Top + 4 Bass + Full DJ Console', '8 टॉप + 4 बेस + फुल DJ कंसोल', 'Main Warehouse'),
       ($1,'Sound Set B - Standard', 'साउंड सेट B - स्टैंडर्ड', '4 Top + 2 Bass + DJ Setup + Mic', '4 टॉप + 2 बेस + DJ सेटअप + माइक', 'Main Warehouse'),
       ($1,'Sound Set C - Basic', 'साउंड सेट C - बेसिक', '2 Top + 1 Bass + Mic Set', '2 टॉप + 1 बेस + माइक सेट', 'Branch Store'),
       ($1,'Sound Set D - Jagran Special', 'साउंड सेट D - जागरण स्पेशल', '6 Top + 2 Bass + Stage Lighting + Mic Set', '6 टॉप + 2 बेस + स्टेज लाइटिंग + माइक सेट', 'Main Warehouse')`,
      [adminId]
    );

    console.log('Seeding sample event packages...');
    await client.query(
      `INSERT INTO packages (owner_id, name_en, name_hi, event_type, items_en, items_hi, description_en, description_hi, price) VALUES
       ($1,'Wedding Grand Package', 'शादी ग्रैंड पैकेज', 'wedding', '8 Top + 4 Bass + DJ Setup + 4 Mic + Stage Lighting', '8 टॉप + 4 बेस + DJ सेटअप + 4 माइक + स्टेज लाइटिंग', 'Complete sound solution for wedding ceremonies and receptions', 'शादी समारोह और रिसेप्शन के लिए संपूर्ण साउंड समाधान', 35000.00),
       ($1,'Birthday Party Package', 'बर्थडे पार्टी पैकेज', 'birthday', '4 Top + 2 Bass + DJ Setup + Mic', '4 टॉप + 2 बेस + DJ सेटअप + माइक', 'Fun sound and DJ setup for birthday celebrations', 'बर्थडे सेलिब्रेशन के लिए मजेदार साउंड और DJ सेटअप', 12000.00),
       ($1,'Bhagwat Katha Package', 'भागवत कथा पैकेज', 'bhagwat', '4 Top + 2 Bass + Mic Set (6 Mic) + Speaker Stand', '4 टॉप + 2 बेस + माइक सेट (6 माइक) + स्पीकर स्टैंड', 'Clear, devotional sound setup for religious katha events', 'धार्मिक कथा कार्यक्रमों के लिए स्पष्ट, भक्तिमय साउंड सेटअप', 15000.00),
       ($1,'Jagran Package', 'जागरण पैकेज', 'jagran', '6 Top + 2 Bass + Stage Lighting + Mic Set', '6 टॉप + 2 बेस + स्टेज लाइटिंग + माइक सेट', 'High power sound system for all-night jagran events', 'रात भर चलने वाले जागरण कार्यक्रमों के लिए हाई पावर साउंड सिस्टम', 18000.00),
       ($1,'Orchestra Package', 'आर्केस्ट्रा पैकेज', 'orchestra', '8 Top + 4 Bass + Full Instrument Mixing Console + 6 Mic', '8 टॉप + 4 बेस + फुल इंस्ट्रूमेंट मिक्सिंग कंसोल + 6 माइक', 'Professional grade sound setup for live orchestra performances', 'लाइव आर्केस्ट्रा प्रदर्शन के लिए प्रोफेशनल ग्रेड साउंड सेटअप', 28000.00),
       ($1,'DJ Night Package', 'DJ नाइट पैकेज', 'dj_night', '4 Top + 4 Bass + Professional DJ Console + Dance Floor Lighting', '4 टॉप + 4 बेस + प्रोफेशनल DJ कंसोल + डांस फ्लोर लाइटिंग', 'High-energy DJ setup with lighting for dance parties', 'डांस पार्टियों के लिए लाइटिंग के साथ हाई-एनर्जी DJ सेटअप', 22000.00)`,
      [adminId]
    );

    console.log('Seeding sample custom booking fields...');
    await client.query(
      `INSERT INTO booking_field_defs (owner_id, field_key, label_en, label_hi, field_type, options, is_required, display_order) VALUES
       ($1,'guest_count','Approx. Guest Count','अनुमानित मेहमानों की संख्या','number',NULL,TRUE,1),
       ($1,'hall_name','Venue / Hall Name','स्थल / हॉल का नाम','text',NULL,FALSE,2),
       ($1,'reference_by','Reference / Referred By','संदर्भ / किसने बताया','text',NULL,FALSE,3)`,
      [adminId]
    );

    console.log('✅ Database initialized successfully.');
    console.log('----------------------------------------');
    console.log(`Superadmin login: ${SEED_SUPERADMIN_EMAIL} / ${SEED_SUPERADMIN_PASSWORD}`);
    console.log(`Demo admin login: ${SEED_ADMIN_EMAIL} / ${SEED_ADMIN_PASSWORD}`);
    console.log('----------------------------------------');
  } catch (err) {
    console.error('❌ Failed to initialize database:', err.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

initDb();
