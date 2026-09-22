import {useEffect, useRef} from "react";
import {gsap} from "gsap";
import {addTween, reducedMotionNow} from "../fx/registry";

/* Catmull-Rom → cubic bezier, so the waypoints become a single silky curve. */
const buildSmoothPath = (points) => {
  if (points.length < 2) return "";
  let d = `M ${points[0][0]} ${points[0][1]}`;
  for (let i = 0; i < points.length - 1; i += 1) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2[0]} ${p2[1]}`;
  }
  return d;
};

const VIEW_W = 1440;

export const GlowTrail = () => {
  const svgRef = useRef(null);
  const pathRef = useRef(null);
  const coreRef = useRef(null);
  const dotRef = useRef(null);
  const haloRef = useRef(null);

  useEffect(() => {
    const svg = svgRef.current;
    const pathEl = pathRef.current;
    const coreEl = coreRef.current;
    const dot = dotRef.current;
    const halo = haloRef.current;
    if (!svg || !pathEl || !dot || !halo) return undefined;
    if (reducedMotionNow()) {
      svg.remove();
      return undefined;
    }

    let tween = null;

    const build = () => {
      if (typeof pathEl.getTotalLength !== "function") return;
      const H = Math.max(1, document.documentElement.scrollHeight);
      svg.setAttribute("viewBox", `0 0 ${VIEW_W} ${H}`);

      /* Waypoints weaving through major scenes (fractions of total height). */
      const stops = [
        [VIEW_W * 0.56, H * 0.055],
        [VIEW_W * 0.22, H * 0.155],
        [VIEW_W * 0.8, H * 0.265],
        [VIEW_W * 0.5, H * 0.335],
        [VIEW_W * 0.2, H * 0.44],
        [VIEW_W * 0.78, H * 0.535],
        [VIEW_W * 0.5, H * 0.605],
        [VIEW_W * 0.26, H * 0.715],
        [VIEW_W * 0.82, H * 0.795],
        [VIEW_W * 0.44, H * 0.855],
        [VIEW_W * 0.18, H * 0.915],
        [VIEW_W * 0.7, H * 0.975],
      ];
      const d = buildSmoothPath(stops);
      const len = Math.max(1, pathEl.getTotalLength());
      pathEl.setAttribute("d", d);
      coreEl.setAttribute("d", d);
      pathEl.style.strokeDasharray = `${len}`;
      pathEl.style.strokeDashoffset = `${len}`;
      coreEl.style.strokeDasharray = `${len}`;
      coreEl.style.strokeDashoffset = `${len}`;

      const proxy = {p: 0};

      const clear = tween;
      if (clear) {
        clear.scrollTrigger?.kill();
        clear.kill();
      }

      const apply = () => {
        const p = proxy.p;
        const offset = len * (1 - p);
        pathEl.style.strokeDashoffset = `${offset}`;
        coreEl.style.strokeDashoffset = `${offset}`;
        try {
          const pt = pathEl.getPointAtLength(len * p);
          const x = pt.x;
          const y = pt.y;
          dot.setAttribute("cx", x);
          dot.setAttribute("cy", y);
          halo.setAttribute("cx", x);
          halo.setAttribute("cy", y);
          const fade = 0.65 + 0.35 * Math.sin(p * Math.PI * 14);
          dot.setAttribute("opacity", `${0.6 + 0.4 * fade}`);
        } catch {
          /* path not yet laid out */
        }
      };

      tween = gsap.to(proxy, {
        p: 1,
        ease: "none",
        scrollTrigger: {
          start: 0,
          end: "max",
          scrub: 0.9,
          onUpdate: apply,
        },
        onUpdate: apply,
      });
      addTween(tween);
    };

    build();
    const onResize = () => build();
    window.addEventListener("resize", onResize);
    const ro = new ResizeObserver(onResize);
    ro.observe(document.documentElement);

    return () => {
      window.removeEventListener("resize", onResize);
      ro.disconnect();
      if (tween) {
        tween.scrollTrigger?.kill();
        tween.kill();
      }
    };
  }, []);

  return (
    <div className="ga-trail" aria-hidden="true">
      <svg
        ref={svgRef}
        className="ga-trail-svg"
        preserveAspectRatio="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="ga-trail-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f2c878" stopOpacity="0.9" />
            <stop offset="45%" stopColor="#d9a441" stopOpacity="0.75" />
            <stop offset="100%" stopColor="#f07c3a" stopOpacity="0.6" />
          </linearGradient>
          <radialGradient id="ga-trail-halo">
            <stop offset="0%" stopColor="#f0a93f" stopOpacity="0.75" />
            <stop offset="40%" stopColor="#f07c3a" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#f07c3a" stopOpacity="0" />
          </radialGradient>
          <filter id="ga-trail-blur" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="7" />
          </filter>
        </defs>

        <path ref={pathRef} className="ga-trail-path" d="" />
        <path ref={coreRef} className="ga-trail-core" d="" />

        <circle ref={haloRef} className="ga-trail-halo" r="34" fill="url(#ga-trail-halo)" />
        <circle ref={dotRef} className="ga-trail-dot" r="3.1" fill="#efddad" filter="url(#ga-trail-blur)" />
      </svg>
    </div>
  );
};