

const testimonials = [
  {
    img: "/images/user1.jpg",
    name: "Rahul Sharma",
    review:
      "Amazing DJ setup. Very professional service. Highly recommended.",
  },
  {
    img: "/images/user2.jpg",
    name: "Pooja Verma",
    review:
      "Excellent sound quality. Decoration was superb.",
  },
  {
    img: "/images/user3.jpg",
    name: "Amit Patel",
    review:
      "Best experience. Affordable pricing. Friendly staff.",
  },
];

const Testimonials = () => {
  return (
    <section className="testimonial">
      <div className="container">

        <div className="section-title" data-aos="fade-up">
          <h2>Happy Customers</h2>
          <p>What our clients say</p>
        </div>

        <div className="testimonial-grid">
          {testimonials.map((item, index) => (
            <div
              className="review-card"
              key={index}
              data-aos="fade-up"
              data-aos-delay={index * 100}
            >
              <img src={item.img} alt={item.name} />

              <h3>{item.name}</h3>

              <div className="stars">★★★★★</div>

              <p>{item.review}</p>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
};

export default Testimonials;