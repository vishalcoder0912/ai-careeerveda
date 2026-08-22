import {useEffect} from "react";
import {SITE_NAME, SITE_URL, ORGANISATION, OG_IMAGE, absoluteUrl} from "../config/siteMeta";
import {socialLinks} from "../config/externalLinks";

// JSON-LD builders + the hook that mounts them.
//
// Structured data is what lets a result render as something richer than a blue
// link — a course card with a provider, an FAQ that expands in place, a
// breadcrumb trail instead of a raw URL. Google reads JSON-LD after running JS,
// so unlike the social crawlers this does work on a client-rendered site.
//
// Everything below is built only from fields the catalog actually holds. Google
// penalises structured data that claims more than the page shows, so a program
// with no price emits no price rather than a guessed one.

const ORG_ID = `${SITE_URL}/#organization`;

export function organisationSchema() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "EducationalOrganization",
    "@id": ORG_ID,
    name: SITE_NAME,
    // How people actually type the brand. Google matches a query to an entity by
    // name, and "career veda" spelled as two words is a different string from
    // the one in `name` — listing the variants is what connects those searches
    // to this organisation rather than to whatever else the words match.
    alternateName: ORGANISATION.alternateNames,
    description: ORGANISATION.description,
    url: SITE_URL,
    logo: ORGANISATION.logo,
    image: OG_IMAGE,
    email: ORGANISATION.email,
    telephone: ORGANISATION.telephone,
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer support",
      email: ORGANISATION.email,
      telephone: ORGANISATION.telephone,
    },
  };

  // The single strongest signal that this site and those profiles are one
  // organisation. Without it Google has no stated link between careerveda.in and
  // the LinkedIn/Instagram/Facebook pages, so a brand search returns them as
  // unrelated results that happen to share a word. Built from the same list the
  // footer renders, so a profile added there is claimed here too — and an empty
  // one is absent from both rather than becoming a broken claim.
  const profiles = socialLinks.map((link) => link.href);
  if (profiles.length) schema.sameAs = profiles;

  return schema;
}

export function webSiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    name: SITE_NAME,
    url: SITE_URL,
    publisher: {"@id": ORG_ID},
  };
}

// `faqs` is siteData's array of [question, answer] pairs.
export function faqSchema(faqs) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map(([question, answer]) => ({
      "@type": "Question",
      name: question,
      acceptedAnswer: {"@type": "Answer", text: answer},
    })),
  };
}

// `trail` is [{name, path}] ordered root-first.
export function breadcrumbSchema(trail) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.name,
      item: absoluteUrl(crumb.path),
    })),
  };
}

// One post from src/data/blogPosts.js.
//
// The blog's display date is human-written ("July 2026"), which is not a date
// Google can read. datePublished is emitted only when that string parses to a
// real date, because a malformed one invalidates the whole block — worse than
// omitting an optional field.
export function articleSchema(post) {
  const url = absoluteUrl(`/blog/${post.id || post.slug}`);

  const schema = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.seo?.description || post.excerpt || post.lead || "",
    url,
    // Tells Google which URL this article canonically lives at, so the /blog
    // index listing the same text is not read as a duplicate.
    mainEntityOfPage: {"@type": "WebPage", "@id": url},
    author: {"@type": "Organization", name: post.author || SITE_NAME, url: SITE_URL},
    publisher: {"@id": ORG_ID},
  };

  if (post.image) schema.image = post.image;
  if (post.category) schema.articleSection = post.category;
  if (post.tags?.length) schema.keywords = post.tags.join(", ");

  const published = parseDisplayDate(post.date);
  if (published) schema.datePublished = published;

  return schema;
}

// "July 2026" -> "2026-07-01". Returns null for anything Date cannot read, so a
// post with a freeform date string emits no datePublished rather than a wrong
// one. Day-less strings are normalised to the first of the month, which is what
// the string actually claims.
//
// Formatted from local components rather than toISOString(): the parsed value is
// local midnight, and in IST that converts back to the previous day in UTC — so
// every post would publish a date one day earlier than it prints on the page.
function parseDisplayDate(value) {
  if (!value) return null;
  // Already a date-only ISO string: pass it through untouched. Round-tripping it
  // through Date would reintroduce exactly the timezone shift described above.
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);

  const parsed = new Date(`1 ${value}`);
  if (Number.isNaN(parsed.getTime())) return null;

  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");
  return `${parsed.getFullYear()}-${month}-${day}`;
}

