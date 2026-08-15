
const services = [
  {
    icon: "fas fa-compact-disc",
    title: "DJ Setup",
    desc: "Professional DJ console with high quality music system.",
  },
  {
    icon: "fas fa-volume-up",
    title: "Sound System",
    desc: "Crystal clear sound for weddings, parties and live shows.",
  },
  {
    icon: "fas fa-lightbulb",
    title: "Lighting",
    desc: "LED lights, moving heads, laser lights and stage effects.",
  },
  {
    icon: "fas fa-microphone",
    title: "Stage Setup",
    desc: "Professional stage arrangement for every event.",
  },
  {
    icon: "fas fa-video",
    title: "LED Wall",
    desc: "HD LED screens for concerts, weddings and celebrations.",
  },
  {
    icon: "fas fa-music",
    title: "Live Orchestra",
    desc: "Experienced musicians and singers for live performances.",
  },
];

const Services = () => {
  return (
    <section className="services">
      <div className="container">

        <div className="section-title" data-aos="fade-up">
          <h2>Our Premium Services</h2>
          <p>Everything you need for a successful event</p>
        </div>

        <div className="service-grid">
          {services.map((service, index) => (
            <div
              className="service-card"
              data-aos="zoom-in"
              data-aos-delay={index * 100}
              key={index}
            >
              <i className={service.icon}></i>

              <h3>{service.title}</h3>

              <p>{service.desc}</p>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
};

export default Services;