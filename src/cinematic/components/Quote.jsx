import {useEffect, useRef} from "react";
import {gsap} from "gsap";
import {useCinematic} from "../content";

const MQ_COMPACT = "(max-width: 899px) and (prefers-reduced-motion: no-preference)";
const MQ_DESKTOP = "(min-width: 900px) and (prefers-reduced-motion: no-preference)";

export const AIQuote = () => {
  const {quote} = useCinematic();
  const sectionRef = useRef(null);
  const tweenRef = useRef(null);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return undefined;

    // Query the DOM instead of caching ref callbacks: a content update replaces
    // the word nodes, and pushed refs would leave the timeline animating stale
    // elements that are no longer in the document.
    const words = Array.from(section.querySelectorAll(".ga-quote-word"));
    const mm = gsap.matchMedia();

    // Below 900px the credo is sized to its text (~420px), so the desktop range
    // spread the fade over the whole pass and the words only reached full
    // strength once scrolled to the top. Finish by the time it is centred.
    const build = (compact) => {
      gsap.set(words, {opacity: 0});
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
        // Reduced motion / breakpoint exit must never leave a word at opacity 0.
        words.forEach((w) => w.style.removeProperty("opacity"));
        if (tweenRef.current === tl) tweenRef.current = null;
      };
    };

    mm.add(MQ_COMPACT, () => build(true));
    mm.add(MQ_DESKTOP, () => build(false));

    return () => mm.revert();
  }, []);

  return (
    <section className="ga-quote" ref={sectionRef}>
      <span className="ga-quote-glow" aria-hidden="true" />
      <span className="ga-quote-index" aria-hidden="true">03</span>

      <blockquote className="ga-quote-text">
        {quote.lines.map((line) => (
          <span className="ga-quote-line" key={line}>
            {line.split(" ").map((word, wi) => (
              <span className="ga-quote-word" key={`${line}-${wi}`}>
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