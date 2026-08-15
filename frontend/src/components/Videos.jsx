
const videos = [
  {
    title: "Wedding DJ Performance",
    icon: "🎵",
  },
  {
    title: "Live Sound Event",
    icon: "🔊",
  },
  {
    title: "DJ Night Performance",
    icon: "🎧",
  },
];

const Videos = () => {
  return (
    <section className="video-section">
      <div className="container">

        <div className="section-title" data-aos="fade-up">
          <h2>Live Event Videos</h2>
          <p>Watch Our Latest Performances</p>
        </div>

        <div className="video-grid">
          {videos.map((video, index) => (
            <div
              className="video-card"
              data-aos="fade-up"
              data-aos-delay={index * 150}
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
                    "linear-gradient(135deg, #1a1a2e, #16213e)",
                  borderRadius: "12px",
                  color: "#fff",
                  textAlign: "center",
                }}
              >
                <div
                  style={{
                    fontSize: "50px",
                    marginBottom: "15px",
                  }}
                >
                  {video.icon}
                </div>

                <h3>{video.title}</h3>

                <p
                  style={{
                    opacity: 0.7,
                    marginTop: "8px",
                  }}
                >
                  Video coming soon
                </p>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
};

export default Videos;
