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
          <p className="trust-line text-sm font-semibold text-slate-200/80">
            Personalized learning, expert mentorship, interview support and 100% placement focus
          </p>
          <div className="hero-actions">
            <Link className="primary-action" to="/#consultation">
              Get in Touch
            </Link>
            <Link className="secondary-action" to="/programs">
              Explore Programs
            </Link>
          </div>
        </div>

        <SplineHeroScene sceneUrl={SPLINE_SCENE_URL} />
      </div>

      <div className="stat-strip">
        {stats.map(([value,label]) => (
          <div key={label}>
            <strong>{value}</strong>
            <span>{label}</span>
          </div>
        ))}
      </div>
    </section>
  );
};

export default Hero;
