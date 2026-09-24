import {useEffect, useRef} from "react";
import {reducedMotionNow} from "../fx/registry";
import {agentSatellites} from "../data";
import {SectionLabel} from "./Atmosphere";

const CX = 50;
const CY = 50;
const END_INSET = 4.2;

/* Hub is a visual circle; inside the 16:9 SVG space it maps to an ellipse
   (width is 100 units, height is only 56 units). These are the ellipse radii
   of the central node (~160px on desktop) so connectors start at its rim. */
const HUB_A = 8;
const HUB_B = 14.2;

const rimPoint = (ux, uy) => {
  const t = 1 / Math.hypot(ux / HUB_A, uy / HUB_B);
  return {x: CX + ux * t, y: CY + uy * t};
};

/* Compact, balanced radial anchors — kept deliberately close to the hub so the
   network reads as one connected system. Mirrored left/right for symmetry. */
const NODE_POS = {
  USER: {x: 50, y: 22},
  SECURITY: {x: 30, y: 34},
  LLM: {x: 70, y: 34},
  EVAL: {x: 24, y: 49},
  MEMORY: {x: 76, y: 49},
  "MULTI-AGENT": {x: 29, y: 66},
  TOOLS: {x: 71, y: 66},
  GPU: {x: 41.5, y: 79},
  RAG: {x: 58.5, y: 79},
  API: {x: 50, y: 81},
};

/* Quadratic bezier: hub rim → gentle control → node. Short, controlled curves. */
const curveTo = (x0, y0, cxp, cyp, x1, y1) =>
  `M ${x0} ${y0} Q ${cxp.toFixed(2)} ${cyp.toFixed(2)} ${x1.toFixed(2)} ${y1.toFixed(2)}`;

const pointOn = (t, x0, y0, cxp, cyp, x1, y1) => {
  const u = 1 - t;
  return {
    x: u * u * x0 + 2 * u * t * cxp + t * t * x1,
    y: u * u * y0 + 2 * u * t * cyp + t * t * y1,
  };
};

const buildLinks = (satellites) =>
  satellites.map((s) => {
    const {x, y} = NODE_POS[s.label] || {x: 50, y: 50};
    const dx = x - CX;
    const dy = y - CY;
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx / len;
    const uy = dy / len;
    const start = rimPoint(ux, uy);
    const midX = (start.x + x) / 2;
    const midY = (start.y + y) / 2;
    const cur = Math.min(8, 2.5 + len * 0.07);
    const cxp = midX + -uy * cur;
    const cyp = midY + ux * cur;
    const end = {x: x - ux * END_INSET, y: y - uy * END_INSET};
    return {
      label: s.label,
      x,
      y,
      cxp,
      cyp,
      d: curveTo(start.x, start.y, cxp, cyp, end.x, end.y),
      from: start,
      end,
    };
  });

const LINKS = buildLinks(agentSatellites);

/* Stable pseudo-random atmosphere specks — mostly pale blue, a few orange */
const PARTICLES = Array.from({length: 19}, (_, i) => {
  const sx = (i * 137) % 97;
  const sy = (i * 71) % 89;
  return {
    x: 5 + (sx % 90),
    y: 8 + (sy % 84),
    r: 0.3 + (i % 3) * 0.16,
    o: 0.12 + (i % 4) * 0.07,
    dur: 6 + (i % 5),
    delay: (i % 7) * 0.9,
    tone: i >= 16 ? "orange" : "blue",
  };
});

