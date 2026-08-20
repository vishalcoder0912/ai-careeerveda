import {z} from "zod";

import {CONTENT_STATUSES} from "../models/plugins/contentPlugin.js";
import {stripTags, isValidSlug} from "../utils/sanitize.js";

// Zod is the mass-assignment boundary. validate() replaces req.body with the
// parsed result, so a field absent from a schema below cannot reach the model —
// no amount of extra JSON gets `createdBy`, `revision` or `deletedAt` set by a
// caller.

// Every free-text field passes through stripTags. Content is structured, never
// HTML, so a "<" in a heading is always either a mistake or an attack.
const text = (max) =>
  z.string().max(max).transform(stripTags);

const optionalText = (max) => text(max).optional().default("");

const stringArray = (max = 200, itemMax = 2000) =>
  z.array(z.string().max(itemMax).transform(stripTags)).max(max).optional().default([]);

const objectId = z.string().regex(/^[a-f0-9]{24}$/i, "Invalid id");

// Navigation belongs to a deliberately small URL vocabulary. Relative paths
// keep a CTA inside the app; only http(s) may leave it. In particular, a blog
// CTA must never turn into a javascript: URL when an editor pastes a value.
const navigationUrl = z.string().max(1000).refine(
  (value) => value === "" || /^https?:\/\//i.test(value) || value.startsWith("/"),
  "URL must be http(s) or a site-relative path",
);

const mediaRef = z
  .object({
    media: objectId.nullish(),
    // URLs are checked for scheme rather than merely being strings: a
    // `javascript:` value in an image src is an XSS vector on some renderers.
    url: navigationUrl.optional().default(""),
    fileId: z.string().max(120).optional().default(""),
    thumbnailUrl: z.string().max(1000).optional().default(""),
    alt: optionalText(300),
    caption: optionalText(500),
    width: z.number().int().positive().nullish(),
    height: z.number().int().positive().nullish(),
  })
  .optional();

const seo = z
  .object({
    title: optionalText(200),
    description: optionalText(400),
    keywords: stringArray(30, 80),
    ogImage: z.string().max(1000).optional().default(""),
    canonicalUrl: z.string().max(1000).optional().default(""),
    noIndex: z.boolean().optional().default(false),
  })
  .optional();

// Fields every content type accepts. Status is deliberately absent — it moves
// only through the publish/unpublish endpoints.
const base = {
  slug: z.string().max(140).refine(isValidSlug, "Slug may contain only lowercase letters, numbers and hyphens").optional(),
  featured: z.boolean().optional(),
  displayOrder: z.number().int().min(-10000).max(10000).optional(),
  seo,
};

export const programBody = z.object({
  ...base,
  title: text(300),
  fullTitle: optionalText(300),
  shortTitle: optionalText(160),
  subtitle: optionalText(300),
  category: optionalText(80),
  description: optionalText(4000),
  lead: optionalText(4000),
  duration: optionalText(80),
  mentorship: stringArray(10, 160),
  format: optionalText(120),
  eligibility: optionalText(500),
  image: mediaRef,
  heroMedia: mediaRef,
  badges: stringArray(20, 120),
  overview: stringArray(50),
  curriculumIntro: optionalText(2000),
  curriculum: stringArray(100),
  modules: z
    .array(
      z.object({
        n: z.number().int().min(0).max(999).nullish(),
        title: optionalText(300),
        duration: optionalText(60),
        points: stringArray(60),
      }),
    )
    .max(60)
    .optional()
    .default([]),
  outcomes: stringArray(50),
  gainsIntro: optionalText(2000),
  gains: stringArray(50),
  skills: stringArray(60, 120),
  tools: stringArray(60, 120),
  softSkills: stringArray(60, 200),
  internship: stringArray(40),
  learners: optionalText(60),
  projects: optionalText(60),
  startingPrice: optionalText(60),
  fee: z
    .object({label: optionalText(120), amount: optionalText(60), note: optionalText(200)})
    .nullish(),
  emi: optionalText(300),
  guarantee: optionalText(300),
  nextBatch: optionalText(120),
  // Not defaulted: a PATCH that never mentions it must not reset a program an
  // editor set to custom. The model defaults it to "auto" on create.
  nextBatchMode: z.enum(["auto", "custom"]).optional(),
  seats: optionalText(120),
  faqs: z
    .array(z.object({question: text(500), answer: text(4000)}))
    .max(60)
    .optional()
    .default([]),
  gallery: z.array(mediaRef.unwrap()).max(60).optional().default([]),
  mentors: z.array(objectId).max(50).optional(),
  relatedPrograms: z.array(objectId).max(20).optional(),
  brochureUrl: z.string().max(1000).optional().default(""),
});

