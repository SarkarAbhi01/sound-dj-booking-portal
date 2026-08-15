import { useEffect, useState } from "react";
import AOS from "aos";
import "aos/dist/aos.css";

import "../styles/BodySections.css";

import Services from "./Services";
import WhyChoose from "./WhyChoose";
import Gallery from "./Gallery";
import Videos from "./Videos";
import Testimonials from "./Testimonials";
import Counter from "./Counter";

export default function BodySections() {
  const [loading, setLoading] = useState(true);
  const [showTop, setShowTop] = useState(false);

  // =========================
  // Loader
  // =========================
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1200);

    return () => clearTimeout(timer);
  }, []);

  // =========================
  // Back To Top
  // =========================
  useEffect(() => {
    const handleScroll = () => {
      setShowTop(window.scrollY > 500);
    };

    window.addEventListener("scroll", handleScroll);

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  // =========================
  // AOS Animation
  // =========================
  useEffect(() => {
    AOS.init({
      duration: 1000,
      once: true,
    });
  }, []);

  // =========================
  // Loader Screen
  // =========================
  if (loading) {
    return (
      <div id="loader">
        <div className="loader-circle"></div>
      </div>
    );
  }

  // =========================
  // Page
  // =========================
  return (
    <>
      {/* =========================
          NOTICE
      ========================= */}
      <section className="notice">
        <marquee>
          🎉 Wedding Season Offer - Flat 20% OFF |
          🔥 Book DJ Today & Get Free Decoration |
          📢 Limited Slots Available |
          🎵 Premium Sound Setup Available
        </marquee>
      </section>

      {/* =========================
          SERVICES
      ========================= */}
      <Services />

      {/* =========================
          WHY CHOOSE US
      ========================= */}
      <WhyChoose />

      {/* =========================
          GALLERY
      ========================= */}
      <Gallery />

      {/* =========================
          VIDEOS
      ========================= */}
      <Videos />

      {/* =========================
          TESTIMONIALS
      ========================= */}
      <Testimonials />

      {/* =========================
          COUNTER
      ========================= */}
      <Counter />

      {/* =========================
          BACK TO TOP
      ========================= */}
      {showTop && (
        <button
          id="topBtn"
          type="button"
          onClick={() => {
            window.scrollTo({
              top: 0,
              behavior: "smooth",
            });
          }}
          aria-label="Back to top"
        >
          ↑
        </button>
      )}
    </>
  );
}