export const AgentSystem = () => {
  const svgRef = useRef(null);
  const packetLayerRef = useRef(null);
  const sceneRef = useRef(null);

  useEffect(() => {
    const svg = svgRef.current;
    const packets = packetLayerRef.current;
    const scene = sceneRef.current;
    if (!svg || !packets || !scene) return undefined;
    if (reducedMotionNow()) {
      scene.classList.add("ga-agent-static");
      return undefined;
    }

    const lines = Array.from(svg.querySelectorAll(".ga-agent-line-path"));
    const DOTS = 5;
    const packDots = Array.from({length: DOTS}, (_, k) => {
      const c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      c.setAttribute("r", "0.22");
      c.setAttribute("class", "ga-agent-packet");
      c.setAttribute("opacity", "0");
      packets.appendChild(c);
      const lineIdx = k % lines.length;
      return {el: c, line: lineIdx, t: k / DOTS, speed: 0.0032 + Math.random() * 0.0024, active: k < DOTS - 1};
    });

    let raf = null;
    let running = true;

    const tick = () => {
      if (!running) return;
      packDots.forEach((p) => {
        if (!p.active) return;
        p.t += p.speed;
        if (p.t >= 1) {
          p.t = 0;
          p.line = (p.line + 1) % lines.length;
        }
        const {cxp, cyp, from, end} = LINKS[p.line];
        const pt = pointOn(p.t, from.x, from.y, cxp, cyp, end.x, end.y);
        const pulse = 0.2 + 0.3 * Math.sin(p.t * Math.PI);
        p.el.setAttribute("cx", pt.x.toFixed(2));
        p.el.setAttribute("cy", pt.y.toFixed(2));
        p.el.setAttribute("opacity", pulse.toFixed(2));
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    const onVis = () => {
      running = document.visibilityState === "visible";
      if (running && !raf) raf = requestAnimationFrame(tick);
      else if (!running && raf) {
        cancelAnimationFrame(raf);
        raf = null;
      }
    };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      running = false;
      if (raf) cancelAnimationFrame(raf);
      document.removeEventListener("visibilitychange", onVis);
      packDots.forEach((p) => p.el.remove());
    };
  }, []);

  return (
    <section className="ga-agent-section" id="ga-agents">
      <div className="ga-agent-head">
        <SectionLabel index="06">System Visualization</SectionLabel>
        <h2 className="ga-display">
          The Agentic
          <br />
          System
        </h2>
        <p className="ga-sub">
          AI that can reason, use tools, remember context and execute multi-step tasks.
        </p>
      </div>

      <div className="ga-agent-system" ref={sceneRef} data-cursor="cta">
        <span className="ga-agent-arm" aria-hidden="true" />

        <svg className="ga-agent-lines" ref={svgRef} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <g className="ga-agent-line-flow">
            {LINKS.map((l) => (
              <path key={l.label} className="ga-agent-line-path" d={l.d} />
            ))}
          </g>
          <g className="ga-agent-ends">
            {LINKS.map((l) => (
              <circle key={`${l.label}-end`} className="ga-agent-end" cx={l.end.x.toFixed(2)} cy={l.end.y.toFixed(2)} r="0.3" />
            ))}
          </g>
          <g className="ga-agent-particles">
            {PARTICLES.map((p, i) => (
              <circle
                key={i}
                className={p.tone === "orange" ? "ga-agent-orange-particle" : "ga-agent-blue-particle"}
                cx={p.x}
                cy={p.y}
                r={p.r}
                opacity={p.o}
                style={{animationDuration: `${p.dur}s`, animationDelay: `${p.delay}s`}}
              />
            ))}
          </g>
          <g ref={packetLayerRef} className="ga-agent-packets" />
        </svg>

        <div className="ga-agent-center" data-cursor="cta">
          <span className="ga-agent-center-icon">
            <OrbitSVG />
          </span>
          <span className="ga-agent-center-title">AI AGENT</span>
          <span className="ga-agent-center-sub">reason · act · observe</span>
        </div>

        {agentSatellites.map((s) => {
          const pos = NODE_POS[s.label] || {x: 50, y: 50};
          return (
            <div
              className="ga-agent-node"
              key={s.label}
              style={{left: `${pos.x}%`, top: `${pos.y}%`, transform: `translate(-50%, -50%)`}}
              data-cursor
            >
              <s.icon className="ga-agent-node-icon" size={16} strokeWidth={1.6} aria-hidden="true" />
              <span>{s.label}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
};

const OrbitSVG = () => (
  <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
    <circle cx="12" cy="12" r="3" />
    <ellipse cx="12" cy="12" rx="10" ry="4.6" />
    <ellipse cx="12" cy="12" rx="10" ry="4.6" transform="rotate(60 12 12)" />
    <ellipse cx="12" cy="12" rx="10" ry="4.6" transform="rotate(120 12 12)" />
  </svg>
);

export default AgentSystem;