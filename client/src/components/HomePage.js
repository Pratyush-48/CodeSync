import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Application } from "@splinetool/runtime";
import "./HomePage.css";
import { useNavigate } from "react-router-dom";

const HomePage = () => {
  const canvasRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const featuresRef = useRef([]);
  const navigate = useNavigate();

  useEffect(() => {
    const splineApp = new Application(canvasRef.current);
    splineApp
      .load("https://prod.spline.design/96ombws4AIxxYvwS/scene.splinecode")
      .then(() => {
        setIsLoading(false);
        splineApp.setZoom(0.35);
        splineApp.setControls(false);
        splineApp.setMouseControls(false);
      })
      .catch((error) => {
        console.error("Spline error:", error);
        setIsLoading(false);
      });

    return () => {
      if (splineApp) splineApp.dispose();
    };
  }, []);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
        delayChildren: 0.3,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.5,
        ease: "easeOut",
      },
    },
  };

  return (
    <div className="app">
      {/* Spline Background - Right Aligned */}
      <div className="spline-background">
        <canvas
          ref={canvasRef}
          className="spline-canvas"
          style={{ pointerEvents: "none" }}
        />
        {isLoading && (
          <div className="spline-loading">
            <div className="loader"></div>
          </div>
        )}
        <div className="spline-overlay"></div>
      </div>

      {/* Content Container */}
      <motion.div
        className="content-container"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5 }}
        variants={containerVariants}
      >
        <nav className="navbar">
          <motion.h1
            className="logo"
            variants={itemVariants}
            whileHover={{ scale: 1.05 }}
          >
            <span className="logo-container">
              <img
                src="/images/logo.png" // Note the leading slash
                alt="CodeSync Logo"
                className="logo-img"
              />
            </span>
            <span className="logo-gradient">CodeSync</span>
            <span className="logo-beta">PRO</span>
          </motion.h1>
        </nav>

        <main className="main-content">
          <motion.div className="hero-section" variants={containerVariants}>
            <motion.h1 className="main-heading" variants={itemVariants}>
              <span className="heading-line">Build Together.</span>
              <span className="heading-line">Code Together.</span>
              <span className="heading-line">Ship Faster.</span>
            </motion.h1>

            <motion.p className="subheading" variants={itemVariants}>
              The ultimate real-time coding environment for teams. Instantly
              create private rooms, collaborate with live execution, and get
              work done in 15+ programming languages - no setup required.
            </motion.p>
          </motion.div>

          <motion.div className="cta-buttons" variants={itemVariants}>
            <motion.button
              className="btn primary large"
              whileHover={{
                scale: 1.05,
                boxShadow: "0 10px 25px rgba(0, 210, 255, 0.4)",
              }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate("/Home")}
            >
              Create/Join Room
              <span className="btn-icon"></span>
            </motion.button>
          </motion.div>

          <motion.div
            className="stats-section"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={containerVariants}
          >
            <motion.div className="stat-card" variants={itemVariants}>
              <h3>100+</h3>
              <p>Developers</p>
            </motion.div>
            <motion.div className="stat-card" variants={itemVariants}>
              <h3>15+</h3>
              <p>Languages</p>
            </motion.div>
            <motion.div className="stat-card" variants={itemVariants}>
              <h3>99.99%</h3>
              <p>uptime</p>
            </motion.div>
          </motion.div>

          <div id="features" className="features-container">
            <motion.h2
              className="section-title"
              variants={itemVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
            >
              Powerful Features
            </motion.h2>
            <motion.div
              className="features"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              variants={containerVariants}
            >
              {[
                {
                  icon: "🚪",
                  title: "Join Rooms Instantly",
                  description: "Quickly join coding rooms with just a room ID",
                },
                {
                  icon: "✨",
                  title: "Create Rooms Hassle-Free",
                  description: "Start new coding sessions with one click",
                },
                {
                  icon: "💻",
                  title: "Multi-Language Support",
                  description:
                    "Code in 15+ programming languages with syntax highlighting",
                },
                {
                  icon: "⚡",
                  title: "Real-Time Compilation",
                  description: "See your code execute instantly as you type",
                },
                {
                  icon: "🔐",
                  title: "Secure Environment",
                  description:
                    "Protected sessions with industry-standard security",
                },
                {
                  icon: "👨‍💻",
                  title: "Collaborative Coding",
                  description:
                    "Work simultaneously with teammates in real-time",
                },
              ].map((feature, index) => (
                <motion.div
                  key={index}
                  className="feature-card"
                  ref={(el) => (featuresRef.current[index] = el)}
                  variants={itemVariants}
                  whileHover={{
                    y: -10,
                    boxShadow: "0 15px 30px rgba(0, 210, 255, 0.2)",
                    background: "rgba(15, 23, 42, 0.7)",
                  }}
                >
                  <div className="feature-icon">{feature.icon}</div>
                  <h3>{feature.title}</h3>
                  <p>{feature.description}</p>
                  <div className="feature-hover-effect"></div>
                </motion.div>
              ))}
            </motion.div>
          </div>

          <div className="testimonials-section">
            <motion.h2
              className="section-title"
              variants={itemVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
            >
              What Developers Say
            </motion.h2>
            <motion.div
              className="testimonials"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={containerVariants}
            >
              {[
                {
                  quote:
                    "CodeSync lets me code live with my team across cities — it's like we're in the same room!",
                  author: "Lalit, Software Engineer",
                },
                {
                  quote:
                    "Real-time compilation and support for 15+ languages make CodeSync the ultimate tool for developers.",
                  author: "Spandan, Backend Developer",
                },
                {
                  quote:
                    "In CodeSync, my team reviews, writes, and compiles code live — it's the perfect coding companion for remote collaboration.",
                  author: "Abhijeet, Tech Lead",
                },
              ].map((testimonial, index) => (
                <motion.div
                  key={index}
                  className="testimonial-card"
                  variants={itemVariants}
                  whileHover={{ scale: 1.03 }}
                >
                  <p className="testimonial-quote">"{testimonial.quote}"</p>
                  <p className="testimonial-author">— {testimonial.author}</p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </main>

        <footer className="footer">
          <div className="footer-content">
            <div className="footer-logo">
              <span className="logo-gradient">CodeSync</span>
              <span className="logo-beta">PRO</span>
            </div>
            <div className="footer-links">
              <a href="/" className="footer-link">
                Github
              </a>
            </div>
          </div>
          <p className="footer-copyright">
            © {new Date().getFullYear()} CodeSync. All rights reserved.
          </p>
        </footer>
      </motion.div>
    </div>
  );
};

export default HomePage;
