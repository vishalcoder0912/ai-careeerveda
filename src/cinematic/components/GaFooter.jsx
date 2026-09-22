import {contactChannels, uiIcons} from "../data";

export const GaFooter = () => {
  return (
    <footer className="ga-footer" id="ga-contact">
      <div className="ga-footer-grid-bg" aria-hidden="true" />

      <div className="ga-footer-inner">
        <h2 className="ga-display ga-footer-title">
          Let’s Build
          <br />
          <em>With AI.</em>
        </h2>

        <div className="ga-footer-channels">
          {contactChannels.map((c) => (
            <a className="ga-footer-channel" href={c.href} key={c.label} data-cursor>
              <span className="ga-channel-label">{c.label}</span>
              <span className="ga-channel-value">
                <c.icon className="ga-channel-icon" size={16} strokeWidth={1.5} aria-hidden="true" />
                {c.value}
              </span>
            </a>
          ))}
        </div>

        <div className="ga-footer-divider" aria-hidden="true" />

        <div className="ga-footer-base">
          <p>PG Program in Generative AI &amp; Agentic AI</p>
          <a href="#ga-top" className="ga-footer-top" data-cursor>
            Back to top <uiIcons.ArrowUpRight size={14} aria-hidden="true" />
          </a>
        </div>
      </div>
    </footer>
  );
};

export default GaFooter;