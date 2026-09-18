import {memo, useLayoutEffect, useRef, useState} from "react";
import {motion, useMotionValueEvent, useReducedMotion, useScroll, useTransform} from "framer-motion";
import {Reveal} from "./motionPrimitives";
import {pressArticles, pressLogos, pressOutlets} from "../data/pressArticles";
import {cdnImage} from "../lib/imageCdn";
import "./press-section.css";

// The shorthand for a story's accent tokens. Used for the card surfaces, the
// grid highlight behind the active story, and the progress rail's active dot.
const ACCENTS = {
  placement: {
    main: "#2563eb",
    deep: "#1d4ed8",
    soft: "rgba(37, 99, 235, 0.07)",
    glow: "rgba(37, 99, 235, 0.11)",
  },
  recognition: {
    main: "#0f9f8f",
    deep: "#0e8074",
    soft: "rgba(15, 159, 143, 0.08)",
    glow: "rgba(15, 159, 143, 0.12)",
  },
  coverage: {
    main: "#7c3aed",
    deep: "#6d28d9",
    soft: "rgba(124, 58, 237, 0.07)",
    glow: "rgba(124, 58, 237, 0.11)",
  },
};

// The closing "Coverage" chapter has no article record of its own — it is the
// long tail of outlets as a media wall, the same card the old section used.
const COVERAGE_STORY = {
  outlets: pressOutlets,
};

// Three chapters = three stops on the timeline. Recognized placement milestone,
// then the recognition story, then the media wall. Order matters: the pitch is
// PLACEMENT SUCCESS → RECOGNITION → MEDIA COVERAGE.
const stories = [
  {
    id: pressArticles[0].id,
    kind: "story",
    accentClass: "placement",
    accent: ACCENTS.placement,
    article: pressArticles[0],
  },
  {
    id: pressArticles[1].id,
    kind: "story",
    accentClass: "recognition",
    accent: ACCENTS.recognition,
    article: pressArticles[1],
  },
  {
    id: "coverage",
    kind: "wall",
    accentClass: "coverage",
    accent: ACCENTS.coverage,
    article: COVERAGE_STORY,
  },
];

// The storytelling mechanic is the same on every screen — a pinned stage that
// scrubs three story cards along a horizontal lane as the visitor scrolls.
// The lane adapts itself to the viewport (CSS, press-section.css): the cards
// are as wide as their screen deserves, so a phone reads a full-bleed story
// that the next one slides in from the right, and a desktop reads the wide
// two-column spread. No layout mode-switching — the scroll scrubs a translateX
// on every screen.
//
// A logo chip is 76x18 at most. Press logos tend to arrive as whatever the outlet
// sends — often a full-resolution PNG — so an ImageKit URL pasted into pressLogos
// is resized on the way out rather than shipping a 200 KB masthead to paint a
// thumbnail. Non-ImageKit URLs (a local /press/*.png) pass through untouched.
const LOGO_WIDTH = 160;

// One outlet chip, used by the per-story "Featured in" row and the closing
// media wall — so a logo added to pressLogos appears in both without being wired
// up twice. A missing/broken logo degrades to the outlet's name rather than a
// broken-image icon.
const OutletChip = memo(({source}) => {
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
});

