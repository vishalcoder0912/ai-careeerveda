// Translates an API record back into the shape the components already render.
//
// These are the exact inverse of backend/scripts/migrate-content.js, which is
// what put the static files into MongoDB in the first place. Keeping the
// translation here — rather than changing every component to speak the API's
// field names — means the static files stay a working fallback: both sources
// produce one shape, and no component knows which one it got.
//
// Two differences account for nearly all of it:
//   • the static files key on `id`, the API on `slug` (same value, and the
//     Mongoose `id` virtual is an ObjectId, so `id` is always overwritten after
//     the spread, never before);
//   • an image is a bare URL string in the static files and a media reference
//     ({url, alt, width, height}) in the API.

import {initialsOf} from "../data/mentors";
import {avatarPlaceholder} from "../data/alumniSpotlight";

// A media reference down to the URL the components expect. Tolerates a plain
// string so an adapter can be run over static data harmlessly.
const mediaUrl = (value) => {
  if (!value) return "";
  if (typeof value === "string") return value;
  return value.url || value.thumbnailUrl || "";
};

// API records created before the blog CTA was introduced may not carry this
// object at all. A durable fallback keeps both those records and intentionally
// minimal new posts readable, while the admin form still lets an editor choose
// a specific destination and label.
const DEFAULT_BLOG_CTA = {label: "Explore CareerVeda programs", url: "/programs"};

const blogCta = (value) => ({
  label:
    typeof value?.label === "string" && value.label.trim()
      ? value.label.trim()
      : DEFAULT_BLOG_CTA.label,
  url:
    typeof value?.url === "string" && value.url.trim()
      ? value.url.trim()
      : DEFAULT_BLOG_CTA.url,
});

// "2026-07-13T00:00:00.000Z" -> "2026-07-13". The job card prints this string
// verbatim, and the static file carries the date-only form.
const dateOnly = (value) => (typeof value === "string" ? value.slice(0, 10) : "");

// Every post in the static file ships with a cover image, so the blog grid was
// written assuming one — the card simply omits the media block when it is
// missing. A post published from the admin panel without a cover therefore
// lands in the grid as a text-only card beside twenty illustrated ones, which
// reads as broken rather than as a deliberate omission.
//
// The same treatment as an alumnus with no portrait: generate something that
// belongs to the set. The colour is picked from the slug, so a given post keeps
// the same cover on every render and across reloads rather than flickering
// between colours, and two posts side by side are unlikely to match.
const COVER_ACCENTS = [
  ["#0f766e", "#042f2e"],
  ["#2563eb", "#0b1e46"],
  ["#c2410c", "#3c1206"],
  ["#be185d", "#3f0620"],
  ["#0369a1", "#052a3f"],
  ["#6d28d9", "#22084d"],
];

const accentFor = (seed) => {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  return COVER_ACCENTS[Math.abs(hash) % COVER_ACCENTS.length];
};

// & < > would otherwise close the attribute or the tag once this is inlined as
// a data URI — "M&A Deals Explained" is a real title in this very collection.
// Quotes included, because the one caller interpolates the result into an
// attribute (aria-label="…") as well as into text. Escaping only &, < and >
// leaves a value containing a double quote free to close the attribute and open
// another one — the markup is then well-formed and says something we did not
// write. & must stay first or it would re-escape the ampersands the later
// replacements introduce.
const escapeXml = (value) =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

