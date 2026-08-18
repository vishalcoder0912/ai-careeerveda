import React from "react";
import {Link} from "react-router-dom";
import {useReducedMotion} from "framer-motion";
import {Reveal} from "../motionPrimitives";
import {makeItemVariants} from "../motionVariants";
import {useViewportTier} from "../../hooks/useViewportTier";
import {useContentList} from "../../hooks/useContent";
import {adaptProgram} from "../../lib/contentAdapters";
import {cdnImage, cdnSrcSet} from "../../lib/imageCdn";
import "./RecommendedCourses1.css";

/* â”€â”€ What this section no longer runs, and why â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
 *
 * It used to carry two things that ran work on every single frame while the
 * reader was scrolling through it, and together they were what made the bento
 * feel like it was dragging on a laptop:
 *
 *   The three.js particle field. R3F's useFrame runs on the main thread, so a
 *   160-particle field meant ~160 atan2/sqrt/sin/cos evaluations plus a matrix
 *   compose per particle, 60 times a second        in direct competition with the
 *   scroll, the reveals and image decoding. Trimming the count and the DPR
 *   made it cheaper without making it free; nothing makes a per-frame
 *   main-thread loop free except not running it.
 *
 *   The scroll parallax. Six oversized artwork layers, each re-composited on
 *   every scroll frame with a scrim and a glow stacked above it. On integrated
 *   graphics that is the frame budget gone before the browser draws any text.
 *
 * What is left is motion the compositor owns outright: the reveal (opacity and
 * transform), the CSS orb drift behind the heading, and the hover states. That
 * is the part anyone actually sees, and it now runs at frame rate.
 *
 * Both are recoverable from git history if the section is ever moved somewhere
 * it is the only thing on screen; on the home page, sharing a scroll with the
 * rest of the page, it cannot afford either.
 */

/* â”€â”€ The bento â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
 *
 * Six slots on a 12-column grid, and no two of them are the same size. The
 * spans live here rather than in the CSS because they are a property of the
 * running order        slot 0 is the featured program and gets the 2-row block, and
 * the rest are arranged so that each band reads differently from the one above
 * it (7|5, then 4|8, then a single full-width strip).
 *
 * `cols` and `rows` are grid spans; `size` picks the card's type scale and how
 * hard its description is clamped, because a 12-column strip and a 4-column
 * tile cannot carry the same amount of copy.
 *
 * Placement is by span only, never by explicit line        so the visual order is
 * the DOM order, and a keyboard visitor tabs through the cards in the order
 * they are read. `grid-auto-flow: dense` would break that and is deliberately
 * not used; the spans below already pack without a hole.
 */
const SLOTS = [
  {name: "hero", cols: 7, rows: 2, size: "xl"},
  {name: "wide", cols: 5, rows: 1, size: "sm"},
  {name: "tall", cols: 5, rows: 1, size: "md"},
  {name: "compact", cols: 4, rows: 1, size: "sm"},
  {name: "panel", cols: 8, rows: 1, size: "md"},
  {name: "banner", cols: 12, rows: 1, size: "lg"},
];

// Widest each slot is ever drawn, at the 1180px container. The CDN is asked for
// that and for a 2x variant via srcset, so a 4-column tile does not download
// the hero's artwork. See lib/imageCdn.
const SLOT_IMAGE_WIDTH = {hero: 720, wide: 520, tall: 520, compact: 420, panel: 800, banner: 1180};

// Each card now reveals on its own scroll trigger rather than the whole grid
// hanging off one, so `stagger` is no longer a queue for six cards        it is the
// offset between the two cards that share a band. The bento's spans below pack
// exactly two cards per row (7|5, 5 beside the hero's second row, 4|8, then the
// full-width strip), so an even index is always the left-hand card of its band
// and an odd index the right-hand one. A beat between them reads as the pair
// arriving rather than snapping in together.
//
// `duration` still shortens on small screens: on a phone the bento is a single
// column, so a card is most of the viewport by the time it triggers and a long
// reveal leaves the reader waiting on it.
const REVEAL_TIERS = {
  desktop: {stagger: 0.08, duration: 0.62},
  tablet: {stagger: 0.07, duration: 0.52},
  mobile: {stagger: 0.05, duration: 0.4},
};

