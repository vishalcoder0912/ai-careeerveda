import {useCallback, useEffect, useState} from "react";
import {useLenis} from "../lib/smoothScroll";

/**
 * "Back to top" floating button.
 *
 * Stays hidden until the visitor has scrolled past 300px, then sits fixed at
 * the bottom-left so it never collides with the WhatsApp button (bottom-right).
 *
 * Scrolls through Lenis when it drives the page, and falls back to a native
 * scrollTo otherwise — so it keeps working with reduced motion (Lenis is off)
 * and before the smooth-scroll chunk has finished attaching.
 */
const BackToTop = () => {
  const lenis = useLenis();
  const [visible, setVisible] = useState(false);

  const scrollToTop = useCallback(() => {
    if (lenis) {
      lenis.scrollTo(0, {force: true});
    } else {
      window.scrollTo({top: 0, left: 0, behavior: "smooth"});
    }
  }, [lenis]);

  useEffect(() => {
    let frame = null;
    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        setVisible(window.scrollY > 300);
        frame = null;
      });
    };
    window.addEventListener("scroll", onScroll, {passive: true});
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  if (!visible) return null;

  return (
    <button
      type="button"
      className="pd-back-to-top"
      aria-label="Back to top"
      title="Back to top"
      onClick={scrollToTop}
    >
      <svg
        className="pd-back-to-top__arrow"
        viewBox="0 0 24 24"
        aria-hidden="true"
        focusable="false"
      >
        <path d="M12 4 8 8 16 8z" />
      </svg>
    </button>
  );
};

export default BackToTop;