export const facultyBody = z.object({
  ...base,
  name: text(160),
  discipline: optionalText(80),
  role: optionalText(300),
  designation: optionalText(200),
  company: optionalText(200),
  description: optionalText(500),
  bio: optionalText(8000),
  shortBio: optionalText(600),
  photo: mediaRef,
  coverImage: mediaRef,
  education: optionalText(1000),
  experience: optionalText(1000),
  specialization: optionalText(1000),
  achievements: stringArray(40, 500),
  expertise: stringArray(40, 200),
  socialLinks: z
    .object({
      linkedin: z.string().max(500).optional().default(""),
      twitter: z.string().max(500).optional().default(""),
      github: z.string().max(500).optional().default(""),
      website: z.string().max(500).optional().default(""),
    })
    .optional(),
  associatedPrograms: z.array(objectId).max(50).optional(),
});

export const alumniBody = z.object({
  ...base,
  name: text(160),
  image: mediaRef,
  companyLogo: mediaRef,
  previousRole: optionalText(200),
  currentRole: optionalText(200),
  previousCompany: optionalText(200),
  currentCompany: optionalText(200),
  program: objectId.nullish(),
  programTitle: optionalText(300),
  graduationYear: optionalText(20),
  salaryBefore: optionalText(60),
  salaryAfter: optionalText(60),
  percentageHike: optionalText(40),
  quote: optionalText(1000),
  story: optionalText(8000),
  skills: stringArray(40, 120),
  testimonialVideo: z.string().max(1000).optional().default(""),
  accent: optionalText(20),
  accentEnd: optionalText(20),
  showOnAlumniPage: z.boolean().optional(),
});

export const blogBody = z.object({
  ...base,
  title: text(300),
  category: optionalText(80),
  tag: optionalText(80),
  tags: stringArray(30, 80),
  author: optionalText(160),
  date: optionalText(60),
  readTime: optionalText(40),
  excerpt: optionalText(2000),
  lead: optionalText(4000),
  sections: z
    .array(z.object({heading: optionalText(300), body: stringArray(80, 6000)}))
    .max(80)
    .optional()
    .default([]),
  highlights: stringArray(20, 300),
  cta: z
    .object({label: optionalText(160), url: navigationUrl.optional().default("")})
    .optional(),
  image: mediaRef,
  gallery: z.array(mediaRef.unwrap()).max(60).optional().default([]),
  relatedPosts: z.array(objectId).max(20).optional(),
});

export const jobBody = z.object({
  ...base,
  title: text(300),
  company: optionalText(200),
  companyLogo: mediaRef,
  location: optionalText(200),
  workMode: optionalText(60),
  employmentType: optionalText(60),
  experienceLevel: optionalText(80),
  description: optionalText(6000),
  requirements: stringArray(50),
  responsibilities: stringArray(50),
  skills: stringArray(40, 120),
  salaryRange: optionalText(120),
  applicationUrl: z.string().max(1000).optional().default(""),
  applicationEmail: z.string().max(254).optional().default(""),
  source: optionalText(120),
  postedDate: z.coerce.date().nullish(),
  deadline: z.coerce.date().nullish(),
});

export const policyBody = z.object({
  ...base,
  title: text(300),
  eyebrow: optionalText(80),
  lead: optionalText(1000),
  updated: optionalText(80),
  effectiveDate: z.coerce.date().nullish(),
  version: optionalText(20),
  stats: z.array(z.object({value: optionalText(60), label: optionalText(160)})).max(12).optional().default([]),
  sections: z
    .array(
      z.object({
        id: optionalText(100),
        heading: optionalText(300),
        body: stringArray(60, 6000),
        callout: optionalText(2000),
        list: stringArray(60, 2000),
        groups: z
          .array(z.object({title: optionalText(300), list: stringArray(60, 2000)}))
          .max(30)
          .optional()
          .default([]),
        closing: optionalText(2000),
      }),
    )
    .max(80)
    .optional()
    .default([]),
});

