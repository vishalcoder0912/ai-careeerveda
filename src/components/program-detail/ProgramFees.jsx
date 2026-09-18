import {Link} from "react-router-dom";
import {Reveal} from "../motionPrimitives";

const feeText = (amount) => (amount ? `₹ ${String(amount).replace(/^₹/, "")}` : null);

const ProgramFees = ({program, applyHref}) => {
  const fee = feeText(program.fee?.amount);

  return (
    <section className="pd-section pd-fees" id="pd-fees">
      <div className="pd-inner">
        <Reveal className="pd-heading">
          <p className="pd-eyebrow">Program Investment</p>
          <h2>Simple, transparent pricing</h2>
          <p>
            One published fee, no surprises. EMI and flexible payment options are
            available so cost never decides alone.
          </p>
        </Reveal>

        <Reveal className="pd-fee-total" amount={0.1}>
          {fee && (
            <div className="pd-fee-total__amount">
              <small>Total program fee</small>
              <strong>{fee}</strong>
              {program.fee?.note && <span>{program.fee.note}</span>}
            </div>
          )}

          {(program.emi || program.nextBatch || program.seats) && (
            <dl className="pd-fee-total__rows">
              {program.emi && (
                <div>
                  <dt>EMI options</dt>
                  <dd>{program.emi}</dd>
                </div>
              )}
              {program.nextBatch && (
                <div>
                  <dt>Next batch</dt>
                  <dd>{program.nextBatch}</dd>
                </div>
              )}
              {program.seats && (
                <div>
                  <dt>Availability</dt>
                  <dd>{program.seats}</dd>
                </div>
              )}
            </dl>
          )}

          <div className="pd-fees__actions">
            <Link className="pd-btn pd-btn--primary" to={applyHref}>
              Enroll Now →
            </Link>
            <Link className="pd-btn pd-btn--ghost" to="/#consultation">
              Download Brochure
            </Link>
          </div>

          {program.emi && (
            <p className="pd-fee-trust">
              Flexible payment options · no-cost EMI available
            </p>
          )}
        </Reveal>
      </div>
    </section>
  );
};

export default ProgramFees;