import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import NavBar from './components/NavBar';
import Footer from './components/Footer';
import FloatingBookButton from './components/FloatingBookButton';
import ProtectedRoute from './components/ProtectedRoute';
import HomePage from './pages/HomePage';
import BookingPage from './pages/BookingPage';
import TrackBookingPage from './pages/TrackBookingPage';
import AdminPage from './pages/AdminPage';
import SuperadminPage from './pages/SuperadminPage';
import LoginPage from './pages/LoginPage';
import AboutPage from './pages/AboutPage';
import ContactPage from './pages/ContactPage';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
import { AuthProvider } from './context/AuthContext';
import BodySections from "./components/BodySections";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="app-shell">
          <NavBar />
          <main className="container">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/book" element={<BookingPage />} />
              <Route path="/track" element={<TrackBookingPage />} />
              <Route path="/track/:token" element={<TrackBookingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/contact" element={<ContactPage />} />
              <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
              <Route
                path="/admin"
                element={
                  <ProtectedRoute role="admin">
                    <AdminPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/superadmin"
                element={
                  <ProtectedRoute role="superadmin">
                    <SuperadminPage />
                  </ProtectedRoute>
                }
              />
            </Routes>
          </main>
          
          <Footer />
          <FloatingBookButton />
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}
