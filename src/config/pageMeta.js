// Single source of truth for the browser-tab title (and meta description) of
// every route. Before this, only /jobs set document.title, so every other page
// kept the static "CareerVeda" from index.html no matter where you navigated.
// RouteMeta in App.jsx reads this on each route change; the one dynamic route
// (/programs/:slug) sets its own title from the program name — see below.

export const SITE_NAME = "CareerVeda";

// Falls back to index.html's description for anything not listed here.
export const DEFAULT_DESCRIPTION =
  "CareerVeda offers mentor-led online PG programs in data science, data analytics, generative AI, product management and investment banking, with live classes, industry projects and placement assistance.";

/* ── Writing the entries below ───────────────────────────────────────────────
 *
 * `title` is the short label; the tab and the SERP show "<title> | CareerVeda"
 * (see composeTitle), so the label has ~47 characters before the whole thing
 * passes the ~60 Google renders before truncating. Descriptions sit at 150–160:
 * long enough to carry the terms someone actually types, short enough that the
 * sentence Google shows is the one that was written.
 *
 * Each entry leads with what a person searches for — "online PG program",
 * "data science course", "placement assistance" — rather than with what the
 * page is called internally. "Our Programs" is a navigation label; nobody has
 * ever typed it into a search box, and a title tag is the single strongest
 * on-page relevance signal there is, so spending it on a nav label wastes it.
 *
 * Every claim here is one the site already makes on the page itself: mentor-led,
 * live online, hands-on projects, placement assistance. Nothing about salaries,
 * hiring rates, ratings or rankings appears in any of these, because a meta
 * description that promises what the page cannot show is the fastest way to a
 * bounce — and, if it were put into structured data, a manual action.
 */
export const pageMeta = {
  "/": {
    title: "Online PG Programs with Placement Assistance",
    description:
      "Mentor-led online PG programs in data science, generative AI, analytics, product management and investment banking — live classes, projects, placement support.",
  },
  "/programs": {
    title: "PG Programs & Certification Courses Online",
    description:
      "Compare online PG programs in data science with AI, analytics, business analytics, product management, investment banking, cybersecurity and data engineering.",
  },
  "/jobs": {
    title: "Latest Job Openings in Tech, Data & Finance",
    description:
      "Curated openings for data analysts, data scientists, product managers, business analysts, cybersecurity and investment banking roles — updated for India.",
  },
  "/faculty": {
    title: "Faculty & Industry Mentors",
    description:
      "Meet the industry practitioners who teach and mentor every CareerVeda program — professionals from product, analytics, AI, finance and cybersecurity teams.",
  },
  "/blog": {
    title: "Career Guide: Data Science, AI & Upskilling",
    description:
      "Career guides, skill trends, interview preparation and learning roadmaps for data science, generative AI, analytics, product management and investment banking.",
  },
  "/about": {
    title: "About Us — AI-Powered EdTech Platform",
    description:
      "CareerVeda is an Indian ed-tech platform whose mentor-led career programs connect learners to industry practitioners, live projects and placement assistance.",
  },
  "/contact": {
    title: "Contact Us — Admissions & Course Enquiry",
    description:
      "Talk to the CareerVeda admissions team about course fees, eligibility, batch dates, EMI options and placement assistance for any online PG program.",
  },
  "/alumni": {
    title: "Alumni Stories & Career Transitions",
    description:
      "Read how CareerVeda alumni moved into data, AI, product and finance roles — the programs they took, the projects they built and the transitions they made.",
  },
  "/enroll": {
    title: "Enroll Online — Admissions Open",
    description:
      "Apply to a CareerVeda online PG program. Check eligibility, batch start dates, fees and EMI options, and speak to an admissions counsellor before you enroll.",
  },
  /* The four policy descriptions were 42–61 characters — a fragment each, well
     under the ~70 below which Google stops using the tag and writes its own
     snippet from the body instead. Each page carries 1,200–1,500 words across a
     dozen numbered sections, so the rewrite just names the sections that are
     actually there rather than padding the sentence out to length. */
  "/privacy-policy": {
    title: "Privacy Policy",
    description:
      "How CareerVeda collects, uses, shares and secures your personal data — what we hold, your rights and choices, cookies, retention and how to contact us.",
  },
  "/refund-policy": {
    title: "Refund Policy",
    description:
      "CareerVeda's refund policy for online PG programs — eligibility, how to request a refund, processing times, deductions, EMI plans and dispute resolution.",
  },
  "/terms": {
    title: "Terms of Use",
    description:
      "The terms governing your use of CareerVeda's website and programs — enrolment and payment, acceptable use, intellectual property, liability and governing law.",
  },
  "/escalation-policy": {
    title: "Escalation Policy",
    description:
      "How to raise a concern with CareerVeda — the escalation matrix, how to submit an issue, response and resolution timelines, and the external remedies available.",
  },
};