// The body of one story, mode-agnostic. The pinned lane and the reduced-motion
// narrative render the same inner content — the caller supplies the wrapper —
// so a content edit can never drift between layouts.
const StoryBody = memo(({article, kind}) => {
  if (kind === "wall") {
    return (
      <div className="press-story__inner press-story__inner--center">
        <span className="press-story__eyebrow">
          <span className="press-story__tag">Coverage</span>
          Across India
        </span>
        <h3 className="press-story__title">Featured across India&apos;s media</h3>
        <p className="press-story__excerpt">
          CareerVeda&apos;s placement milestones and upskilling programs have been covered by
          publications nationwide.
        </p>
        <div className="press-wall-grid">
          {article.outlets.map((source) => (
            <OutletChip key={source.name} source={source} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="press-story__inner">
      <div className="press-story__copy press-story__col">
        <span className="press-story__eyebrow">
          <span className="press-story__tag">{article.tag}</span>
          {article.date}
        </span>
        <h3 className="press-story__title">{article.title}</h3>
        <p className="press-story__excerpt">{article.excerpt}</p>
      </div>

      <div className="press-story__visual press-story__col">
        {article.stats?.length > 0 && (
          <div className="press-story__stats">
            {article.stats.map(([value, label]) => (
              <div className="press-story__stat" key={label}>
                <strong>{value}</strong>
                <span>{label}</span>
              </div>
            ))}
          </div>
        )}

        {article.highlights?.length > 0 && (
          <ul className="press-story__highlights">
            {article.highlights.map((point) => (
              <li key={point}>
                <span className="press-story__check" aria-hidden="true">
                  <svg viewBox="0 0 12 12">
                    <path d="M2 6.2 4.8 9 10 3.4" />
                  </svg>
                </span>
                {point}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="press-story__sources">
        <small>Featured in</small>
        {article.sources.map((source) => (
          <OutletChip key={source.name} source={source} />
        ))}
      </div>
    </div>
  );
});

const storyAccentStyle = (story) => ({
  "--accent": story.accent.main,
  "--accent-deep": story.accent.deep,
  "--accent-soft": story.accent.soft,
});

// One card on the pinned lane. `distance` — how far the scroll progress is
// from this story's stop — drives scale, opacity, ring presence and stacking
// order, so the active story is always the large, legible, topmost one while
// its neighbours recede. The whole lane is scrubbed end-to-end by the
// visitor's scroll — nothing pops in and out.
const StoryLaneCard = memo(({story, index, total, scrollYProgress, isActive}) => {
  const center = index / (total - 1);
  const distance = useTransform(scrollYProgress, (value) => Math.abs(value - center));
  const scale = useTransform(distance, [0, 0.45], [1, 0.93]);
  const opacity = useTransform(distance, [0, 0.45], [1, 0.62]);
  const zIndex = useTransform(distance, [0, 0.45], [12, 6]);

  // A leaving story drifts a little further left rather than cutting hard to
  // its dimmed rest position — a tiny residual slant as the next one arrives.
  const x = useTransform(distance, [0, 0.5], [0, -34]);

  // The entrance beat runs ONCE, the first time the card owns the stage. A
  // plain `.is-active` replay would re-animate the whole card's content every
  // time the visitor hands the stage over (documented in press-section.css);
  // users read that repeat as the section re-rendering itself. This flag pins
  // the finished rise so a story handed back the stage is already visible.
  const [entered, setEntered] = useState(false);
  useLayoutEffect(() => {
    if (isActive) setEntered(true);
  }, [isActive]);

  return (
    <motion.article
      className={`press-story press-story--${story.accentClass}${isActive ? " is-active" : ""}${entered ? " is-entered" : ""}`}
      style={{zIndex, scale, opacity, x, ...storyAccentStyle(story)}}
    >
      <StoryBody article={story.article} kind={story.kind} />
    </motion.article>
  );
});

// The section's heading. Story 1 is the dominant visual when the reader
// arrives, which is the whole point of the pinned stage; the heading sits in
// normal flow above it and scrolls away as the section pins.
const PressSection = () => {
  const reducedMotion = useReducedMotion();
  const animated = !reducedMotion;

  const scrollRef = useRef(null);
  const trackRef = useRef(null);
  const stepRef = useRef(0); // one card width + the track gap, in px (lane only)
  const storyCount = stories.length;

  const [active, setActive] = useState(0);

  const {scrollYProgress} = useScroll({
    target: scrollRef,
    // The whole pinned run: the section's tall wrapper starts at the top of
    // the viewport and ends at the bottom.
    offset: ["start start", "end end"],
  });

  // The lane slides so that timeline stop `i` lands in the active column:
  // x = -i * step. `step` is measured, not state, so a resize never re-renders
  // the tree — the transform simply reads the fresh number on its next scroll
  // evaluation.
  const trackX = useTransform(scrollYProgress, (value) => -stepRef.current * (storyCount - 1) * value);

  useMotionValueEvent(scrollYProgress, "change", (value) => {
    setActive(value < 0.22 ? 0 : value < 0.69 ? 1 : 2);
  });

  // Measure the lane step (card width + gap). Triggered on mount, font settle
  // and resize; the width is vw-derived so fonts changing cannot move it, but
  // re-measuring is cheap and keeps the maths honest.
  useLayoutEffect(() => {
    const track = trackRef.current;
    if (!track) return undefined;

    const measure = () => {
      const card = track.querySelector(".press-story");
      if (!card) return;
      const style = window.getComputedStyle(track);
      const gap = parseFloat(style.columnGap || "") || parseFloat(style.gap || "") || 0;
      stepRef.current = Math.round(card.getBoundingClientRect().width + gap);
    };

    measure();
    const frame = window.requestAnimationFrame(measure);
    window.addEventListener("resize", measure);
    if (document.fonts?.ready) document.fonts.ready.then(measure).catch(() => {});
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", measure);
    };
  }, []);

  const activeStory = stories[active];

  return (
    <section
      id="press"
      className={`press-section${animated ? " press-storytelling press-storytelling--lane" : " press-storytelling--static"}`}
    >
      <Reveal className="press-section-heading">
        <span className="label">Media Coverage</span>
        <h2>CareerVeda in the News</h2>
        <p>
          Featured across India&apos;s leading publications for placement outcomes and
          upskilling excellence.
        </p>
      </Reveal>

      <div className="press-scroll" ref={scrollRef}>
        <div className="press-stage">
          {animated && (
            <div className="press-grid" aria-hidden="true">
              {stories.map((story, index) => (
                <motion.span
                  key={story.id}
                  className={`press-grid__glow press-grid__glow--${index}${index === active ? " is-active" : ""}`}
                  style={{
                    // The glow rides the same track as the cards on every screen.
                    x: trackX,
                    "--glow": story.accent.glow,
                  }}
                />
              ))}
            </div>
          )}

          {animated ? (
            <motion.div className="press-track" ref={trackRef} style={{x: trackX}}>
              {stories.map((story, index) => (
                <StoryLaneCard
                  key={story.id}
                  story={story}
                  index={index}
                  total={storyCount}
                  scrollYProgress={scrollYProgress}
                  isActive={index === active}
                />
              ))}
            </motion.div>
          ) : (
            <div className="press-track" ref={trackRef}>
              {stories.map((story, index) => (
                <Reveal key={story.id} className="press-story-slot" amount={0.12}>
                  <article
                    className={`press-story press-story--${story.accentClass}${index === 0 ? " is-active" : ""}`}
                    style={storyAccentStyle(story)}
                  >
                    <StoryBody article={story.article} kind={story.kind} />
                  </article>
                </Reveal>
              ))}
            </div>
          )}

          {animated && (
            <div
              className="press-rail"
              style={{"--accent": activeStory.accent.main}}
              aria-hidden="true"
            >
              <span className="press-rail__count">0{active + 1} / 03</span>
              {stories.map((story, index) => (
                <span key={story.id} className={`press-rail__dot${index === active ? " is-active" : ""}`}>
                  0{index + 1}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default PressSection;