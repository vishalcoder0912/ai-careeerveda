import {Link} from "react-router-dom";
import {
  feeText,
  panelHighlights,
  panelMetaRows,
} from "./programAssist";

// Small inline stroke icons — same family as the hero's, no icon library.
const iconPaths = {
  clock: (
    <path d="M12 7v5l3.5 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
  ),
  monitor: (
    <path d="M2 6a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6ZM8 20h8M12 15v5" />
  ),
  briefcase: (
    <path d="M3 9h18v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9ZM9 9V7a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M3 14h18" />
  ),
  user: (
    <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4 21c0-4 3.6-7 8-7s8 3 8 7" />
  ),
  download: (
    <path d="M12 3v11M7 10l5 5 5-5M4 19h16" />
  ),
};

const PanelIcon = ({name}) => (
  <svg
    className="pd-panel__icon"
    viewBox="0 0 24 24"
    width="18"
    height="18"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {iconPaths[name]}
  </svg>
);

// The right-hand information panel from the reference: program highlights,
// the fee, and the two conversion calls to action. `position: sticky` is applied
// only on desktop/tablet via CSS; on phones this same markup renders as an
// inline block right after the overview section instead.
const ProgramInfoPanel = ({program}) => {
  const fee = feeText(program.fee?.amount);
  const highlights = panelHighlights(program);
  const metaRows = panelMetaRows(program);

  return (
    <aside className="pd-panel" aria-label="Program highlights and fee">
      {highlights.length > 0 && (
        <div className="pd-panel__block">
          <h3 className="pd-panel__title">Program Highlights</h3>
          <dl className="pd-panel__highlights">
            {highlights.map((item) => (
              <div key={item.label}>
                <PanelIcon name={item.icon} />
                <span>
                  <small>{item.label}</small>
                  <strong>{item.value}</strong>
                </span>
              </div>
            ))}
          </dl>
        </div>
      )}

      {fee && (
        <div className="pd-panel__block pd-panel__pricing">
          <p className="pd-panel__label">Program Fee</p>
          <p className="pd-panel__amount">{fee}</p>
          {program.fee?.note && (
            <p className="pd-panel__note">{program.fee.note}</p>
          )}
          {metaRows.length > 0 && (
            <dl className="pd-panel__rows">
              {metaRows.map((row) => (
                <div key={row.label}>
                  <dt>{row.label}</dt>
                  <dd>{row.value}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      )}

      <div className="pd-panel__cta">
        <a className="pd-btn pd-btn--primary pd-btn--block" href="#pd-overview">
          Explore Program <span aria-hidden="true">→</span>
        </a>
        <Link
          className="pd-btn pd-btn--ghost pd-btn--block"
          to="/#consultation"
          aria-label="Download the programme syllabus"
        >
          <PanelIcon name="download" />
          Download Syllabus
        </Link>
      </div>
    </aside>
  );
};

export default ProgramInfoPanel;