const coverPlaceholder = (record) => {
  const [accent, accentEnd] = accentFor(record.slug || record.title || "");
  // The category is the most useful thing to show — it is what the filter bar
  // above the grid sorts by, so the cover echoes the chip the reader just clicked.
  const label = escapeXml(record.category || record.tag || "Article");

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500" role="img" aria-label="${label}">
      <defs>
        <linearGradient id="background" x1="0" y1="0" x2="1" y2="1">
          <stop stop-color="${accent}" />
          <stop offset="1" stop-color="${accentEnd}" />
        </linearGradient>
      </defs>
      <rect width="800" height="500" fill="url(#background)" />
      <circle cx="650" cy="90" r="220" fill="#fff" opacity=".10" />
      <circle cx="120" cy="440" r="200" fill="#02060f" opacity=".16" />
      <text x="400" y="268" text-anchor="middle" fill="#fff" font-family="Inter, Arial, sans-serif" font-size="44" font-weight="700" letter-spacing="-1">${label}</text>
    </svg>`;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
};

// The admin panel edits one price field, `startingPrice`. The detail page's fee
// panel, the "Enroll Now - ₹X" button, the WhatsApp message and the enrol lead
// all read the `fee` object instead, which nothing in the admin can touch — so
// an edited price showed on the /programs card and nowhere else, and on a
// migrated program the fee panel kept printing the price it was seeded with.
// startingPrice wins; the migrated fee object only supplies the wording.
const programFee = (record) => {
  const amount = record.startingPrice || record.fee?.amount;
  if (!amount) return null;
  return {
    label: record.fee?.label || "Program Investment",
    amount,
    note: record.fee?.note || "",
  };
};

export const adaptProgram = (record) => ({
  ...record,
  id: record.slug,
  image: mediaUrl(record.image),
  fee: programFee(record),
});

export const adaptFaculty = (record) => ({
  ...record,
  id: record.slug,
  photo: mediaUrl(record.photo),
});

export const adaptAlumni = (record) => {
  const initials = initialsOf(record.name || "");
  const accent = record.accent || "#0f766e";
  const accentEnd = record.accentEnd || "#164e63";

  return {
    ...record,
    id: record.slug,
    initials,
    accent,
    accentEnd,
    // The migration split "Product Manager at Razorpay" style strings into role
    // and company on the way in; this puts them back together the way the
    // spotlight card prints them.
    role: [record.currentRole, record.currentCompany].filter(Boolean).join(", "),
    hike: record.percentageHike || "",
    story: record.story || record.quote || "",
    // Same precedence the static file uses: a real portrait if there is one,
    // otherwise the generated monogram — never a broken image frame.
    image: mediaUrl(record.image) || avatarPlaceholder({initials, accent, accentEnd}),
  };
};

// The /alumni review grid destructures its records positionally, the way
// siteData exports them: [name, role, quote, program, photo].
export const adaptAlumniReview = (record) => {
  const profile = adaptAlumni(record);
  return [profile.name, profile.role, profile.story, profile.programTitle || "", profile.image];
};

export const adaptBlogPost = (record) => ({
  ...record,
  // Static posts use `id`; Mongoose records use `slug`. Supporting both is
  // what makes /blog/:slug work offline as well as for an admin-created post.
  id: record.slug || record.id,
  image: mediaUrl(record.image) || coverPlaceholder(record),
  highlights: Array.isArray(record.highlights) ? record.highlights : [],
  cta: blogCta(record.cta),
});

export const adaptJob = (record) => ({
  ...record,
  id: record.slug,
  experience: record.experienceLevel || "",
  jobType: record.employmentType || "",
  salary: record.salaryRange || "",
  applyUrl: record.applicationUrl || "",
  postedDate: dateOnly(record.postedDate),
});

export const adaptPolicy = (record) => ({
  slug: record.slug,
  eyebrow: record.eyebrow || "Legal",
  title: record.title,
  lead: record.lead || "",
  updated: record.updated || "",
  stats: record.stats || [],
  sections: record.sections || [],
});

// PolicyPage looks policies up by slug in an object, and the footer renders the
// list in order. Both come from the same array so a policy is linked exactly
// when it is reachable.
export const adaptPolicyMap = (records) =>
  Object.fromEntries(records.map((record) => [record.slug, adaptPolicy(record)]));

// siteData exports FAQs as [question, answer] tuples and the home page
// destructures them positionally.
export const adaptFaq = (record) => [record.question, record.answer];
