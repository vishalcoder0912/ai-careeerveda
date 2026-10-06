import {useEffect, useRef} from "react";

// ClickSpark — React Bits (https://reactbits.dev). Lines burst out from every
// tap. Mounted by GenerativeAIPage on phones and tablets only.
//
// One change from upstream: instead of wrapping the page in a div and sizing
// the canvas to it, the canvas is a fixed, pointer-events:none overlay that
// listens on window — so the page's DOM and layout are untouched. The spark
// maths and timing are upstream.
const easeOut = (t) => t * (2 - t);

export function ClickSpark({
  sparkColor = "#7b8cff",
  sparkSize = 10,
  sparkRadius = 18,
  sparkCount = 8,
  duration = 420,
}) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const sparks = [];
    let raf = 0;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const draw = (now) => {
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i];
        const elapsed = now - s.start;
        if (elapsed >= duration) {
          sparks.splice(i, 1);
          continue;
        }
        const eased = easeOut(elapsed / duration);
        const distance = eased * sparkRadius;
        const length = sparkSize * (1 - eased);
        const x1 = s.x + distance * Math.cos(s.angle);
        const y1 = s.y + distance * Math.sin(s.angle);
        const x2 = s.x + (distance + length) * Math.cos(s.angle);
        const y2 = s.y + (distance + length) * Math.sin(s.angle);
        ctx.strokeStyle = sparkColor;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }
      // Idle when nothing is in flight — no permanent rAF loop on a phone.
      raf = sparks.length ? requestAnimationFrame(draw) : 0;
    };

    const onTap = (e) => {
      const start = performance.now();
      for (let i = 0; i < sparkCount; i++) {
        sparks.push({x: e.clientX, y: e.clientY, angle: (2 * Math.PI * i) / sparkCount, start});
      }
      if (!raf) raf = requestAnimationFrame(draw);
    };

    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("pointerdown", onTap, {passive: true});
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointerdown", onTap);
    };
  }, [sparkColor, sparkSize, sparkRadius, sparkCount, duration]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{position: "fixed", inset: 0, width: "100vw", height: "100vh", pointerEvents: "none", zIndex: 9999}}
    />
  );
}
