import {useState, useEffect, useMemo} from "react";

const PARTICLES = [
  {x: 22, y: 14, size: 2, delay: 0},
  {x: 38, y: 20, size: 1, delay: 1.2},
  {x: 56, y: 12, size: 2.5, delay: 0.6},
  {x: 72, y: 26, size: 1, delay: 2.1},
  {x: 28, y: 34, size: 1.5, delay: 3.4},
  {x: 48, y: 30, size: 2, delay: 1.8},
  {x: 82, y: 16, size: 1, delay: 0.3},
  {x: 38, y: 26, size: 1.5, delay: 2.8},
  {x: 64, y: 22, size: 2, delay: 4.1},
  {x: 18, y: 24, size: 1, delay: 1.5},
  {x: 78, y: 30, size: 2, delay: 3.2},
  {x: 44, y: 16, size: 1.5, delay: 0.9},
  {x: 60, y: 38, size: 1, delay: 2.5},
  {x: 30, y: 42, size: 2, delay: 4.5},
  {x: 88, y: 24, size: 1, delay: 1.1},
  {x: 52, y: 8, size: 1.5, delay: 3.8},
  {x: 36, y: 32, size: 2, delay: 0.4},
  {x: 70, y: 34, size: 1, delay: 2.3},
  {x: 24, y: 28, size: 1.5, delay: 4.2},
  {x: 76, y: 14, size: 2, delay: 1.7},
  {x: 46, y: 40, size: 1, delay: 3.6},
  {x: 14, y: 36, size: 1.5, delay: 0.8},
  {x: 62, y: 20, size: 2, delay: 2.9},
  {x: 86, y: 34, size: 1, delay: 4.0},
  {x: 32, y: 10, size: 1.5, delay: 1.4},
  {x: 66, y: 28, size: 2.5, delay: 3.1},
  {x: 42, y: 44, size: 1, delay: 0.2},
  {x: 54, y: 24, size: 1.5, delay: 2.6},
  {x: 90, y: 20, size: 1, delay: 1.9},
  {x: 20, y: 40, size: 2, delay: 4.3},
  {x: 74, y: 8, size: 1, delay: 3.5},
  {x: 58, y: 18, size: 1.5, delay: 0.7},
];

const MOBILE_PARTICLES = [
  {x: 22, y: 16, size: 1.5, delay: 0},
  {x: 55, y: 24, size: 1, delay: 1.2},
  {x: 80, y: 12, size: 2, delay: 0.6},
  {x: 36, y: 40, size: 1, delay: 2.1},
  {x: 66, y: 34, size: 1.5, delay: 1.8},
  {x: 16, y: 44, size: 1, delay: 3.4},
  {x: 50, y: 44, size: 1.5, delay: 0.3},
  {x: 75, y: 26, size: 1, delay: 2.8},
  {x: 42, y: 20, size: 1.5, delay: 1.1},
  {x: 62, y: 40, size: 1, delay: 3.8},
  {x: 28, y: 30, size: 1.5, delay: 0.9},
  {x: 85, y: 34, size: 1, delay: 2.5},
  {x: 12, y: 36, size: 1.5, delay: 4.1},
  {x: 48, y: 12, size: 1, delay: 1.5},
  {x: 70, y: 46, size: 1.5, delay: 3.2},
  {x: 32, y: 12, size: 1, delay: 0.5},
];

const ParticleField = ({className, count}) => {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined" && window.matchMedia("(max-width: 900px)").matches
  );

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 900px)");
    const handler = (e) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const particles = useMemo(() => {
    const source = isMobile ? MOBILE_PARTICLES : PARTICLES;
    return source.slice(0, count || (isMobile ? 14 : 32));
  }, [isMobile, count]);

  return (
    <div className={`cv-particle-field ${className || ""}`} aria-hidden="true">
      {particles.map((p, i) => (
        <span
          key={i}
          className="cv-particle"
          style={{
            "--px": `${p.x}%`,
            "--py": `${p.y}%`,
            "--ps": `${p.size}px`,
            "--pd": `${p.delay}s`,
          }}
        />
      ))}
    </div>
  );
};

export default ParticleField;
