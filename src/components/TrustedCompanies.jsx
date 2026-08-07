import {useEffect, useRef, useState} from "react";
import {logoRows, LOGO_EXTENSIONS} from "../data/companyLogos";
import "./TrustedCompanies.css";

/*
  Two-row company-logo marquee.

  Movement is pure CSS: each row's track holds the logo sequence twice and
  animates translate3d from 0 → -50% (or -50% → 0 for the opposite direction),
  which lands copy 2 exactly where copy 1 began — a seamless loop with no jump,
  gap or flicker. No React state, timers or rAF drive the motion.

  React only handles *pausing*:
    hover / keyboard focus → CSS (:hover, :focus-within) pauses that row.
    touch                  → tapping a card pauses its row via a class, with a
                             fallback timeout and tap-outside to resume, so a row
                             can never get stuck paused.

  Gaps are card margin-right (not flex `gap`) on purpose: it makes one sequence
  exactly N*(card+gap) wide, so the -50% translate is pixel-perfect seamless.
*/

const CARD_WIDTH = 300; // matches --tc-card-w; used only to reserve <img> space
const CARD_HEIGHT = 125;

const logoSrc = (slug, ext) => `/images/companies/${slug}.${ext}`;

const LogoCard = ({item, decorative = false}) => {
  // Walk through the accepted formats (png → svg → webp). Each failed load bumps
  // the index; once we've run out of formats, show the company name as text so a
  // missing logo never leaves a broken image.
  const [extIndex, setExtIndex] = useState(0);
  const exhausted = extIndex >= LOGO_EXTENSIONS.length;

  return (
    // The duplicated marquee copy sits inside aria-hidden="true". A focusable
    // element in there is a keyboard trap: tab order walks into a subtree
    // screen readers have been told does not exist, so the user lands on
    // something with no announced name. axe reports this as aria-hidden-focus.
    <div className="tc-card" tabIndex={decorative ? -1 : 0} aria-label={item.name}>
      {exhausted ? (
        <span className="tc-card__fallback">{item.name}</span>
      ) : (
        <img
          className="tc-card__logo"
          src={logoSrc(item.slug, LOGO_EXTENSIONS[extIndex])}
          alt={item.alt}
          width={CARD_WIDTH}
          height={CARD_HEIGHT}
          loading="lazy"
          decoding="async"
          draggable="false"
          onError={() => setExtIndex((index) => index + 1)}
        />
      )}
    </div>
  );
};

const MarqueeRow = ({logos, direction, rowId, paused, onPause}) => {
  // Rendered twice; the second copy is decorative, so it's hidden from AT.
  const sequence = (dup) => (
    <div className="tc-group" aria-hidden={dup ? "true" : undefined}>
      {logos.map((item) => (
        <LogoCard key={`${dup ? "b" : "a"}-${item.id}`} item={item} decorative={dup} />
      ))}
    </div>
  );

  return (
    <div
      className={`tc-row${paused ? " is-paused" : ""}`}
      onTouchStart={() => onPause(rowId)}
    >
      <div className={`tc-track tc-track--${direction}`}>
        {sequence(false)}
        {sequence(true)}
      </div>
    </div>
  );
};

// `showHeading` renders the component's own centred title; set it false when the
// host section already supplies a heading (e.g. the alumni "Where they work"
// block). `embedded` drops the standalone section's padding + background so the
// marquee sits inside an existing section rather than acting as its own band.
const TrustedCompanies = ({showHeading = true, embedded = false}) => {
  const [pausedRow, setPausedRow] = useState(null);
  const timerRef = useRef(0);

  // Touch pause: hold this row, then auto-resume after a few seconds so it can
  // never appear frozen/broken.
  const pauseRow = (rowId) => {
    setPausedRow(rowId);
    window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setPausedRow(null), 4000);
  };

  useEffect(() => () => window.clearTimeout(timerRef.current), []);

  // While a row is touch-paused, a tap anywhere outside a card resumes it.
  // Taps on a card are left to that card's own handler (pause / switch rows).
  useEffect(() => {
    if (!pausedRow) return undefined;
    const resumeOnOutside = (event) => {
      if (event.target.closest?.(".tc-card")) return;
      window.clearTimeout(timerRef.current);
      setPausedRow(null);
    };
    document.addEventListener("touchstart", resumeOnOutside, {passive: true});
    return () => document.removeEventListener("touchstart", resumeOnOutside);
  }, [pausedRow]);

  return (
    <section
      className={`trusted-companies${embedded ? " trusted-companies--embedded" : ""}`}
      aria-label="Companies that trust CareerVeda"
    >
      {showHeading && (
        <div className="tc-head">
          <h2 className="tc-title">Trusted by 900+ Leading Organizations Across India</h2>
        </div>
      )}

      <div className="tc-rows">
        {logoRows.map((logos, index) => {
          const rowId = `row-${index}`;
          return (
            <MarqueeRow
              key={rowId}
              logos={logos}
              // Alternate scroll direction line by line.
              direction={index % 2 === 0 ? "ltr" : "rtl"}
              rowId={rowId}
              paused={pausedRow === rowId}
              onPause={pauseRow}
            />
          );
        })}
      </div>
    </section>
  );
};

export default TrustedCompanies;
