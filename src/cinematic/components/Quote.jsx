import {useEffect, useRef} from "react";
import {gsap} from "gsap";
import {reducedMotionNow} from "../fx/registry";
import {useCinematic} from "../content";

export const AIQuote = () => {
  const {quote} = useCinematic();
  const sectionRef = useRef(null);
  const wordRefs = useRef([]);
  const tweenRef = useRef(null);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return undefined;
    if (reducedMotionNow()) return undefined;

    const words = wordRefs.current.filter(Boolean);
    gsap.set(words, {opacity: 0});

    // Below 900px the credo is sized to its text (~420px), so the desktop range
    // spread the fade over the whole pass and the words only reached full
    // strength once scrolled to the top. Finish by the time it is centred.
    const compact = window.matchMedia("(max-width: 899px)").matches;
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: section,
        start: compact ? "top 90%" : "top 80%",
        end: compact ? "center 55%" : "bottom 30%",
        scrub: 0.6,
      },
    });
    words.forEach((w, i) => {
      tl.to(w, {opacity: 1, duration: 0.6, ease: "none"}, i * 0.045);
    });

    tweenRef.current = tl;
    return () => {
      tl.scrollTrigger?.kill();
      tl.kill();
    };
  }, []);

  return (
    <section className="ga-quote" ref={sectionRef}>
      <span className="ga-quote-glow" aria-hidden="true" />
      <span className="ga-quote-index" aria-hidden="true">03</span>

      <blockquote className="ga-quote-text">
        {quote.lines.map((line) => (
          <span className="ga-quote-line" key={line}>
            {line.split(" ").map((word, wi) => (
              <span
                className="ga-quote-word"
                key={`${line}-${wi}`}
                ref={(el) => {
                  if (el) wordRefs.current.push(el);
                }}
              >
                {word}
              </span>
            ))}
          </span>
        ))}
        <cite className="ga-quote-cite">{quote.cite}</cite>
      </blockquote>
    </section>
  );
};

export default AIQuote;