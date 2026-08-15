import { useEffect, useState } from "react";

const counterData = [
  {
    number: 500,
    title: "Bookings",
  },
  {
    number: 1200,
    title: "Events",
  },
  {
    number: 15,
    title: "Years Experience",
  },
  {
    number: 24,
    title: "Hours Support",
  },
];

const Counter = () => {
  const [counts, setCounts] = useState(counterData.map(() => 0));

  useEffect(() => {
    const timers = [];

    counterData.forEach((item, index) => {
      let start = 0;

      const end = item.number;

      const duration = 1500;

      const step = Math.ceil(end / (duration / 30));

      const timer = setInterval(() => {
        start += step;

        if (start >= end) {
          start = end;
          clearInterval(timer);
        }

        setCounts((prev) => {
          const arr = [...prev];
          arr[index] = start;
          return arr;
        });
      }, 30);

      timers.push(timer);
    });

    return () => timers.forEach(clearInterval);
  }, []);

  return (
    <section className="counter">
      <div className="container">

        <div className="counter-grid">
          {counterData.map((item, index) => (
            <div
              key={index}
              data-aos="zoom-in"
              data-aos-delay={index * 100}
            >
              <h2>{counts[index]}+</h2>

              <p>{item.title}</p>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
};

export default Counter;