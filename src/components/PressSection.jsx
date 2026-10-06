import {memo, useEffect, useLayoutEffect, useMemo, useRef, useState} from "react";
import {motion, useMotionValueEvent, useReducedMotion, useScroll, useSpring, useTransform} from "framer-motion";
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

// A stat value like "300+" or "20+ LPA" or "68%": count the numeric core up
// from zero the first time the story holding it takes the stage, keeping the
// suffix steady. Runs once per card (pinned via startedRef), honours reduced
// motion, and falls back to the literal string for anything non-numeric.
const STAT_NUM_RE = /^([\d.,]+)(.*)$/;

const PressCount = ({children, active}) => {
  const reducedMotion = useReducedMotion();
  const value = String(children ?? "");
  const parsed = useMemo(() => STAT_NUM_RE.exec(value), [value]);
  const [display, setDisplay] = useState(() => {
    if (!parsed || reducedMotion) return value;
    return `0${parsed[2]}`;
  });

  useEffect(() => {
    if (!parsed || reducedMotion) return;
    if (!active) return;

    const target = parseFloat(parsed[1].replace(/,/g, ""));
    if (!Number.isFinite(target)) return;
    const suffix = parsed[2];
    const DURATION = 1150;
    const start = performance.now();
    let raf = 0;
    const tick = (now) => {
      const t = Math.max(0, Math.min(1, (now - start) / DURATION));
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(`${Math.round(target * eased).toLocaleString("en-US")}${suffix}`);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [parsed, value, active, reducedMotion]);

  return <strong>{display}</strong>;
};

// The body of one story, mode-agnostic. The pinned lane and the reduced-motion
// narrative render the same inner content — the caller supplies the wrapper —
// so a content edit can never drift between layouts.
const StoryBody = memo(({article, kind, entered}) => {
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
                <PressCount active={entered}>{value}</PressCount>
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
const LANE_END = 0.8;

const StoryLaneCard = memo(({story, index, total, scrollYProgress, isActive}) => {
  const center = index / (total - 1);
  const distance = useTransform(scrollYProgress, (value) => Math.abs(value - center));
  const scale = useTransform(distance, [0, 0.45], [1, 0.93]);
  const opacity = useTransform(distance, [0, 0.45], [1, 0.62]);
  const zIndex = useTransform(distance, [0, 0.45], [12, 6]);

  // A leaving story drifts a little further left rather than cutting hard to
  // its dimmed rest position — a tiny residual slant as the next one arrives.
  const x = useTransform(distance, [0, 0.5], [0, -34]);

  // Set ONCE, the first time the card owns the stage, so the stat count-up
  // runs a single time. There is deliberately no CSS entrance on the content:
  // the card is already visible while it slides in, and a fade-from-zero on
  // activation blanked it mid-handoff, which read as the section re-rendering.
  const [entered, setEntered] = useState(false);
  if (isActive && !entered) setEntered(true);

  return (
    <motion.article
      className={`press-story press-story--${story.accentClass}${isActive ? " is-active" : ""}${entered ? " is-entered" : ""}`}
      style={{zIndex, scale, opacity, x, ...storyAccentStyle(story)}}
    >
      <StoryBody article={story.article} kind={story.kind} entered={entered} />
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

  // The scrub is sprung, not raw: the lane keeps gliding a beat after the
  // fingers stop, so the story hand-offs feel weighty rather than clutching
  // to the scrollbar. Over-damped (damping > 2*sqrt(stiffness*mass)), so it
  // settles without an overshoot that would park a card off-centre.
  // Softer than it was (120/26/0.6) so a hand-off glides rather than tracks
  // the scrollbar. Still over-damped: critical damping is 2·√(70·0.7) ≈ 14.
  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 70,
    damping: 20,
    mass: 0.7,
  });
  const progress = animated ? smoothProgress : scrollYProgress;

  // The lane finishes its slide at LANE_END of the pinned run and holds the
  // last card still for the remainder. Mapped 1:1, the last card only reached
  // its stop on the run's final pixel — the same moment the pin released — so
  // on phones it was always caught half off the right edge, and the next
  // section rose before the card had landed.
  const laneProgress = useTransform(progress, (value) => Math.min(1, value / LANE_END));

  // The lane slides so that timeline stop `i` lands in the active column:
  // x = -i * step. `step` is measured, not state, so a resize never re-renders
  // the tree — the transform simply reads the fresh number on its next scroll
  // evaluation.
  const trackX = useTransform(laneProgress, (value) => -stepRef.current * (storyCount - 1) * value);

  useMotionValueEvent(laneProgress, "change", (value) => {
    setActive(value < 0.25 ? 0 : value < 0.75 ? 1 : 2);
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

      // The stage is viewport-tall with the card centred, so when the pin
      // releases, half the leftover height sits empty under the last card
      // before the next section starts. Expose it so the CSS can pull the next
      // section up by that much (press-section.css, --press-spare).
      const stage = track.closest(".press-stage");
      const cards = track.querySelectorAll(".press-story");
      const last = cards[cards.length - 1];
      if (stage && last && scrollRef.current) {
        const spare = Math.max(0, Math.round((stage.clientHeight - last.offsetHeight) / 2));
        scrollRef.current.style.setProperty("--press-spare", `${spare}px`);
      }
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
                  scrollYProgress={laneProgress}
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

        </div>
      </div>
    </section>
  );
};

export default PressSection;