// Paste an image URL into a course's `image` and it becomes that card's
// backdrop        no other change needed. Any size or shape works: the picture is
// cropped to fill whichever bento slot the course lands in, so a portrait tile
// and a full-width strip both look deliberate. Leave it "" for no picture, and
// a URL that fails to load falls back to the card's own gradient rather than
// leaving a blank hole.
//
// `slug` is the program's id in programCatalog.js, and it is what makes the
// whole card a link to /programs/<slug>. Leave it "" and the card renders
// exactly as it does now, just not clickable.
//
// `meta` becomes the card's three stats, labelled Duration / Format /
// Highlight in that order. Two optional fields override the last two when you
// have figures to put there:
//
//   salary:    "â‚¹12.4 LPA"   â†’ replaces the Format stat,    labelled Avg. salary
//   placement: "94%"          â†’ replaces the Highlight stat, labelled Placement rate
//
// They are deliberately absent rather than filled with plausible-looking
// numbers: an average salary and a placement rate are claims about outcomes,
// and this file is not the place to invent them. Add them once the real
// figures are confirmed and the stat row picks them up.
const recommendedCourses= [
  {
    id: "product-management",
    slug: "product-management",
    image: "https://ik.imagekit.io/q7ucn1rfni/careerveda/programs/product-management-6b8b2802.jpg",
    label: "Most Popular",
    title: "PG Program in Product Management",
    subtitle: "Become a High-Impact Product Manager",
    description:
      "Lead the end-to-end lifecycle of digital products. Learn product strategy, customer discovery, user research, UX, agile delivery, product analytics, AI-powered product management and go-to-market planning through real-world case studies and a capstone project.",
    meta: ["6 Months", "Live Online", "Mentor-Led"],
  },
  {
    id: "data-analytics",
    slug: "data-analytics",
    image: "https://ik.imagekit.io/q7ucn1rfni/careerveda/programs/Data_analytics-ba31dcb9.jpg",
    label: "Career Starter",
    title: "PG Program in Data Analytics with Generative AI",
    subtitle: "Become a Data Analyst with AI Workflows",
    description:
      "Master the skills to transform raw data into actionable business insights. Learn Excel, SQL, Python, Power BI, Statistics, and Generative AI through live classes, hands-on projects, and real-world case studies to become an industry-ready Data Analyst.",
    meta: ["6 Months", "Projects", "Placement Focus"],
  },
  {
    id: "business-analytics",
    slug: "business-analytics",
    image: "https://ik.imagekit.io/q7ucn1rfni/careerveda/programs/Business_analytics_images-4145ed42.jpg",
    label: "In-Demand Skills",
    title: "Post Graduate Program in Business Analytics with Generative AI",
    subtitle: "Become a Business Analyst with AI Skills",
    description:
      "Build a successful career in Business Analytics by mastering in-demand analytical tools, Generative AI, and real-world business problem-solving. Learn through live mentor-led sessions, hands-on projects, industry case studies, and career-focused training designed to make you job-ready.",
    meta: ["6 Months", "Live Online", "30+ Projects"],
  },
   {
    id: "investment-banking",
    slug: "investment-banking",
    image: "https://ik.imagekit.io/q7ucn1rfni/careerveda/programs/investing-banking-images-59ab0040.jpg",
    label: "High Finance",
    title: "PG Program in Investment Banking",
    subtitle: "Master Financial Modeling & Valuation",
    description:
      "Master the world of Investment Banking with comprehensive training in financial modeling, M&A analysis, equity research, and deal execution. Learn from industry experts and build the skills needed to excel in top investment banks and financial institutions.",
    meta: ["6 Months", "Live Online", "Placement Focus"],
  },
  {
    id: "data-science-ai",
    slug: "data-science-ai",
    image: "https://ik.imagekit.io/q7ucn1rfni/careerveda/programs/data-c3b60741.jpg",
    label: "Advanced Track",
    title: "PG Program in Data Science with Generative AI",
    subtitle: "Build AI, ML and Agentic AI Skills",
    description:
      "Master Data Science and Generative AI to become a complete AI professional. Learn data analysis, machine learning, deep learning, and cutting-edge generative AI models to solve real-world business problems.",
    meta: ["12 Months", "AI Projects", "Capstone"],
  },
  {
    id: "gen-ai",
    slug: "gen-ai",
    image: "https://ik.imagekit.io/q7ucn1rfni/careerveda/programs/ChatGPT-Image-Jul-13-2026-04_53_32-PM-fbacfde5.jpg",
    label: "In-Demand Skills",
    title: "PG Program in GEN AI",
    subtitle: "Become a Generative AI Engineer",
    description:
      "Master Generative AI and transform your career with cutting-edge skills. Learn to build intelligent applications using the latest AI models, LLMs, and automation technologies",
    meta: ["6 Months", "Hands-On Labs", "Certification Prep"],
  },
];

