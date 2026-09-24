import {useEffect, useRef} from "react";
import {gsap} from "gsap";
import {reducedMotionNow} from "../fx/registry";

const QUOTE_LINES = ["GOOD IDEAS", "BECOME SYSTEMS.", "GOOD SYSTEMS", "BECOME IMPACT."];

export const AIQuote = () => {
  const sectionRef = useRef(null);
  const wordRefs = useRef([]);
  const tweenRef = useRef(null);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return undefined;
    if (reducedMotionNow()) return undefined;

    const words = wordRefs.current.filter(Boolean);
    gsap.set(words, {opacity: 0});

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: section,
        start: "top 80%",
        end: "bottom 30%",
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
        {QUOTE_LINES.map((line) => (
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
        <cite className="ga-quote-cite">— the operator’s credo</cite>
      </blockquote>
    </section>
  );
};

export default AIQuote;