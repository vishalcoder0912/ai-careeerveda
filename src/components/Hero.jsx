import {Link} from "react-router-dom";
import {SPLINE_SCENE_URL} from "../config/spline";
import SplineHeroScene from "./SplineHeroScene";

const Hero = ({stats}) => {
  return (
    <section id="top" className="hero-shell">
    
      <div className="hero-word" aria-hidden="true">
        CAREERVEDA
      </div>
      <div className="hero-vignette" />

      <div className="hero-layout">
        <div className="hero-copy cv-hero-enter">
          <p className="eyebrow">From Learning to Placement — We Guide Every Step</p>
          <h1>Launch Your Career with <span className="hero-title-accent">Industry-Led</span> Programs</h1>
          <p>
            Master Data Analytics, Product Management, Data Science and Generative AI
            through live classes, hands-on projects, expert mentorship, and dedicated
            placement support designed to help you become job-ready.
          </p>
          <ul className="hero-proof" aria-label="CareerVeda benefits">
            {['Personalized Learning', 'Expert Mentorship', 'Placement Support', 'Verified Projects'].map((item) => <li key={item}>{item}</li>)}
          </ul>
          <div className="hero-actions">
            <Link className="primary-action" to="/programs">
              Explore Programs <span aria-hidden="true">→</span>
            </Link>
            <Link className="secondary-action" to="/#consultation">
              Get in Touch <span aria-hidden="true">↗</span>
            </Link>
          </div>
        </div>

        <SplineHeroScene sceneUrl={SPLINE_SCENE_URL} />
      </div>

      <div className="stat-strip">
        {stats.map(([value,label]) => (
          <div key={label} className="stat-item">
            <strong>{value}</strong>
            <span>{label}</span>
          </div>
        ))}
      </div>
    </section>
  );
};

export default Hero;