const STAT_LABELS = ["Duration", "Format", "Highlight"];

// The card's stat row. Built from the program's own three chips, with the two
// optional outcome fields taking over the second and third slots when a course
// carries them        see the note on the curated list above.
const cardStats = (course) => {
  const stats = (course.meta || [])
    .slice(0, 3)
    .map((value, index) => ({label: STAT_LABELS[index], value}));

  if (course.salary) stats[1] = {label: "Avg. salary", value: course.salary};
  if (course.placement) stats[2] = {label: "Placement rate", value: course.placement};

  return stats.filter((stat) => stat && stat.value);
};

// A program record as this strip's card. The card's editorial extras map onto
// fields the program already carries: the ribbon is its first badge, and the
// three stats are the same duration/format/mentorship the explorer shows        so
// an admin editing a program updates this section too, with nothing here to
// keep in step by hand.
const courseFromProgram = (program) => ({
  id: program.id,
  slug: program.id,
  image: program.image,
  label: program.badges?.[0] || "",
  title: program.title,
  subtitle: program.subtitle,
  description: program.description,
  meta: [program.duration, program.format, Array.isArray(program.mentorship) ? program.mentorship.join(", ") : program.mentorship].filter(Boolean),
});

const BentoCard = ({course, slot, variants, lift}) => {
  const stats = cardStats(course);

  return (
    <Reveal
      as="article"
      variants={variants}
      className={`rc-card rc-card--${slot.name} rc-card--${slot.size}${
        course.slug ? " is-linked" : ""
      }`}
      style={{"--rc-cols": slot.cols, "--rc-rows": slot.rows}}
      /* The lift is framer's, not CSS's. The reveal leaves an inline
         `transform` on this element, and an inline transform beats a
         stylesheet's :hover rule        a CSS translateY here would simply never
         apply. Everything the hover does that is *not* a transform on the card
         itself (the glow, the shadow, the image zoom, the arrow) stays in CSS,
         where it belongs. */
      whileHover={lift}
    >
      {/* A stretched link rather than an anchor wrapped around the card.
          Wrapping would put the artwork, the badge and the stats inside the
          link, so a screen reader would read the whole card out as the link's
          name and a drag on the image would try to drag the link. This is one
          link, named by the course, sitting invisibly over the card        the click
          target is the whole card, the accessible name is the title. Skipped
          entirely when a course has no slug. */}
      {course.slug && (
        <Link
          className="rc-link"
          to={`/programs/${course.slug}`}
          aria-label={`${course.title}        explore program`}
        />
      )}

      {/* The artwork. A plain div now the scroll parallax is gone        it was a
          motion.div only so framer could translate it, and the hover zoom is a
          scale on the <img> inside. */}
      {course.image && (
        <div className="rc-media" aria-hidden="true">
          <img
            src={cdnImage(course.image, SLOT_IMAGE_WIDTH[slot.name])}
            srcSet={cdnSrcSet(course.image, SLOT_IMAGE_WIDTH[slot.name])}
            alt=""
            loading="lazy"
            decoding="async"
            draggable="false"
            onError={(event) => {
              // Back to the card's own gradient rather than a blank band.
              event.currentTarget.parentElement?.remove();
            }}
          />
        </div>
      )}

      {/* The scrim the spec calls for, as its own layer rather than a
          pseudo-element on the media        it has to stay put while the picture
          behind it drifts and zooms. */}
      <span className="rc-scrim" aria-hidden="true" />
      <span className="rc-glow" aria-hidden="true" />

      <div className="rc-body">
        {course.label && <span className="rc-badge">{course.label}</span>}

        <h3 className="rc-title">{course.title}</h3>
        <p className="rc-kicker">{course.subtitle}</p>
        {/* Clamped by the card's size class, not hidden: the full blurb stays in
            the DOM for search and for a screen reader, and the program page is
            one click away for anyone who wants to read it all. */}
        <p className="rc-desc">{course.description}</p>

        {stats.length > 0 && (
          <dl className="rc-stats">
            {stats.map((stat) => (
              <div className="rc-stat" key={stat.label}>
                <dt>{stat.label}</dt>
                <dd>{stat.value}</dd>
              </div>
            ))}
          </dl>
        )}

        {course.slug && (
          // Decoration, not a control: the stretched link above already covers
          // the card, and a second focusable element pointing at the same page
          // would be one more tab stop saying the same thing.
          <span className="rc-cta" aria-hidden="true">
            Explore Program
            <svg viewBox="0 0 24 24" focusable="false">
              <path d="M4 12h15M13 6l6 6-6 6" />
            </svg>
          </span>
        )}
      </div>
    </Reveal>
  );
};

