import React, {memo} from "react";
import {Link} from "react-router-dom";
import {Reveal} from "../motionPrimitives";
import {useContentList} from "../../hooks/useContent";
import {adaptProgram} from "../../lib/contentAdapters";
import {cdnImage, cdnSrcSet} from "../../lib/imageCdn";
import "./RecommendedCourses.css";

/* ── Data ───────────────────────────────────────────────────────────────────
 * The section is transparent and renders on the CareerVeda background; the
 * individual cards provide the surfaces. The composition is a strict 12-column
 * grid with an asymmetric rhythm:
 *
 *   Row 1:  featured (7)  +  right stack (5, two cards)
 *   Row 2:  small (3)     +  wide (9)
 *   Row 3:  full (12)
 *
 * Course order is deterministic: index 0 → featured, 1/2 → right stack,
 * 3 → small, 4 → wide, 5 → full. Updated content from the live API is merged
 * in via CourseCatalog; the curated list below is the fallback and the source
 * of editorial choice (which slot each program fills, and its category).
 */

const recommendedCourses = [
  {
    id: "product-management",
    slug: "product-management",
    image: "https://ik.imagekit.io/q7ucn1rfni/careerveda/product-management-ede8ba4a.png?tr=w-840,f-auto,q-80",
    label: "MOST POPULAR",
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
    label: "CAREER STARTER",
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
    label: "IN-DEMAND SKILLS",
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
    label: "HIGH FINANCE",
    title: "PG Program in Investment Banking",
    subtitle: "Master Financial Modeling & Valuation",
    description:
      "Master the world of Investment Banking with comprehensive training in financial modeling, M&A analysis, equity research, and deal execution. Learn from industry experts and build the skills needed to excel in top investment banks and financial institutions.",
    meta: ["6 Months", "Live Online", "Placement Focus"],
  },
  {
    id: "data-science-ai",
    slug: "data-science-ai",
    image: "https://ik.imagekit.io/q7ucn1rfni/careerveda/PG-WITH-GENAI-803ad9e9.webp?tr=w-840,f-auto,q-80",
    label: "ADVANCED TRACK",
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
    label: "IN-DEMAND SKILLS",
    title: "PG Program in GEN AI",
    subtitle: "Become a Generative AI Engineer",
    description:
      "Master Generative AI and transform your career with cutting-edge skills. Learn to build intelligent applications using the latest AI models, LLMs, and automation technologies",
    meta: ["6 Months", "Hands-On Labs", "Certification Prep"],
  },
];

/* The variant each position in the grid renders as. Order is fixed and
   deterministic — see the note at the top of the file. */
const VARIANTS = ["featured", "stacked", "stacked", "small", "wide", "full"];

/* Image width per variant, for the ImageKit responsive pipe. */
const VARIANT_IMAGE_WIDTH = {
  featured: 720,
  stacked: 520,
  small: 420,
  wide: 800,
  full: 1180,
};

const courseFromProgram = program => ({
  id: program.id,
  slug: program.id,
  image: program.image,
  label: (program.badges?.[0] || "").toUpperCase(),
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

/* Maps the real course fields to the card's display shape. category is the
   curated label (kept uppercase); duration/mode/support come from meta in
   order, so no values are invented when the data only carries fewer. */
const toCard = (course, variant) => {
  const [duration, mode, support] = course.meta || [];
  return {
    id: course.id,
    image: course.image,
    category: course.label || "",
    title: course.title,
    subtitle: course.subtitle,
    description: course.description,
    duration,
    mode,
    support,
    href: course.slug ? `/programs/${course.slug}` : "",
    variant,
  };
};

const MetaPill = memo(function MetaPill({children}) {
  return <span>{children}</span>;
});

const CourseCard = memo(function CourseCard({course}) {
  const isEager = course.variant === "featured";

  return (
    <article
      className={`recommended-card recommended-card--${course.variant}${course.href ? " is-linked" : ""}`}
    >
      {course.href && (
        <Link
          className="recommended-card__link"
          to={course.href}
          aria-label={`${course.title} — explore program`}
        />
      )}

      {course.image && (
        <img
          className="recommended-card__image"
          src={cdnImage(course.image, VARIANT_IMAGE_WIDTH[course.variant])}
          srcSet={cdnSrcSet(course.image, VARIANT_IMAGE_WIDTH[course.variant])}
          alt=""
          width={VARIANT_IMAGE_WIDTH[course.variant]}
          height={Math.round(VARIANT_IMAGE_WIDTH[course.variant] * 0.75)}
          loading={isEager ? "eager" : "lazy"}
          decoding="async"
          draggable="false"
          onError={e => e.currentTarget.remove()}
        />
      )}

      <span className="recommended-card__overlay" aria-hidden="true" />

      <div className="recommended-card__content">
        {course.category && (
          <span className="recommended-card__category">{course.category}</span>
        )}

        <h3 className="recommended-card__title">{course.title}</h3>

        {course.subtitle && (
          <p className="recommended-card__subtitle">{course.subtitle}</p>
        )}

        {course.description && (
          <p className="recommended-card__description">{course.description}</p>
        )}

        <div className="recommended-card__meta">
          {course.duration && <MetaPill>{course.duration}</MetaPill>}
          {course.mode && <MetaPill>{course.mode}</MetaPill>}
          {course.support && <MetaPill>{course.support}</MetaPill>}
        </div>

        {course.href && (
          <Link className="recommended-card__cta" to={course.href}>
            Explore Program <span aria-hidden="true">→</span>
          </Link>
        )}
      </div>
    </article>
  );
});

const RecommendedCourses = () => {
  const {items: published} = useContentList("programs", {
    fallback: recommendedCourses,
    adapt: record => courseFromProgram(adaptProgram(record)),
  });

  const cards = React.useMemo(() => {
    const courses = new CourseCatalog(recommendedCourses, published).getCourses();
    return courses
      .filter(Boolean)
      .slice(0, 6)
      .map((course, i) => toCard(course, VARIANTS[i] || "small"));
  }, [published]);

  if (!cards.length) return null;

  return (
    <section
      className="recommended-courses recommended-courses-section"
      id="recommended-courses"
      aria-labelledby="recommended-courses-title"
    >
      <div className="recommended-courses__inner">
        <header className="recommended-courses__header">
          <Reveal as="span" className="recommended-courses__eyebrow">
            Curated Tracks
          </Reveal>

          <Reveal as="h2" className="recommended-courses__title" id="recommended-courses-title">
            Recommended Programs
          </Reveal>

          <Reveal as="p" className="recommended-courses__description">
            Find the perfect AI-powered career path curated by industry experts
          </Reveal>
        </header>

        <div className="recommended-courses__grid">
          {cards[0] && <CourseCard course={cards[0]} />}

          {(cards[1] || cards[2]) && (
            <div className="recommended-courses__stack">
              {cards[1] && <CourseCard course={cards[1]} />}
              {cards[2] && <CourseCard course={cards[2]} />}
            </div>
          )}

          {cards.slice(3, 6).map(course => (
            <CourseCard key={course.id} course={course} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default RecommendedCourses;
