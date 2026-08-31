import React from "react";
import {Link} from "react-router-dom";
import {motion, useReducedMotion} from "framer-motion";
import {Reveal} from "../motionPrimitives";
import {makeItemVariants, hoverLift} from "../motionVariants";
import {useViewportTier} from "../../hooks/useViewportTier";
import {useContentList} from "../../hooks/useContent";
import {adaptProgram} from "../../lib/contentAdapters";
import {cdnImage, cdnSrcSet} from "../../lib/imageCdn";
import "./RecommendedCourses1.css";

const SLOTS = [
  {name: "hero", cols: 7, rows: 2, size: "xl"},
  {name: "wide", cols: 5, rows: 1, size: "sm"},
  {name: "tall", cols: 5, rows: 1, size: "md"},
  {name: "compact", cols: 4, rows: 1, size: "sm"},
  {name: "panel", cols: 8, rows: 1, size: "md"},
  {name: "banner", cols: 12, rows: 1, size: "lg"},
];

const SLOT_IMAGE_WIDTH = {
  hero: 720,
  wide: 520,
  tall: 520,
  compact: 420,
  panel: 800,
  banner: 1180,
};

const REVEAL_TIERS = {
  desktop: {stagger: 0.08, duration: 0.62},
  laptop: {stagger: 0.075, duration: 0.56},
  tablet: {stagger: 0.07, duration: 0.52},
  mobile: {stagger: 0.05, duration: 0.4},
};

const STAT_LABELS = ["Duration", "Format", "Highlight"];

const recommendedCourses = [
  {
    id: "product-management",
    slug: "product-management",
    image: "https://ik.imagekit.io/q7ucn1rfni/careerveda/product-management-ede8ba4a.png?tr=w-840,f-auto,q-80",
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
    image: "https://ik.imagekit.io/q7ucn1rfni/careerveda/Data_analytics-19c78fb9.png?tr=w-840,f-auto,q-80",
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
    image: "https://ik.imagekit.io/q7ucn1rfni/careerveda/Business_analytics_images-141e26d2.png?tr=w-840,f-auto,q-80",
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
    image: "https://ik.imagekit.io/q7ucn1rfni/careerveda/investing-banking-images-d0cb7a99.png?tr=w-840,f-auto,q-80",
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
    image: "https://ik.imagekit.io/q7ucn1rfni/careerveda/data-5283dc81.webp?tr=w-840,f-auto,q-80",
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
    image: "https://ik.imagekit.io/q7ucn1rfni/careerveda/PG-WITH-GENAI-803ad9e9.webp?tr=w-840,f-auto,q-80",
    label: "In-Demand Skills",
    title: "PG Program in GEN AI",
    subtitle: "Become a Generative AI Engineer",
    description:
      "Master Generative AI and transform your career with cutting-edge skills. Learn to build intelligent applications using the latest AI models, LLMs, and automation technologies",
    meta: ["6 Months", "Hands-On Labs", "Certification Prep"],
  },
];

const cardStats = course => {
  const stats = (course.meta || [])
    .slice(0, 3)
    .map((value, i) => ({label: STAT_LABELS[i], value}));

  if (course.salary) stats[1] = {label: "Avg. salary", value: course.salary};
  if (course.placement) stats[2] = {label: "Placement rate", value: course.placement};

  return stats.filter(({value}) => value);
};

const courseFromProgram = program => ({
  id: program.id,
  slug: program.id,
  image: program.image,
  label: program.badges?.[0] || "",
  title: program.title,
  subtitle: program.subtitle,
  description: program.description,
  meta: [program.duration, program.format,
    Array.isArray(program.mentorship)
      ? program.mentorship.join(", ")
      : program.mentorship,
  ].filter(Boolean),
});

class CourseCatalog {
  constructor(curated, published) {
    this.curated = curated;
    this.live = new Map(published.map(course => [course.id, course]));
  }

  getCourses() {
    return this.curated.map(course => {
      const live = this.live.get(course.id);
      return live
        ? {
            ...course,
            image: live.image || course.image,
            title: live.title || course.title,
            subtitle: live.subtitle || course.subtitle,
            description: live.description || course.description,
          }
        : course;
    });
  }
}

const BentoCard = ({course, slot, variants, lift}) => {
  const stats = cardStats(course);
  const Card = lift ? motion.article : "article";

  return (
    <Reveal
      as={Card}
      variants={variants}
      className={`rc-card rc-card--${slot.name} rc-card--${slot.size}${course.slug ? " is-linked" : ""}`}
      style={{"--rc-cols": slot.cols, "--rc-rows": slot.rows}}
      {...(lift && {whileHover: lift, whileTap: hoverLift.whileTap})}
    >
      {course.slug && (
        <Link
          className="rc-link"
          to={`/programs/${course.slug}`}
          aria-label={`${course.title} — explore program`}
        />
      )}

      {course.image && (
        <div className="rc-media" aria-hidden="true">
          <img
            src={cdnImage(course.image, SLOT_IMAGE_WIDTH[slot.name])}
            srcSet={cdnSrcSet(course.image, SLOT_IMAGE_WIDTH[slot.name])}
            alt=""
            width={SLOT_IMAGE_WIDTH[slot.name]}
            height={Math.round(SLOT_IMAGE_WIDTH[slot.name] * 0.75)}
            loading="lazy"
            decoding="async"
            draggable="false"
            onError={e => e.currentTarget.parentElement?.remove()}
          />
        </div>
      )}

      <span className="rc-scrim" aria-hidden="true" />
      <span className="rc-glow" aria-hidden="true" />

      <div className="rc-body">
        {course.label && <span className="rc-badge">{course.label}</span>}
        <h3 className="rc-title">{course.title}</h3>
        <p className="rc-kicker">{course.subtitle}</p>
        <p className="rc-desc">{course.description}</p>

        {stats.length > 0 && (
          <dl className="rc-stats">
            {stats.map(stat => (
              <div className="rc-stat" key={stat.label}>
                <dt>{stat.label}</dt>
                <dd>{stat.value}</dd>
              </div>
            ))}
          </dl>
        )}

        {course.slug && (
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

const RecommendedCourses1 = () => {
  const {items: published} = useContentList("programs", {
    fallback: recommendedCourses,
    adapt: record => courseFromProgram(adaptProgram(record)),
  });

  const courses = React.useMemo(
    () => new CourseCatalog(recommendedCourses, published).getCourses(),
    [published]
  );

  const reduceMotion = useReducedMotion();
  const tier = useViewportTier();
  const {stagger, duration} = REVEAL_TIERS[tier];

  const cardVariants = React.useMemo(() => {
    const base = makeItemVariants(duration);

    return SLOTS.map((_, i) => ({
      ...base,
      visible: {
        ...base.visible,
        transition: {
          ...base.visible.transition,
          delay: (i % 2) * stagger,
        },
      },
    }));
  }, [duration, stagger]);

  const cardLift = reduceMotion
    ? undefined
    : {y: -8, transition: {type: "spring", stiffness: 300, damping: 24}};

  return (
    <div
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

      <div className="rc-grid">
        {courses.map((course, i) => (
          <BentoCard
            key={course.id}
            course={course}
            slot={SLOTS[i % SLOTS.length]}
            variants={cardVariants[i % SLOTS.length]}
            lift={cardLift}
          />
        ))}
      </div>
    </div>
  );
};

export default RecommendedCourses1;