// This strip is an editorial selection, not a listing        the full catalogue is
// the program explorer's job. So the six entries above decide which programs
// appear and in what order, and the API only supplies their current copy. A
// program published in the admin panel therefore shows up on /programs without
// also appending itself to the home page.
const RecommendedCourses1 = () => {
  const {items: published} = useContentList("programs", {
    fallback: recommendedCourses,
    adapt: (record) => courseFromProgram(adaptProgram(record)),
  });

  // The ribbon and the stats stay curated: "Most Popular" and "Career Starter"
  // are claims this section makes about the line-up, not facts about a program,
  // so they are not the CMS's to overwrite. Everything a reader would expect to
  // change when an admin edits the program        title, subtitle, blurb, artwork       
  // comes from the API when it answers.
  const courses = React.useMemo(() => {
    const live = new Map(published.map((course) => [course.id, course]));

    return recommendedCourses.map((curated) => {
      const record = live.get(curated.id);

      // A curated slug that is missing or unpublished keeps its static copy
      // rather than leaving a hole in the bento.
      if (!record) return curated;

      return {
        ...curated,
        image: record.image || curated.image,
        title: record.title || curated.title,
        subtitle: record.subtitle || curated.subtitle,
        description: record.description || curated.description,
      };
    });
  }, [published]);

  const reduceMotion = useReducedMotion();
  const tier = useViewportTier();
  const {stagger, duration} = REVEAL_TIERS[tier];
  // One variant per bento slot. They differ only in the delay that offsets the
  // right-hand card of each band        see the note on REVEAL_TIERS. Memoised
  // because handing framer a freshly-built variants object on some later render
  // can restart a reveal that has already played.
  const cardVariants = React.useMemo(() => {
    const base = makeItemVariants(duration);

    return SLOTS.map((_, index) => ({
      ...base,
      visible: {
        ...base.visible,
        transition: {...base.visible.transition, delay: (index % 2) * stagger},
      },
    }));
  }, [duration, stagger]);

  const cardLift = reduceMotion
    ? undefined
    : {y: -8, transition: {type: "spring", stiffness: 300, damping: 24}};

  return (
    <div
      /* Not `program-explorer` any more. That class was on this element only so
         it could share the explorer's panel treatment, and it came with the
         explorer's whole stylesheet: a 1180px width, a white translucent
         background with !important colour rules pointed at it from
         slate-color-system.css, and a font-family override in
         typography-stability-fix.css. All of it had to be out-specified from
         here, and the white background won anyway        this section paints its own
         panel now. */
      className="recommended-courses-section"
      aria-labelledby="recommended-courses-title"
    >
      <Reveal className="rc-header">
        <p className="rc-eyebrow">Curated Tracks</p>
        <h2 id="recommended-courses-title">Recommended Programs</h2>
        <span>
          Find the perfect AI-powered career path curated by industry experts
        </span>
      </Reveal>

      {/* A plain grid, not a StaggerGroup. A stagger container releases all of
          its children off the container's own trigger, so the whole bento fired
          the moment its top edge came into view        including the banner three
          screens further down, which had finished animating long before anyone
          scrolled to it. Each card owns its trigger now and reveals as the
          reader reaches it. */}
      <div className="rc-grid">
        {courses.map((course, index) => (
          <BentoCard
            key={course.id}
            course={course}
            slot={SLOTS[index % SLOTS.length]}
            variants={cardVariants[index % SLOTS.length]}
            lift={cardLift}
          />
        ))}
      </div>
    </div>
  );
};

export default RecommendedCourses1;
