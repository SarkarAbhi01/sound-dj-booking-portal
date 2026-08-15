require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const authRouter = require('./routes/auth');
const superadminRouter = require('./routes/superadmin');
const packagesRouter = require('./routes/packages');
const soundSetsRouter = require('./routes/soundSets');
const availabilityRouter = require('./routes/availability');
const bookingsRouter = require('./routes/bookings');
const bookingFieldsRouter = require('./routes/bookingFields');
const trackRouter = require('./routes/track');
const paymentsRouter = require('./routes/payments');
const adminRouter = require('./routes/admin');
const adminInventoryRouter = require('./routes/adminInventory');

const app = express();


app.use((err, req, res, next) => {
    console.error("🔥🔥 GLOBAL ERROR 🔥🔥");
    console.error("METHOD:", req.method);
    console.error("URL:", req.originalUrl);
    console.error("ERROR:", err);
    console.error("MESSAGE:", err.message);
    console.error("STACK:", err.stack);

    res.status(500).json({
        success: false,
        message: err.message
    });
});


const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


app.use((req, res, next) => {
    next();
});

// Serve generated PDF invoices & uploaded equipment/package images
app.use('/invoices', express.static(path.join(__dirname, '..', 'invoices')));
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'Sound & DJ Booking API is running', time: new Date() });
});

app.use('/api/auth', authRouter);
app.use('/api/superadmin', superadminRouter);
app.use('/api/packages', packagesRouter);
app.use('/api/sound-sets', soundSetsRouter);
app.use('/api/availability', availabilityRouter);
app.use('/api/bookings', bookingsRouter);
app.use('/api/booking-fields', bookingFieldsRouter);
app.use('/api/track', trackRouter);
app.use('/api/payments', paymentsRouter);
app.use('/api/admin', adminRouter);
app.use('/api/admin', adminInventoryRouter);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// Generic error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: err.message || 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`🎵 Sound & DJ Booking backend running at http://localhost:${PORT}`);
});
