import axios from 'axios';

const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api';
console.log('🔥🔥🔥 API BASE URL:', API_BASE_URL);
const api = axios.create({
  baseURL: API_BASE_URL,
});

// Attach JWT token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

// Auto logout on 401
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
    }

    return Promise.reject(err);
  }
);

/* ---------- Public / customer-facing ---------- */
export const getPackages = (eventType) =>
  api.get('/packages', { params: eventType ? { event_type: eventType } : {} });

export const getSoundSets = () => api.get('/sound-sets');

export const checkAvailability = (date) => api.get('/availability', { params: { date } });

export const createBooking = (payload) => api.post('/bookings', payload);

export const generateUpiQr = (amount, note) => api.post('/payments/generate-qr', { amount, note });

export const getPackageBookingFields = (packageId) => api.get(`/booking-fields/by-package/${packageId}`);

/* ---------- Booking tracking (public) ---------- */
export const trackByToken = (token) => api.get(`/track/${token}`);
export const trackByBookingIdAndPhone = (booking_code, customer_phone) =>
  api.post('/track/lookup', { booking_code, customer_phone });
export const requestTrackingOtp = (booking_code, customer_phone) =>
  api.post('/track/request-otp', { booking_code, customer_phone });
export const verifyTrackingOtp = (booking_code, otp) => api.post('/track/verify-otp', { booking_code, otp });
export const submitBookingFeedback = (token, payload) => api.post(`/track/${token}/feedback`, payload);

/* ---------- Auth ---------- */
export const loginRequest = (email, password) => api.post('/auth/login', { email, password });
export const getMe = () => api.get('/auth/me');

/* ---------- Admin: bookings management ---------- */
export const getBooking = (id) => api.get(`/bookings/${id}`);
export const getBookings = (filters = {}) => api.get('/bookings', { params: filters });
export const updateBooking = (id, payload) => api.put(`/bookings/${id}`, payload);
//export const markDelivered = (id, delivered) => api.patch(`/bookings/${id}/delivery`, { delivered });

export const markDelivered = (id, delivered) => {
    console.log("🔥 markDelivered START");
    console.log("ID:", id);
    console.log("DELIVERED:", delivered);

    debugger;

    const url = `/bookings/${id}/delivery`;

    console.log("🔥 PATCH URL:", url);

    return api.patch(url, {
        delivered
    });
};



export const collectBalancePayment = (id, payload) => api.post(`/bookings/${id}/balance-payment`, payload);
export const cancelBooking = (id) => api.patch(`/bookings/${id}/cancel`);
export const getAdminSummary = () => api.get('/admin/summary');
export const getSoundSetTracker = (date) => api.get('/admin/sound-set-tracker', { params: { date } });
export const getMyFeedback = () => api.get('/admin/feedback');

/* ---------- Admin: equipment (sound sets) CRUD ---------- */
export const getMyEquipment = (filters = {}) => api.get('/admin/equipment', { params: filters });
export const createEquipment = (formData) =>
  api.post('/admin/equipment', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
export const updateEquipment = (id, formData) =>
  api.put(`/admin/equipment/${id}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
export const setEquipmentStatus = (id, status) => api.patch(`/admin/equipment/${id}/status`, { status });

/* ---------- Admin: packages CRUD ---------- */
export const getMyPackages = (filters = {}) => api.get('/admin/packages', { params: filters });
export const createPackage = (formData) =>
  api.post('/admin/packages', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
export const updatePackage = (id, formData) =>
  api.put(`/admin/packages/${id}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
export const setPackageStatus = (id, status) => api.patch(`/admin/packages/${id}/status`, { status });

/* ---------- Admin: custom booking fields ---------- */
export const getMyBookingFields = () => api.get('/booking-fields');
export const createBookingField = (payload) => api.post('/booking-fields', payload);
export const updateBookingField = (id, payload) => api.put(`/booking-fields/${id}`, payload);
export const deleteBookingField = (id) => api.delete(`/booking-fields/${id}`);
export const setBookingFieldStatus = (id, status) => api.patch(`/booking-fields/${id}/status`, { status });

/* ---------- Superadmin ---------- */
export const createAdminAccount = (payload) => api.post('/superadmin/admins', payload);
export const getAdminAccounts = (filters = {}) => api.get('/superadmin/admins', { params: filters });
export const updateAdminAccount = (id, payload) => api.put(`/superadmin/admins/${id}`, payload);
export const setAdminStatus = (id, status) => api.patch(`/superadmin/admins/${id}/status`, { status });
export const getPlatformRevenue = () => api.get('/superadmin/revenue');

export const INVOICE_BASE_URL = API_BASE_URL.replace('/api', '');

export default api;