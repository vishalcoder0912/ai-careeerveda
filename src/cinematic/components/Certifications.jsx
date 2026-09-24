import {useParallax, useTilt} from "../fx/hooks";
import {certificates} from "../data";
import {SectionLabel} from "./Atmosphere";

const CertificateCard = ({cert, index}) => {
  const tilt = useTilt(6);
  return (
    <div className={`ga-cert ga-reveal ga-reveal-rise`} style={{transitionDelay: `${index * 120}ms`}}>
      <div className="ga-cert-inner" ref={tilt} data-cursor>
        <span className="ga-cert-guard" aria-hidden="true">◆</span>
        <span className="ga-cert-mark">{cert.mark}</span>
        <span className="ga-cert-kicker">CERTIFICATE OF COMPLETION</span>
        <h3>{cert.title}</h3>
        <span className="ga-cert-focus">{cert.focus}</span>
        <span className="ga-cert-seal" aria-hidden="true">PG</span>
        <span className="ga-cert-line" aria-hidden="true" />
      </div>
    </div>
  );
};

export const CertificationSection = () => {
  const band = useParallax(0.03);

  return (
    <section className="ga-certs" id="ga-certs" ref={band}>
      <div className="ga-certs-head">
        <SectionLabel index="12">Proof of Work</SectionLabel>
        <h2 className="ga-display">
          Build Proof.
          <br />
          Not Just Knowledge.
        </h2>
      </div>

      <div className="ga-certs-row">
        {certificates.map((c, i) => (
          <CertificateCard cert={c} index={i} key={c.mark} />
        ))}
      </div>

      <p className="ga-certs-note">
        A credential your future team can read — programs, projects and systems you can point to.
      </p>
    </section>
  );
};

export default CertificationSection;