
/*

import React from "react";

const galleryImages = [
  "/images/gallery1.jpg",
  "/images/gallery2.jpg",
  "/images/gallery3.jpg",
  "/images/gallery4.jpg",
  "/images/gallery5.jpg",
  "/images/gallery6.jpg",
];

const Gallery = () => {
  return (
    <section className="gallery">
      <div className="container">

        <div className="section-title" data-aos="fade-up">
          <h2>Our Event Gallery</h2>
          <p>Latest Weddings, Parties & DJ Shows</p>
        </div>

        <div className="gallery-grid">
          {galleryImages.map((image, index) => (
            <div
              className="gallery-item"
              data-aos="zoom-in"
              data-aos-delay={index * 100}
              key={index}
            >
              <img
                src={image}
                alt={`Gallery ${index + 1}`}
              />
            </div>
          ))}
        </div>

      </div>
    </section>
  );
};

export default Gallery;

*/




const galleryItems = [
  {
    title: "Wedding Event",
    icon: "💍",
  },
  {
    title: "DJ Night",
    icon: "🎧",
  },
  {
    title: "Sound Setup",
    icon: "🔊",
  },
  {
    title: "Stage Setup",
    icon: "🎤",
  },
  {
    title: "Lighting Setup",
    icon: "💡",
  },
  {
    title: "Live Event",
    icon: "🎉",
  },
];

const Gallery = () => {
  return (
    <section className="gallery">
      <div className="container">

        <div className="section-title" data-aos="fade-up">
          <h2>Our Event Gallery</h2>
          <p>Latest Weddings, Parties & DJ Shows</p>
        </div>

        <div className="gallery-grid">
          {galleryItems.map((item, index) => (
            <div
              className="gallery-item"
              data-aos="zoom-in"
              data-aos-delay={index * 100}
              key={index}
            >
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  minHeight: "220px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  background:
                    "linear-gradient(135deg, #7b2ff7, #f107a3)",
                  color: "#fff",
                  textAlign: "center",
                  borderRadius: "12px",
                }}
              >
                <div
                  style={{
                    fontSize: "55px",
                    marginBottom: "12px",
                  }}
                >
                  {item.icon}
                </div>

                <h3>{item.title}</h3>

                <p
                  style={{
                    marginTop: "6px",
                    opacity: 0.8,
                  }}
                >
                  Image coming soon
                </p>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
};

export default Gallery;
