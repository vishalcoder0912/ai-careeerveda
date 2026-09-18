import {Link} from "react-router-dom";
import {Reveal} from "../motionPrimitives";

const ProgramCta = ({program, applyHref}) => {
  return (
    <section className="pd-section pd-cta" id="pd-enroll">
      <div className="pd-inner">
        <Reveal className="pd-cta__panel">
          <h2>Ready to start {program.title}?</h2>
          <p>
            Reserve your seat and a career expert will confirm your batch, fee and
            EMI options.
          </p>
          <div className="pd-cta__actions">
            <Link className="pd-btn pd-btn--primary pd-btn--lg" to={applyHref}>
              Apply Now →
            </Link>
            <Link className="pd-btn pd-btn--ghost pd-btn--lg" to="/programs">
              Compare programs
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
};

export default ProgramCta;