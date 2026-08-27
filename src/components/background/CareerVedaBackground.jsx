import CursorGrid from "./CursorGrid";
import {GRID_SIZE} from "../../config/grid";

import "./careerveda-background.css";

/* CareerVedaBackground — the ONE background system of the landing page.
 *
 * Owns three fixed layers that sit underneath everything Layout renders:
 *
 *   .cv-bg-base   the deep slate/navy ramp (the site's existing gradient,
 *                 moved here so every section shares one continuous field)
 *   .cv-bg-grid   the single CursorGrid canvas — 90px architectural cells in
 *                 the site's teal, a faint always-on lattice, cursor-reactive
 *                 illumination and click pulses (see CursorGrid.jsx)
 *   .cv-bg-glow   two soft teal/mint radials continuing the hero's ambient
 *                 lighting across the whole viewport
 *
 * The children render inside .cv-bg-content (relative, z-index 10), which is
 * what guarantees foreground paint order: a plain static sibling's background
 * would paint BELOW this fixed layer and catch grid lines over it — the footer
 * exactly. Everything interactive stays clickable because the fixed layers are
 * pointer-events: none and CursorGrid tracks the pointer on window instead.
 *
 * The wrapper deliberately has NO overflow-x: hidden: the navbar pins itself
 * with position: sticky, which dies inside any scroll-container ancestor.
 */
const CareerVedaBackground = ({children}) => (
  <div className="cv-bg-root">
    <div className="cv-bg-fixed" aria-hidden="true">
      <div className="cv-bg-base" />
      <div className="cv-bg-grid">
        <CursorGrid
          cellSize={GRID_SIZE}
          color="#2dd4bf"
          radius={145}
          falloff="smooth"
          holdTime={300}
          fadeDuration={750}
          lineWidth={1}
          maxOpacity={0.72}
          fillOpacity={0.07}
          gridOpacity={0.1}
          cellRadius={0}
          clickPulse
          pulseSpeed={600}
        />
      </div>
      <div className="cv-bg-glow" />
    </div>
    <div className="cv-bg-content">{children}</div>
  </div>
);

export default CareerVedaBackground;
