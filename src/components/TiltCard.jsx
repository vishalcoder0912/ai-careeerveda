import {useRef, useState} from "react";
import "./tilt-card.css";

/* Pointer-driven 3D tilt.

   A single div that maps the cursor's offset from the card's centre to two CSS
   custom properties which its transform then reads: rotateX / rotateY from the
   cursor position plus a small scale. Disabled entirely for coarse pointers and
   reduced motion — tilt is decoration, so the information (and the card) must
   never be gated behind it. The class toggle only shortens the transition while
   the cursor is moving; entering and leaving still settle smoothly. */

const TiltCard = ({
  as: Tag = "div",
  className = "",
  children,
  max = 6,
  scale = 1.035,
  ...rest
}) => {
  const ref = useRef(null);
  const [active, setActive] = useState(false);

  const supported =
    typeof window !== "undefined" &&
    Boolean(window.matchMedia) &&
    window.matchMedia("(pointer: fine)").matches &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const onMove = (event) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = (event.clientX - rect.left) / rect.width - 0.5;
    const py = (event.clientY - rect.top) / rect.height - 0.5;
    el.style.setProperty("--tilt-rx", `${(-py * max).toFixed(2)}deg`);
    el.style.setProperty("--tilt-ry", `${(px * max).toFixed(2)}deg`);
  };

  const onEnter = () => setActive(true);

  const onLeave = () => {
    const el = ref.current;
    if (el) {
      el.style.setProperty("--tilt-rx", "0deg");
      el.style.setProperty("--tilt-ry", "0deg");
    }
    setActive(false);
  };

  const handlers = supported
    ? {
        onMouseMove: onMove,
        onMouseEnter: onEnter,
        onMouseLeave: onLeave,
      }
    : {};

  return (
    <Tag
      ref={ref}
      className={`tilt-card${active ? " tilt-card--active" : ""}${className ? ` ${className}` : ""}`}
      style={{"--tilt-scale": scale}}
      {...handlers}
      {...rest}
    >
      {children}
    </Tag>
  );
};

export default TiltCard;