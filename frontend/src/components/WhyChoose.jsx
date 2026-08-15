

const reasons = [
  {
    icon: "fas fa-check-circle",
    title: "Professional Team",
  },
  {
    icon: "fas fa-clock",
    title: "On Time Setup",
  },
  {
    icon: "fas fa-star",
    title: "Premium Equipment",
  },
  {
    icon: "fas fa-headset",
    title: "24×7 Support",
  },
];

const WhyChoose = () => {
  return (
    <section className="why">
      <div className="container">

        <div className="section-title" data-aos="fade-up">
          <h2>Why Choose Us</h2>
          <p>Trusted by hundreds of happy customers.</p>
        </div>

        <div className="why-grid">
          {reasons.map((item, index) => (
            <div
              className="why-box"
              data-aos="fade-up"
              data-aos-delay={index * 150}
              key={index}
            >
              <i className={item.icon}></i>
              <h4>{item.title}</h4>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
};

export default WhyChoose;