export const faqBody = z.object({
  ...base,
  question: text(500),
  answer: text(4000),
  category: optionalText(80),
  relatedEntityType: z.enum(["Program", "Faculty", "Alumni", "Blog", "Job", "Policy"]).nullish(),
  relatedEntityId: objectId.nullish(),
});

// ── Shared query and action schemas ─────────────────────────────────────────

export const listQuery = z.object({
  page: z.coerce.number().int().min(1).max(10000).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  search: z.string().max(200).optional(),
  status: z.enum(CONTENT_STATUSES).optional(),
  category: z.string().max(80).optional(),
  featured: z
    .enum(["true", "false"])
    .transform((value) => value === "true")
    .optional(),
  sort: z.string().max(40).optional(),
  order: z.enum(["asc", "desc"]).optional(),
  includeDeleted: z
    .enum(["true", "false"])
    .transform((value) => value === "true")
    .optional(),
  // The trash: deleted records only, which is what a "restore something I threw
  // away" screen needs. includeDeleted returns both and cannot answer that.
  deleted: z
    .enum(["true", "false"])
    .transform((value) => value === "true")
    .optional(),
});

// The public listing accepts a deliberately narrower set: no status, no
// includeDeleted, so neither can be smuggled in as a query parameter.
export const publicListQuery = z.object({
  page: z.coerce.number().int().min(1).max(10000).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  search: z.string().max(200).optional(),
  category: z.string().max(80).optional(),
  featured: z
    .enum(["true", "false"])
    .transform((value) => value === "true")
    .optional(),
  // Alumni only — the /alumni review grid asks for its own selection. Harmless
  // on the other resources: nothing sets the field, so nothing matches, and no
  // page requests it.
  showOnAlumniPage: z
    .enum(["true", "false"])
    .transform((value) => value === "true")
    .optional(),
  sort: z.string().max(40).optional(),
  order: z.enum(["asc", "desc"]).optional(),
});

export const idParam = z.object({id: objectId});

export const slugParam = z.object({
  slug: z.string().max(140).refine(isValidSlug, "Invalid slug"),
});

export const publishBody = z.object({
  scheduledAt: z.coerce.date().optional(),
});

// Rejecting is archiving with an explanation. The reason is optional so the
// existing archive button keeps working unchanged.
export const archiveBody = z.object({
  reason: text(500).optional(),
});

// Zod's .optional() accepts `undefined` but rejects `null`, and the panel sends
// back whatever it loaded. Mongoose stores null as the default on several
// optional paths — a media ref's `media`, `width` and `height`, a module's `n` —
// and older records can hold null anywhere, so a field nobody touched round-
// trips as `heroMedia: null` and is refused. The editor then reported "Please
// check the highlighted fields" while highlighting nothing, because the field it
// was complaining about was one the author had never opened.
//
// Dropping a null means "leave this as it is", which is the right reading: every
// content field has a schema default, and the panel clears a field by sending ""
// or {} — never null. See the round-trip test in tests/content.test.js.
const dropNulls = (value) =>
  value && typeof value === "object" && !Array.isArray(value)
    ? Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== null))
    : value;

/** A create body, tolerant of the nulls a round-tripped record carries. */
export const contentBody = (schema) => z.preprocess(dropNulls, schema);

export const updateBody = (schema) =>
  // partial() so a PATCH can send one field. `revision` rides alongside for the
  // optimistic-concurrency check and is stripped before the model sees it.
  z.preprocess(
    dropNulls,
    schema.partial().extend({revision: z.coerce.number().int().min(1).optional()}),
  );

export const bulkBody = z.object({
  ids: z.array(objectId).min(1).max(100),
});

export const bulkStatusBody = z.object({
  ids: z.array(objectId).min(1).max(100),
  status: z.enum(CONTENT_STATUSES),
});

export const reorderBody = z.object({
  items: z
    .array(z.object({id: objectId, displayOrder: z.number().int().min(-10000).max(10000)}))
    .min(1)
    .max(200),
});

export const rollbackParam = z.object({
  id: objectId,
  revision: z.coerce.number().int().min(1),
});
