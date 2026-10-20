import {useEffect, useRef} from "react";
import {reducedMotionNow} from "../fx/registry";
import {agentSatellites, agentCenterArt} from "../data";
import {SectionLabel} from "./Atmosphere";

const CX = 50;
const CY = 50;
const END_INSET = 4.2;

/* The canvas is a 1:1 square, so the hub's 100x100 SVG space is uniform and the
   central node maps to a true circle. These are the rim radii in SVG units
   (the hub is ~160px wide inside an ~820px square), so connectors start at its
   edge on every axis. */
const HUB_R = 9.8;

const rimPoint = (ux, uy) => {
  const t = 1 / Math.hypot(ux, uy);
  return {x: CX + ux * t * HUB_R, y: CY + uy * t * HUB_R};
};

/* Radial anchors across the 1:1 square. Kept mirrored left/right for symmetry
   and spaced to use ~10-88% of the canvas so nodes never crowd the hub or
   touch the edges. */
const NODE_POS = {
  USER: {x: 50, y: 10},
  SECURITY: {x: 19, y: 22},
  LLM: {x: 81, y: 22},
  EVAL: {x: 11, y: 42},
  MEMORY: {x: 89, y: 42},
  "MULTI-AGENT": {x: 16, y: 63},
  TOOLS: {x: 84, y: 63},
  GPU: {x: 32, y: 82},
  RAG: {x: 68, y: 82},
  API: {x: 50, y: 88},
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

        <svg className="ga-agent-lines" ref={svgRef} viewBox="0 0 100 100" aria-hidden="true">
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
          <img className="ga-agent-center-art" src={agentCenterArt} alt="" width="48" height="48" />
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
              <img className="ga-agent-node-art" src={s.img} alt="" width="40" height="40" loading="lazy" />
              <span>{s.label}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default AgentSystem;