// The /programs hub, as an ordered list of the courses it links to.
//
// A category page's job in search is to be understood as the index of a set,
// not as one more page that happens to mention nine course names. ItemList is
// how that is stated: each entry names a Course and the URL it lives at, so the
// hub and the nine detail pages read as one structure rather than ten unrelated
// documents competing for the same queries.
//
// Only name and url per item — the detail page emits the full Course block, and
// repeating duration, price and provider here would be two sources for the same
// facts with nothing keeping them in step.
export function programListSchema(programs) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "@id": `${absoluteUrl("/programs")}#programs`,
    name: `${SITE_NAME} programs`,
    numberOfItems: programs.length,
    itemListElement: programs.map((program, index) => ({
      "@type": "ListItem",
      position: index + 1,
      item: {
        "@type": "Course",
        name: program.fullTitle || program.title,
        url: absoluteUrl(`/programs/${program.id}`),
        provider: {"@id": ORG_ID},
      },
    })),
  };
}

// One program record from programCatalog.js.
//
// Course requires a provider and benefits from hasCourseInstance. The instance
// carries courseMode/duration; both are ISO 8601 durations, so "6 Months" has to
// become "P6M" — Google ignores the field otherwise.
export function courseSchema(program) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Course",
    name: program.fullTitle || program.title,
    description: program.description,
    url: absoluteUrl(`/programs/${program.id}`),
    provider: {
      "@type": "EducationalOrganization",
      name: SITE_NAME,
      url: SITE_URL,
      "@id": ORG_ID,
    },
  };

  if (program.image) schema.image = program.image;
  if (program.skills?.length) schema.teaches = program.skills;

  const months = parseMonths(program.duration);
  const instance = {
    "@type": "CourseInstance",
    // The catalog's `format` is "Live Online" across the board; schema.org's
    // vocabulary for that is "Online".
    courseMode: "Online",
  };
  if (months) instance.courseWorkload = `P${months}M`;
  schema.hasCourseInstance = instance;

  // Only priced programs get an offer. Several records deliberately omit `fee`
  // (see the note at the top of programCatalog.js), and an Offer without a price
  // is an invalid offer.
  const price = parseRupees(program.fee?.amount || program.startingPrice);
  if (price) {
    schema.offers = {
      "@type": "Offer",
      price,
      priceCurrency: "INR",
      category: "Paid",
      url: absoluteUrl(`/programs/${program.id}`),
      availability: "https://schema.org/InStock",
    };
  }

  return schema;
}

// "6 Months" -> 6. Returns null for anything it cannot read, so the caller emits
// no duration rather than a wrong one.
function parseMonths(duration) {
  const match = /(\d+)\s*month/i.exec(duration || "");
  return match ? Number(match[1]) : null;
}

// "₹1,45,000" -> "145000". Indian digit grouping, so this strips every
// non-digit rather than assuming three-digit groups.
function parseRupees(value) {
  if (!value) return null;
  const digits = String(value).replace(/[^\d]/g, "");
  return digits || null;
}

// Mounts one or more JSON-LD blocks for as long as the component is mounted.
// `id` namespaces the <script> so a route replacing its own schema updates in
// place, and unmounting removes it — otherwise navigating away would leave the
// previous page's Course data on the next page, describing something that is no
// longer there.
export function useJsonLd(id, schema) {
  // Serialised outside the effect so a caller passing a freshly-built object
  // literal (which every caller does) doesn't re-run it on every render — the
  // string is the dependency, and it is also what gets written.
  const json = schema ? JSON.stringify(schema) : null;

  useEffect(() => {
    if (!json) return undefined;

    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.dataset.seoId = id;
    script.textContent = json;

    document.head.querySelector(`script[data-seo-id="${id}"]`)?.remove();
    document.head.appendChild(script);

    return () => script.remove();
  }, [id, json]);
}
