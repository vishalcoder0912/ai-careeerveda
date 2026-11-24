import {useEffect, useMemo, useRef} from "react";
import {reducedMotionNow} from "../fx/registry";
import {Lines, useCinematic} from "../content";
import {SectionLabel} from "./Atmosphere";

const CX = 50;
const CY = 50;
const END_INSET = 4.2;


const HUB_R = 9.5;

const rimPoint = (ux, uy) => {
  const t = 1 / Math.hypot(ux, uy);
  return {x: CX + ux * t * HUB_R, y: CY + uy * t * HUB_R};
};

const NODE_POS = [
  {x: 50, y: 9},
  {x: 20, y: 22},
  {x: 80, y: 22},
  {x: 13, y: 43},
  {x: 87, y: 43},
  {x: 18, y: 64},
  {x: 82, y: 64},
  {x: 30, y: 81},
  {x: 70, y: 81},
  {x: 50, y: 93},
];


const nodePos = (i) => NODE_POS[i] || {x: 50, y: 50};


const MOBILE_R = 38;

const mobilePoint = (i, total) => {
  const angle = Math.PI / 2 - (i * 2 * Math.PI) / total;
  return {
    x: CX + MOBILE_R * Math.cos(angle),
    y: CY - MOBILE_R * Math.sin(angle),
  };
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

const buildLinks = (satellites, posFn = nodePos) =>
  satellites.map((s, i) => {
    const {x, y} = posFn(i, satellites.length);
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
  const {system} = useCinematic();
  const agentSatellites = system.nodes;
  const LINKS = useMemo(() => buildLinks(agentSatellites), [agentSatellites]);
  const MOBILE_LINKS = useMemo(() => buildLinks(agentSatellites, mobilePoint), [agentSatellites]);
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

    /* Animate only the desktop paths — the mobile paths are their own group. */
    const lines = Array.from(svg.querySelectorAll(".ga-agent-line-flow--desktop .ga-agent-line-path"));
    const DOTS = 5;
    const packDots = Array.from({length: DOTS}, (_, k) => {
      const c = document.createElementNS(svg.namespaceURI, "circle");
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
  }, [LINKS]);

  return (
    <section className="ga-agent-section" id="ga-agents">
      <div className="ga-agent-head">
        <SectionLabel index="06">{system.label}</SectionLabel>
        <h2 className="ga-display">
          <Lines lines={system.title} />
        </h2>
        <p className="ga-sub">{system.sub}</p>
      </div>

      <div className="ga-agent-system" ref={sceneRef} data-cursor="cta">
        <span className="ga-agent-arm" aria-hidden="true" />

        <svg className="ga-agent-lines" ref={svgRef} viewBox="0 0 100 100" aria-hidden="true">
          <g className="ga-agent-line-flow ga-agent-line-flow--desktop">
            {LINKS.map((l) => (
              <path key={l.label} className="ga-agent-line-path" d={l.d} />
            ))}
          </g>
          <g className="ga-agent-ends ga-agent-ends--desktop">
            {LINKS.map((l) => (
              <circle key={`${l.label}-end`} className="ga-agent-end" cx={l.end.x.toFixed(2)} cy={l.end.y.toFixed(2)} r="0.3" />
            ))}
          </g>
          {/* Phones use the tighter ring, so the connectors need their own endpoints. */}
          <g className="ga-agent-line-flow ga-agent-line-flow--mobile">
            {MOBILE_LINKS.map((l) => (
              <path key={l.label} className="ga-agent-line-path" d={l.d} />
            ))}
          </g>
          <g className="ga-agent-ends ga-agent-ends--mobile">
            {MOBILE_LINKS.map((l) => (
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
          <span className="ga-agent-center-title">{system.center.title}</span>
          <span className="ga-agent-center-sub">{system.center.sub}</span>
        </div>

        <div className="ga-agent-nodes">
          {agentSatellites.map((s, i) => {
            const pos = nodePos(i);
            const mp = mobilePoint(i, agentSatellites.length);
            return (
              <div
                className="ga-agent-node"
                key={s.label}
                style={{
                  "--nx": `${pos.x}%`,
                  "--ny": `${pos.y}%`,
                  "--nxm": `${mp.x.toFixed(2)}%`,
                  "--nym": `${mp.y.toFixed(2)}%`,
                }}
                data-cursor
              >
                <img className="ga-agent-node-art" src={s.img} alt="" width="40" height="40" loading="lazy" />
                <span>{s.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default AgentSystem;