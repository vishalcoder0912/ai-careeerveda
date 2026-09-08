import {useCallback, useLayoutEffect, useRef, useState} from "react";
import {Reveal} from "./motionPrimitives";
import {useLenis} from "../lib/smoothScroll";
import {pressArticles, pressLogos, pressOutlets} from "../data/pressArticles";
import {cdnImage} from "../lib/imageCdn";
import "./press-section.css";

// A logo chip is 76x18 at most. Press logos tend to arrive as whatever the outlet
// sends — often a full-resolution PNG — so an ImageKit URL pasted into pressLogos
// is resized on the way out rather than shipping a 200 KB masthead to paint a
// thumbnail. Non-ImageKit URLs (a local /press/*.png) pass through untouched.
const LOGO_WIDTH = 160;

// The story artwork in the card's top-right corner. It renders at ~300px wide at
// most, so 600 covers it on a retina screen.
const CARD_IMAGE_WIDTH = 600;

// One outlet chip, used by both the per-story "Featured in" row and the closing
// media wall — so a logo added to pressLogos appears in both without being wired
// up twice.
//
// The logo is optional and self-healing: an outlet with no logo renders as its
// name alone, and a logo whose URL 404s is dropped on error rather than left as
// a browser's broken-image icon. Either way the name is still there, so the chip
// can never degrade into an empty box.
const OutletChip = ({source}) => {
  const [logoFailed, setLogoFailed] = useState(false);
  const logo = pressLogos[source.name];
  const showLogo = Boolean(logo) && !logoFailed;

  return (
    <a
      className={showLogo ? "has-logo" : undefined}
      href={source.url}
      target="_blank"
      rel="noopener noreferrer"
    >
      {showLogo ? (
        // Logo only — the masthead is the recognisable thing, and setting the name
        // beside it just repeats what the logo already says. The name moves into
        // `alt`, so it is still what a screen reader announces and still what shows
        // if the image fails to load.
        <img
          className="press-logo"
          src={cdnImage(logo, LOGO_WIDTH)}
          alt={source.name}
          width={LOGO_WIDTH}
          height={36}
          loading="lazy"
          decoding="async"
          onError={() => setLogoFailed(true)}
        />
      ) : (
        source.name
      )}
    </a>
  );
};

// A stack card sits inside a SLOT. The slot owns the document height — real
// layout height of `card height + pin hold` — while the card itself does the
// `position: sticky` pinning. Separating the two is what keeps the whole stack
// in the press section's normal document flow: a sticky card can never stray
// outside its slot, and a slot can never stray outside the section, so no card
// can paint below the section into the Consultation area, no matter how fast
// the scroll. The slot is fed `--card-h` at runtime here — stories vary in
// height and images/fonts settle late — and press-section.css turns it into
// layout height.
const PressCardSlot = ({children, className = ""}) => {
  const ref = useRef(null);

  useLayoutEffect(() => {
    const wrapper = ref.current;
    if (!wrapper) return undefined;
    const card = wrapper.firstElementChild;
    if (!card) return undefined;

    const setHeight = () => {
      wrapper.style.setProperty("--card-h", `${Math.round(card.getBoundingClientRect().height)}px`);
    };
    setHeight();

    const resizeObserver = new ResizeObserver(setHeight);
    resizeObserver.observe(card);
    if (document.fonts?.ready) document.fonts.ready.then(setHeight).catch(() => {});
    return () => resizeObserver.disconnect();
  }, []);

  return (
    <div ref={ref} className={`press-card-slot ${className}`.trim()}>
      {children}
    </div>
  );
};

