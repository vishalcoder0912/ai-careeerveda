import {useEffect, useRef} from "react";
import {reducedMotionNow} from "../fx/registry";
import {agentSatellites} from "../data";
import {SectionLabel} from "./Atmosphere";

/* Quadratic bezier: P0 center → C control → P1 node. Gives each connection a
   gentle orbital curve instead of a hard straight line. */
const curveTo = (x0, y0, cxp, cyp, x1, y1) =>
  `M ${x0} ${y0} Q ${cxp} ${cyp} ${x1} ${y1}`;

const pointOn = (t, x0, y0, cxp, cyp, x1, y1) => {
  const u = 1 - t;
  return {
    x: u * u * x0 + 2 * u * t * cxp + t * t * x1,
    y: u * u * y0 + 2 * u * t * cyp + t * t * y1,
  };
};

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
    const cx = 50;
    const cy = 50;
    const R = 38;
    const n = agentSatellites.length;
    const coords = agentSatellites.map((_, i) => {
      const a = (-Math.PI / 2) + (i / n) * Math.PI * 2;
      const x = cx + Math.cos(a) * R;
      const y = cy + Math.sin(a) * R;
      const cur = 12 + 8 * Math.abs(Math.sin(i * 1.7));
      const px = -Math.sin(a) * cur;
      const py = Math.cos(a) * cur;
      return {x, y, cxp: cx + px, cyp: cy + py};
    });

    /* Curved connection paths */
    lines.forEach((line, i) => {
      const {x, y, cxp, cyp} = coords[i];
      line.setAttribute("d", curveTo(cx, cy, cxp, cyp, x, y));
    });

    /* Traveling packets */
    const DOTS = 5;
    const packDots = Array.from({length: DOTS}, (_, k) => {
      const c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      c.setAttribute("r", "1.4");
      c.setAttribute("class", "ga-agent-packet");
      c.setAttribute("opacity", "0");
      packets.appendChild(c);
      const lineIdx = k % lines.length;
      return {el: c, line: lineIdx, t: k / DOTS, speed: 0.004 + Math.random() * 0.003, active: k < DOTS - 1};
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
          const idx = (p.line + 1) % lines.length;
          p.line = idx;
        }
        const {x, y, cxp, cyp} = coords[p.line];
        const pt = pointOn(p.t, cx, cy, cxp, cyp, x, y);
        p.el.setAttribute("cx", pt.x.toFixed(2));
        p.el.setAttribute("cy", pt.y.toFixed(2));
        const pulse = 0.35 + 0.65 * Math.sin(p.t * Math.PI);
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
        <SectionLabel index="05">System Visualization</SectionLabel>
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
        <svg className="ga-agent-lines" ref={svgRef} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <g className="ga-agent-line-flow">
            {agentSatellites.map((_, i) => (
              <path key={i} className="ga-agent-line-path" d="" />
            ))}
          </g>
          <g className="ga-agent-line-soft">
            {agentSatellites.map((_, i) => (
              <path key={i} className="ga-agent-line-soft-path" d="" />
            ))}
          </g>
          <g ref={packetLayerRef} className="ga-agent-packets" />
        </svg>

        <span className="ga-agent-ring ga-agent-ring-1" aria-hidden="true" />
        <span className="ga-agent-ring ga-agent-ring-2" aria-hidden="true" />

        <div className="ga-agent-center" data-cursor="cta">
          <span className="ga-agent-center-icon">
            <OrbitSVG />
          </span>
          <span className="ga-agent-center-title">AI AGENT</span>
          <span className="ga-agent-center-sub">reason · act · observe</span>
        </div>

        {agentSatellites.map((s, i) => {
          const a = (-Math.PI / 2) + (i / agentSatellites.length) * Math.PI * 2;
          const x = 50 + Math.cos(a) * 38;
          const y = 50 + Math.sin(a) * 38;
          return (
            <div
              className="ga-agent-node"
              key={s.label}
              style={{left: `${x}%`, top: `${y}%`, transform: `translate(-50%, -50%)`}}
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