import { Link } from "react-router-dom";
import { PageHero } from "../components/PageShell";

const AboutPage = () => (
  <main className="spline-page page-shell">
    <PageHero
      eyebrow="About CareerVeda"
      title={<>Learn. Analyze. <span className="accent">Lead.</span></>}
      lead="CareerVeda helps learners build practical skills, learn from experienced mentors, and move confidently toward their next opportunity."
    >
      <Link className="page-btn page-btn--primary" to="/programs">Explore Programs</Link>
      <Link className="page-btn page-btn--ghost" to="/contact">Contact Us</Link>
    </PageHero>
  </main>
);

export default AboutPage;
