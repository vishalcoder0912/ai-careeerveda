import {useState} from "react";
import {ArrowRight, Download} from "lucide-react";
import {useParallax, useTilt} from "../fx/hooks";
import {Lines, useCinematic} from "../content";
import {SectionLabel} from "./Atmosphere";
import {CertificateStudio} from "./CertificateStudio";

const CertificateCard = ({cert, index, onOpen}) => {
  const tilt = useTilt(6);
  return (
    <div className={`ga-cert ga-reveal ga-reveal-rise`} style={{transitionDelay: `${index * 120}ms`}}>
      {/* The whole card is one button. A separate small "download" link inside a
          non-interactive card would need its own tab stop and duplicate the
          accessible name; this way there is exactly one target, and it is the
          thing the eye was already drawn to. */}
      <button
        type="button"
        className="ga-cert-inner ga-cert-inner--action"
        ref={tilt}
        onClick={() => onOpen(cert)}
        aria-label={`Generate your ${cert.title} certificate`}
        data-cursor
      >
        <span className="ga-cert-guard" aria-hidden="true">◆</span>
        <span className="ga-cert-mark">{cert.mark}</span>
        <span className="ga-cert-kicker">CERTIFICATE OF COMPLETION</span>
        <h3>{cert.title}</h3>
        <span className="ga-cert-focus">{cert.focus}</span>
        <span className="ga-cert-stage">{cert.stage}</span>
        <span className="ga-cert-cta">
          <Download size={14} strokeWidth={1.6} aria-hidden="true" />
          Generate mine
        </span>
        <span className="ga-cert-seal" aria-hidden="true">PG</span>
        <span className="ga-cert-line" aria-hidden="true" />
      </button>
    </div>
  );
};

export const CertificationSection = () => {
  const {certs} = useCinematic();
  const {certificates, proofPillars, roadmap} = certs;
  const band = useParallax(0.03);
  const [active, setActive] = useState(null);

  return (
    <section className="ga-certs" id="ga-certs" ref={band}>
      <div className="ga-certs-head">
        <SectionLabel index="12">{certs.label}</SectionLabel>
        <h2 className="ga-display">
          <Lines lines={certs.title} />
        </h2>
        <p className="ga-certs-lede">{certs.lede}</p>
      </div>

      <div className="ga-certs-row">
        {certificates.map((c, i) => (
          <CertificateCard cert={c} index={i} key={c.mark} onOpen={setActive} />
        ))}
      </div>

      {/* Credential, project and repository are three different claims. Showing
          them as one is the exact thing this section exists to avoid. */}
      <ul className="ga-proof">
        {proofPillars.map((pillar) => (
          <li className="ga-proof-item ga-reveal" key={pillar.title}>
            <pillar.icon className="ga-proof-icon" size={20} strokeWidth={1.5} aria-hidden="true" />
            <h3 className="ga-proof-title">{pillar.title}</h3>
            <p className="ga-proof-note">{pillar.note}</p>
          </li>
        ))}
      </ul>

      {/* Optional: only programs with a mapped external-credential roadmap. */}
      {roadmap && (
      <div className="ga-roadmap ga-reveal">
        <div className="ga-roadmap-head">
          <h3 className="ga-roadmap-title">{roadmap.title}</h3>
          <p className="ga-roadmap-sub">{roadmap.sub}</p>
        </div>

        <ol className="ga-roadmap-list">
          {roadmap.rows.map((row) => (
            <li className="ga-roadmap-row" key={`${row.provider}-${row.credential}`}>
              <span className="ga-roadmap-stage">{row.stage}</span>
              <span className="ga-roadmap-weeks">{row.weeks}</span>
              <span className="ga-roadmap-credential">{row.credential}</span>
              <span className="ga-roadmap-provider">{row.provider}</span>
              <span className="ga-roadmap-cost">{row.cost}</span>
            </li>
          ))}
        </ol>

        <p className="ga-roadmap-narrative">
          {roadmap.narrative.map((step, i) => (
            <span className="ga-roadmap-step" key={step}>
              {step}
              {i < roadmap.narrative.length - 1 ? (
                <ArrowRight className="ga-roadmap-arrow" size={14} strokeWidth={1.6} aria-hidden="true" />
              ) : null}
            </span>
          ))}
        </p>

        <p className="ga-roadmap-caveat">{roadmap.caveat}</p>
      </div>
      )}

      <p className="ga-certs-note">{certs.note}</p>

      <CertificateStudio cert={active} open={Boolean(active)} onClose={() => setActive(null)} />
    </section>
  );
};

export default CertificationSection;