// Google renders roughly 60 characters of a title before cutting it off, and
// what it cuts is the tail — which is exactly where the " | CareerVeda" suffix
// sits. An audit of the built HTML found 33 of 38 blog titles over the limit,
// the longest at 83 characters, so on a third of the site the brand was being
// appended purely to be truncated away.
//
// So the suffix is conditional: added when the whole thing still fits, dropped
// when it does not. A blog post whose own headline is 70 characters keeps all 70
// and loses the branding it was never going to display; a short page title like
// "Contact Us" keeps the brand, which is where it earns its place.
//
// The title itself is never truncated here. A headline is written to be read,
// and cutting it mid-phrase to fit a counter reads worse in the result than a
// long title Google trims itself — Google trims at a word boundary and often
// rewrites from the page's h1 anyway.
const TITLE_LIMIT = 60;

export function composeTitle(title) {
  if (!title) return SITE_NAME;

  const suffixed = `${title} | ${SITE_NAME}`;
  return suffixed.length <= TITLE_LIMIT ? suffixed : title;
}

// Returns the meta record for a pathname, or null when the route sets its own
// (i.e. /programs/:slug, whose title depends on data App.jsx must not import —
// pulling the 471 KB program catalog into the eager bundle would undo the code
// splitting in App.jsx). RouteMeta leaves such routes for the page to handle.
export function resolvePageMeta(pathname) {
  return pageMeta[pathname] || null;
}

// ─────────────────────────────────────────────────────────────────────────────
// The two dynamic routes' meta.
//
// These live here, next to the static table, because two things now need them:
// the page component (which writes the tags once React boots) and
// scripts/prerender.mjs (which bakes them into the HTML the crawler is handed
// before any JS runs). Written twice they would drift, and a prerendered head
// that disagrees with the one React replaces it with is worse than either
// alone — it reads as a page that changes its identity on load.
//
// Both take a record and return {title, description}, unwrapped by composeTitle
// at the call site so the caller decides whether it wants the " | CareerVeda"
// suffix.
// ─────────────────────────────────────────────────────────────────────────────

// Trims to `limit` on a word boundary and adds an ellipsis, so a description
// built from a program's own prose ends as a readable phrase rather than mid-
// word. Google truncates the *display* at ~160 either way; this is about the
// sentence being a sentence, and about the tag not carrying 300 characters of
// text that no search result will ever show.
function clampDescription(value, limit = 160) {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  if (text.length <= limit) return text;

  const cut = text.slice(0, limit - 1);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > limit * 0.6 ? cut.slice(0, lastSpace) : cut).replace(/[,;:.\s]+$/, "")}…`;
}

// Built from the program's own record rather than from a template.
//
// It used to return "<title> at CareerVeda — curriculum, duration, and
// enrolment details." for every program, which meant nine program pages shipped
// nine descriptions that differed only in the course name. Google treats a set
// of near-identical descriptions as a signal that the pages are near-identical
// too, and picks its own snippet from the body instead — so the one piece of
// SERP copy the site controls was being spent saying nothing, nine times.
//
// The subtitle is the program's own positioning line, the duration and format
// are the two facts a course searcher filters on, and the first skills are the
// terms they actually typed. All four already exist in the catalog, so nothing
// here is a claim the page does not make.
export function programMeta(program) {
  if (!program) return null;

  // Two skills, not three. The tail is the part that has to survive: "placement
  // assistance" is the phrase a course searcher scans a result for, and at three
  // skills every one of the nine descriptions ran past 160 and lost it to the
  // ellipsis — the terms were in the tag and absent from the only place a
  // reader sees it.
  const skills = (program.skills || []).slice(0, 2).join(" and ");
  const format = [program.duration, program.format, "program"].filter(Boolean).join(" ");

  const description = [
    program.subtitle && `${program.subtitle}.`,
    skills ? `${format} covering ${skills}` : format,
    "— mentor-led classes, projects and placement assistance.",
  ]
    .filter(Boolean)
    .join(" ");

  return {
    title: program.title,
    description: clampDescription(description),
  };
}

export function blogMeta(post) {
  if (!post) return null;
  return {
    title: post.seo?.title || post.title,
    description: clampDescription(
      post.seo?.description || post.excerpt || post.lead || DEFAULT_DESCRIPTION,
    ),
  };
}