// The depth cue for the deck. CSS owns the mechanics (sticky pinning); this
// only nudges each card's `--stack-scale` / `--stack-y`, the two variables the
// card's transform is written in terms of. It never touches position and never
// computes a page coordinate — progress is read from *sibling* offsets
// (this card's bottom vs. the next card's top), which is pure paint-space
// geometry and stays correct no matter which scroll container is in charge.
//
// Progress for card i = how far the next card has risen over its bottom,
// normalised across one cover window (half the card's height), clamped 0→1. So
// as "CARD 2" approaches it visibly scales down to 0.97 and rises the tiny
// -4px, the deck reads layered, and the final card (nothing left to cover it)
// stays at full size. Transform stays tiny on purpose — the stack reads clean
// rather than animated.
const PressStackTweaks = ({stackRef}) => {
  const sharedLenis = useLenis();
  const rafRef = useRef(0);
  const travelRef = useRef([]);

  const measure = useCallback(() => {
    const root = stackRef.current;
    if (!root) return;
    travelRef.current = Array.from(root.querySelectorAll(".press-card-slot .press-card")).map((card) =>
      Math.max(120, card.getBoundingClientRect().height * 0.5)
    );
  }, [stackRef]);

  const update = useCallback(() => {
    const root = stackRef.current;
    const cards = root?.querySelectorAll(".press-card-slot .press-card");
    if (!cards || !cards.length) return;

    const tops = Array.from(cards, (card) => card.getBoundingClientRect().top);
    const bottoms = Array.from(cards, (card) => card.getBoundingClientRect().bottom);

    for (let i = 0; i < cards.length; i += 1) {
      const progress =
        i < cards.length - 1
          ? Math.min(1, Math.max(0, (bottoms[i] - tops[i + 1]) / (travelRef.current[i] || 240)))
          : 0;
      const scale = 1 - progress * 0.03;
      const y = -progress * 4;
      cards[i].style.setProperty("--stack-scale", scale.toFixed(3));
      cards[i].style.setProperty("--stack-y", `${y.toFixed(1)}px`);
    }
  }, [stackRef]);

  const schedule = useCallback(() => {
    if (rafRef.current) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = 0;
      update();
    });
  }, [update]);

  useLayoutEffect(() => {
    const root = stackRef.current;
    if (!root) return undefined;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;

    measure();
    update();

    // Layout can change (resize, font swap, images settling) independently of
    // scroll; re-measure there. Scroll only re-applies the transforms.
    let remeasureFrame = 0;
    const scheduleRemeasure = () => {
      if (remeasureFrame) return;
      remeasureFrame = requestAnimationFrame(() => {
        remeasureFrame = 0;
        measure();
        update();
      });
    };

    // The app already runs one Lenis (SmoothScrollProvider, at the root); ask
    // it for the scroll signal rather than constructing a rival smooth-scroller.
    // sharedLenis is null when smooth scrolling is off, and the native listener
    // covers that path — both fire the same rAF-batched update.
    if (sharedLenis) sharedLenis.on("scroll", schedule);
    window.addEventListener("scroll", schedule, {passive: true});
    window.addEventListener("resize", scheduleRemeasure);

    const resizeObserver = new ResizeObserver(scheduleRemeasure);
    root.querySelectorAll(".press-card-slot, .press-card-slot .press-card").forEach((element) => {
      resizeObserver.observe(element);
    });
    if (document.fonts?.ready) document.fonts.ready.then(scheduleRemeasure).catch(() => {});

    return () => {
      if (sharedLenis) sharedLenis.off("scroll", schedule);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", scheduleRemeasure);
      resizeObserver.disconnect();
      if (remeasureFrame) cancelAnimationFrame(remeasureFrame);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      travelRef.current = [];
    };
  }, [measure, update, schedule, sharedLenis, stackRef]);

  return null;
};

const PressSection = () => {
  const stackRef = useRef(null);

  return (
    <section id="press" className="press-section">
      <Reveal className="press-section-heading">
        <span className="label">Media Coverage</span>
        <h2>CareerVeda in the News</h2>
        <p>
          Featured across India's leading publications for placement outcomes and
          upskilling excellence.
        </p>
      </Reveal>

      <div className="press-stack" ref={stackRef}>
        <div className="press-stack-inner">
          {pressArticles.map((article) => (
            <PressCardSlot key={article.id}>
              <article className="press-card">
                {/* Head is a two-column grid: the story on the left, its artwork in
                    the top-right. An article with no `image` keeps the whole width,
                    so the layout does not depend on every story having one. */}
                <div className={`press-card-head${article.image ? " has-media" : ""}`}>
                  <div className="press-card-copy">
                    <span className="press-eyebrow">
                      <span className="press-tag">{article.tag}</span>
                      {article.date}
                    </span>
                    <h3>{article.title}</h3>
                    <p className="press-excerpt">{article.excerpt}</p>
                  </div>

                  {article.image && (
                    <div className="press-card-media">
                      <img
                        src={cdnImage(article.image, CARD_IMAGE_WIDTH)}
                        alt=""
                        width={CARD_IMAGE_WIDTH}
                        height={Math.round(CARD_IMAGE_WIDTH * 0.75)}
                        loading="lazy"
                        decoding="async"
                        draggable="false"
                        // A dead URL would leave an empty framed box in the corner
                        // of the card, so remove the frame and let the story run
                        // full width.
                        onError={(event) => {
                          event.currentTarget.parentElement?.remove();
                        }}
                      />
                    </div>
                  )}
                </div>

                {article.stats && (
                  <div className="press-stat-row">
                    {article.stats.map(([value, label]) => (
                      <div className="press-stat" key={label}>
                        <strong>{value}</strong>
                        <span>{label}</span>
                      </div>
                    ))}
                  </div>
                )}

                {article.highlights && (
                  <div className="press-highlights">
                    {article.highlights.map((point) => (
                      <span key={point}>{point}</span>
                    ))}
                  </div>
                )}

                <div className="press-sources">
                  <small>Featured in</small>
                  {article.sources.map((source) => (
                    <OutletChip key={source.name} source={source} />
                  ))}
                </div>
              </article>
            </PressCardSlot>
          ))}

          {/* Closing card in the stack: the long tail of outlets as a wall of
              names rather than one card each. It is the final card — it pins,
              holds briefly, then releases and the section hands off to the
              Consultation section. */}
          <PressCardSlot className="press-card-wall" key="press-wall">
            <article className="press-card press-card--wall">
              <span className="press-eyebrow">
                <span className="press-tag">Coverage</span>
                Across India
              </span>
              <h3>Featured across India&apos;s media</h3>
              <p className="press-excerpt">
                CareerVeda&apos;s placement milestones and upskilling programs have been
                covered by publications nationwide.
              </p>
              <div className="press-wall-grid">
                {pressOutlets.map((source) => (
                  <OutletChip key={source.name} source={source} />
                ))}
              </div>
            </article>
          </PressCardSlot>
        </div>
      </div>

      <PressStackTweaks stackRef={stackRef} />
    </section>
  );
};

export default PressSection;