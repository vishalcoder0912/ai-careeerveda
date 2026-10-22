import {uiIcons} from "../data";
import {Lines, useCinematic} from "../content";

export const GaFooter = () => {
  const {footer, programTitle} = useCinematic();
  return (
    <footer className="ga-footer" id="ga-contact">
      <div className="ga-footer-grid-bg" aria-hidden="true" />

      <div className="ga-footer-inner">
        <h2 className="ga-display ga-footer-title">
          <Lines lines={footer.title} />
        </h2>

        <div className="ga-footer-channels">
          {footer.channels.map((c) => (
            <a
              className="ga-footer-channel"
              href={c.href}
              key={c.label}
              data-cursor
              {...(c.external ? {target: "_blank", rel: "noopener noreferrer"} : {})}
            >
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
          
          <p>{programTitle}</p>
          <a href="#ga-top" className="ga-footer-top" data-cursor>
            Back to top <uiIcons.ArrowUpRight size={14} aria-hidden="true" />
          </a>
        </div>
      </div>
    </footer>
  );
};

export default GaFooter;