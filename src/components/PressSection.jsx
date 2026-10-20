import {memo, useEffect, useMemo, useRef, useState} from "react";
import {useInView, useReducedMotion} from "framer-motion";
import {Reveal} from "./motionPrimitives";
import ScrollStack, {ScrollStackItem} from "./ScrollStack";
import BrandWord from "./BrandWord";
import {pressArticles, pressLogos, pressOutlets} from "../data/pressArticles";
import {cdnImage} from "../lib/imageCdn";
import "./press-section.css";

// Accent tokens per story card — the card surface wash, tag and stat colour.
const ACCENTS = {
  placement: {main: "#2563eb", deep: "#1d4ed8", soft: "rgba(37, 99, 235, 0.07)"},
  recognition: {main: "#ea580c", deep: "#c2410c", soft: "rgba(234, 88, 12, 0.07)"},
  coverage: {main: "#4f46e5", deep: "#4338ca", soft: "rgba(79, 70, 229, 0.07)"},
};

// PLACEMENT SUCCESS → RECOGNITION → MEDIA COVERAGE. The last card has no
// article record of its own; it is the media wall of every outlet.
const stories = [
  {id: pressArticles[0].id, kind: "story", accentClass: "placement", article: pressArticles[0]},
  {id: pressArticles[1].id, kind: "story", accentClass: "recognition", article: pressArticles[1]},
  {id: "coverage", kind: "wall", accentClass: "coverage", article: {outlets: pressOutlets}},
];

// Logo chips render at most ~120x36; ImageKit URLs are resized on the way out.
const LOGO_WIDTH = 240;

const initials = (name) =>
  name
    .replace(/^the\s+/i, "")
    .split(/[\s-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join("");

// A press badge: the outlet's logo on a white plate (or its monogram when the
// logo is missing or fails), the outlet name, and a small "featured" check.
// Used by each story's "Featured in" row and by the media wall.
const OutletBadge = memo(({source, size = "sm"}) => {
  const [logoFailed, setLogoFailed] = useState(false);
  const logo = pressLogos[source.name];
  const showLogo = Boolean(logo) && !logoFailed;

  return (
    <a
      className={`press-badge press-badge--${size}`}
      href={source.url}
      target="_blank"
      rel="noopener noreferrer"
      title={`Read on ${source.name}`}
    >
      <span className="press-badge__plate">
        {showLogo ? (
          <img
            src={cdnImage(logo, LOGO_WIDTH)}
            alt=""
            width={LOGO_WIDTH}
            height={72}
            loading="lazy"
            decoding="async"
            onError={() => setLogoFailed(true)}
          />
        ) : (
          <span className="press-badge__mono" aria-hidden="true">{initials(source.name)}</span>
        )}
        <span className="press-badge__check" aria-hidden="true">
          <svg viewBox="0 0 12 12">
            <path d="M2.4 6.2 4.9 8.6 9.6 3.6" />
          </svg>
        </span>
      </span>
      <span className="press-badge__name">{source.name}</span>
    </a>
  );
});

// "300+", "20+ LPA", "68%": counts the number up once the card is in view,
// keeping the suffix. Non-numeric values and reduced motion show as written.
const STAT_NUM_RE = /^([\d.,]+)(.*)$/;

const PressCount = ({children, active}) => {
  const reducedMotion = useReducedMotion();
  const value = String(children ?? "");
  const parsed = useMemo(() => STAT_NUM_RE.exec(value), [value]);
  const [display, setDisplay] = useState(() => (!parsed || reducedMotion ? value : `0${parsed[2]}`));

  useEffect(() => {
    if (!parsed || reducedMotion || !active) return undefined;
    const target = parseFloat(parsed[1].replace(/,/g, ""));
    if (!Number.isFinite(target)) return undefined;
    const suffix = parsed[2];
    const start = performance.now();
    let raf = 0;
    const tick = (now) => {
      const t = Math.min(1, (now - start) / 1150);
      setDisplay(`${Math.round(target * (1 - Math.pow(1 - t, 3))).toLocaleString("en-US")}${suffix}`);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [parsed, active, reducedMotion]);

  return <strong>{display}</strong>;
};

const StoryBody = ({article, kind, entered}) => {
  if (kind === "wall") {
    return (
      <div className="press-story__inner press-story__inner--center">
        <span className="press-story__eyebrow">
          <span className="press-story__tag">Coverage</span>
          Across India
        </span>
        <h3 className="press-story__title">Featured across India&apos;s media</h3>
        <p className="press-story__excerpt">
          CareerVeda&apos;s placement milestones and upskilling programs have been covered by publications
          nationwide.
        </p>
        <div className="press-wall">
          {article.outlets.map((source) => (
            <OutletBadge key={source.name} source={source} size="lg" />
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
        <div className="press-story__badges">
          {article.sources.map((source) => (
            <OutletBadge key={source.name} source={source} />
          ))}
        </div>
      </div>
    </div>
  );
};

// One story card. Stats count up the first time it scrolls into view.
const StoryCard = ({story}) => {
  const ref = useRef(null);
  const entered = useInView(ref, {once: true, amount: 0.35});
  const accent = ACCENTS[story.accentClass];

  return (
    <article
      ref={ref}
      className={`press-story press-story--${story.accentClass}`}
      style={{"--accent": accent.main, "--accent-deep": accent.deep, "--accent-soft": accent.soft}}
    >
      <StoryBody article={story.article} kind={story.kind} entered={entered} />
    </article>
  );
};

// Phones and short screens read the stories as a plain column: a card taller
// than the space under the pin would hide its own bottom while stacked.
const STACK_QUERY = "(min-width: 900px) and (min-height: 640px)";

const useStacking = () => {
  const [stack, setStack] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia(STACK_QUERY).matches : false,
  );
  useEffect(() => {
    const query = window.matchMedia(STACK_QUERY);
    const onChange = () => setStack(query.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);
  return stack;
};

const PressSection = () => {
  const stacking = useStacking();

  return (
    <section id="press" className={`press-section${stacking ? " press-section--stacked" : ""}`}>
      <Reveal className="press-section-heading">
        <span className="label">Media Coverage</span>
        <h2>
            <BrandWord /> in the News
          </h2>
        <p>Featured across India&apos;s leading publications for placement outcomes and upskilling excellence.</p>
      </Reveal>

      {stacking ? (
        // Window scroll so the cards pin as the page scrolls. Lenis already
        // smooths the wheel site-wide, so the stack's own smoothing is off.
        <ScrollStack
          className="press-stack"
          useWindowScroll
          smoothScroll={false}
          stackPosition="12%"
          itemDistance={80}
          itemStackDistance={26}
          itemScale={0.04}
          baseScale={0.9}
          dimAmount={0.04}
          holdDistance={140}
        >
          {stories.map((story) => (
            <ScrollStackItem key={story.id} itemClassName="press-stack__card">
              <StoryCard story={story} />
            </ScrollStackItem>
          ))}
        </ScrollStack>
      ) : (
        <div className="press-list">
          {stories.map((story) => (
            <Reveal key={story.id} amount={0.12}>
              <StoryCard story={story} />
            </Reveal>
          ))}
        </div>
      )}
    </section>
  );
};

export default PressSection;
