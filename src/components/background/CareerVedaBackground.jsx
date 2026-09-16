import "./careerveda-background.css";

/* CareerVedaBackground — the ONE background system of the landing page.
 *
 * Owns two fixed layers that sit underneath everything Layout renders:
 *
 *   .cv-bg-base   the white base field + soft blue/lavender/cyan ambient
 *                 glows (careerveda-background.css' premium white atmosphere)
 *   .cv-bg-glow   a second, softer ambient light layer for depth
 *
 * The children render inside .cv-bg-content (relative, z-index 10), which is
 * what guarantees foreground paint order: a plain static sibling's background
 * would paint BELOW this fixed layer and catch the ambient glows over it — the
 * footer exactly. Everything interactive stays clickable because the fixed
 * layers are pointer-events: none.
 *
 * The wrapper deliberately has NO overflow-x: hidden: the navbar pins itself
 * with position: sticky, which dies inside any scroll-container ancestor.
 */
const CareerVedaBackground = ({children}) => (
  <div className="cv-bg-root">
    <div className="cv-bg-fixed" aria-hidden="true">
      <div className="cv-bg-base" />
      <div className="cv-bg-glow" />
    </div>
    <div className="cv-bg-content">{children}</div>
  </div>
);

export default CareerVedaBackground;
