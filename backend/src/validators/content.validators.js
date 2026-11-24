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
// "//evil.com" and "/\evil.com" start with "/" but browsers resolve both as
// a different host, so a "relative" path must not begin with either.
const navigationUrl = z.string().max(1000).refine(
  (value) => value === "" || /^https?:\/\//i.test(value) || /^\/(?![/\\])/.test(value),
  "URL must be http(s) or a site-relative path",
);

// Strictly off-site links (social profiles, brochures): http(s) or blank. Every
// one of these lands in an href or src, where a javascript: value is stored XSS.
const externalUrl = (max = 1000) =>
  z.string().max(max).refine((value) => value === "" || /^https?:\/\//i.test(value), "URL must start with http(s)");

const mediaRef = z
  .object({
    media: objectId.nullish(),
    // URLs are checked for scheme rather than merely being strings: a
    // `javascript:` value in an image src is an XSS vector on some renderers.
    url: navigationUrl.optional().default(""),
    fileId: z.string().max(120).optional().default(""),
    thumbnailUrl: externalUrl().optional().default(""),
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
    canonicalUrl: navigationUrl.optional().default(""),
    noIndex: z.boolean().optional().default(false),
  })
  .optional();

// ── Cinematic page overrides ─────────────────────────────────────────────────
// The Product Management landing page used to be entirely hand-written. Editors
// now store a partial `cinematic` object on the programme; the page merges it
// over its built-in copy at runtime. Every string below still goes through
// stripTags — structured content is never HTML, including nested JSON.
const footerUrl = z.string().max(1000).refine(
  (value) => value === "" || /^https?:\/\//i.test(value) || /^(mailto|tel):/i.test(value) || /^\/(?![/\\])/.test(value),
  "URL must be http(s), mailto, tel or a site-relative path",
);

const cineList = (max = 30, itemMax = 300) => z.array(text(itemMax)).max(max);
const headingLine = z.union([text(300), z.object({em: text(300)}).strict()]);
const heading = z.array(headingLine).max(12);
// One token vocabulary for every cinematic page. The public site maps these to
// the same lucide components regardless of which programme saved them.
const cineIcon = z.enum([
  "BarChart3", "BookOpen", "Bot", "BrainCircuit", "Briefcase", "Camera", "Code2",
  "Compass", "Cpu", "Database", "FileText", "Fingerprint", "FolderKanban", "Gauge",
  "GitBranch", "GraduationCap", "Layers", "Lock", "Mail", "MapIcon", "MessageCircle",
  "Network", "PenTool", "Phone", "Puzzle", "Radar", "Rocket", "Search", "ServerCog",
  "ShieldCheck", "Trophy", "TrendingUp", "Users", "Wrench", "Zap",
]);
const cinePalette = z.enum(["ember", "gold", "bronze", "tangerine", "brass"]);
const cineLevel = z.enum(["Fresher", "Mid-level", "Experienced"]);
const cineStatKey = z.enum([
  "months", "modules", "assignments", "projects", "tools", "certifications",
]);
const cineSystemArt = z.enum([
  "product", "people", "discover", "compass", "map", "design", "gear",
  "data", "genai", "megaphone", "moneybag",
]);

// Artwork keys are the five stage slots the cinematic component reads by id.
// Values are art tokens ("discover") or a site-relative image path.
const cineArtMap = z
  .object({
    "01": text(160).optional(),
    "02": text(160).optional(),
    "03": text(160).optional(),
    "04": text(160).optional(),
    "05": text(160).optional(),
  })
  .strict();

// The Gen AI flagship maps external learning to its 24 weeks. It is copy, not a
// live fact, so editors may change it — but the shape and the URL-free text
// rules stay exactly as strict as every other cinematic section.
const cineRoadmap = z
  .object({
    title: text(300).optional(),
    sub: text(1000).optional(),
    rows: z
      .array(
        z
          .object({
            stage: text(160).optional(),
            weeks: text(160).optional(),
            credential: text(300).optional(),
            provider: text(200).optional(),
            cost: text(200).optional(),
          })
          .strict(),
      )
      .max(40)
      .optional(),
    narrative: cineList(20, 120).optional(),
    caveat: text(2000).optional(),
  })
  .strict();

const cinematic = z
  .object({
    hero: z
      .object({
        eyebrow: text(200).optional(),
        title: heading.optional(),
        sub: text(1000).optional(),
        badges: cineList(20, 120).optional(),
        metaLeft: text(200).optional(),
        ariaLabel: text(300).optional(),
        stats: z.array(z.tuple([text(160), text(160)])).max(10).optional(),
        metaRight: text(200).optional(),
        image: mediaRef,
      })
      .strict()
      .optional(),
    timeline: z
      .object({
        label: text(300).optional(),
        title: heading.optional(),
        items: z
          .array(
            z
              .object({
                num: text(20).optional(),
                year: text(60).optional(),
                // The "Load current page copy" button stores the module range
                // used to derive `year`; the page re-derives it on every render.
                from: z.number().int().min(1).max(999).optional(),
                to: z.number().int().min(1).max(999).optional(),
                title: text(300).optional(),
                description: text(1000).optional(),
                tags: cineList(10, 120).optional(),
                image: navigationUrl.optional(),
              })
              .strict(),
          )
          .max(20)
          .optional(),
      })
      .strict()
      .optional(),
    skills: z
      .object({
        label: text(200).optional(),
        title: heading.optional(),
        sub: text(500).optional(),
        tag: text(200).optional(),
        items: z
          .array(
            z
              .object({
                id: text(20).optional(),
                title: text(200).optional(),
                stack: cineList(20, 120).optional(),
                icon: cineIcon.optional(),
                palette: cinePalette.optional(),
                intro: text(500).optional(),
              })
              .strict(),
          )
          .max(12)
          .optional(),
      })
      .strict()
      .optional(),
    quote: z
      .object({lines: cineList(8, 200).optional(), cite: text(300).optional()})
      .strict()
      .optional(),
    architecture: z
      .object({
        label: text(200).optional(),
        title: heading.optional(),
        sub: text(500).optional(),
        layers: z
          .array(
            z
              .object({layer: text(20).optional(), title: text(200).optional(), note: text(500).optional()})
              .strict(),
          )
          .max(30)
          .optional(),
      })
      .strict()
      .optional(),
    modules: z
      .object({
        label: text(200).optional(),
        title: heading.optional(),
        sub: text(1000).optional(),
        unit: text(60).optional(),
        stages: z
          .array(
            z
              .object({
                id: text(20).optional(),
                title: text(200).optional(),
                range: text(60).optional(),
                description: text(600).optional(),
                motif: text(60).optional(),
                // Some programmes (AI Systems) number their first module 0.
                from: z.number().int().min(0).max(999).optional(),
                to: z.number().int().min(0).max(999).optional(),
                weeks: z
                  .array(
                    z
                      .object({
                        id: text(40).optional(),
                        title: text(300).optional(),
                        topics: cineList(40, 300).optional(),
                        build: text(500).optional(),
                      })
                      .strict(),
                  )
                  .max(60)
                  .optional(),
              })
              .strict(),
          )
          .max(20)
          .optional(),
        art: cineArtMap.optional(),
        lockCard: z
          .object({
            programId: text(140).optional(),
            badge: text(20).optional(),
            title: text(200).optional(),
            range: text(120).optional(),
            description: text(1000).optional(),
          })
          .strict()
          .optional(),
        tracksLabel: text(300).optional(),
        tracks: z
          .array(z.object({title: text(200).optional(), range: text(120).optional()}).strict())
          .max(40)
          .optional(),
      })
      .strict()
      .optional(),
    system: z
      .object({
        label: text(200).optional(),
        title: heading.optional(),
        sub: text(500).optional(),
        center: z
          .object({title: text(120).optional(), sub: text(200).optional(), art: text(160).optional()})
          .strict()
          .optional(),
        nodes: z
          .array(
            z
              .object({label: text(120).optional(), icon: cineSystemArt.optional(), img: navigationUrl.optional()})
              .strict(),
          )
          .max(30)
          .optional(),
      })
      .strict()
      .optional(),
    workflow: z
      .object({
        label: text(200).optional(),
        title: heading.optional(),
        lead: text(1000).optional(),
        pipeline: cineList(20, 80).optional(),
        steps: z
          .array(z.object({title: text(200).optional(), note: text(500).optional()}).strict())
          .max(30)
          .optional(),
      })
      .strict()
      .optional(),
    projects: z
      .object({
        items: z
          .array(
            z
              .object({
                id: text(20).optional(),
                name: text(200).optional(),
                stack: cineList(20, 120).optional(),
                description: text(1000).optional(),
                accent: cinePalette.optional(),
              })
              .strict(),
          )
          .max(40)
          .optional(),
        categories: cineList(40, 120).optional(),
        sideLeft: cineList(20, 120).optional(),
        sideRight: cineList(20, 120).optional(),
        footLeft: text(300).optional(),
        footRight: text(300).optional(),
      })
      .strict()
      .optional(),
    careers: z
      .object({
        label: text(200).optional(),
        title: heading.optional(),
        lead: text(500).optional(),
        roles: z
          .array(
            z
              .object({
                role: text(200).optional(),
                level: cineLevel.optional(),
                domain: text(300).optional(),
                description: text(600).optional(),
                skills: cineList(20, 120).optional(),
                salary: text(60).optional(),
                // Newer roles on the Gen AI flagship have no documented band of
                // their own; they show the closest mapped role instead.
                salaryVaried: z.boolean().optional(),
                salaryMappedTo: text(200).optional(),
                salaryMappedRange: text(60).optional(),
                years: text(60).optional(),
                location: text(120).optional(),
                year: z.number().int().min(2000).max(2100).optional(),
                source: text(300).optional(),
              })
              .strict(),
          )
          .max(40)
          .optional(),
      })
      .strict()
      .optional(),
    stats: z
      .object({
        label: text(200).optional(),
        items: z
          .array(
            z
              .object({
                key: cineStatKey.optional(),
                value: z.number().finite().optional(),
                suffix: text(20).optional(),
                label: text(200).optional(),
                note: text(200).optional(),
              })
              .strict(),
          )
          .max(20)
          .optional(),
      })
      .strict()
      .optional(),
    learning: z
      .object({
        label: text(200).optional(),
        title: heading.optional(),
        items: z
          .array(
            z
              .object({title: text(200).optional(), note: text(500).optional(), icon: cineIcon.optional()})
              .strict(),
          )
          .max(30)
          .optional(),
      })
      .strict()
      .optional(),
    certs: z
      .object({
        label: text(200).optional(),
        title: heading.optional(),
        lede: text(1000).optional(),
        certificates: z
          .array(
            z
              .object({
                mark: text(60).optional(),
                title: text(300).optional(),
                focus: text(300).optional(),
                stage: text(160).optional(),
                outcome: text(1000).optional(),
                skills: cineList(20, 120).optional(),
              })
              .strict(),
          )
          .max(12)
          .optional(),
        proofPillars: z
          .array(
            z
              .object({title: text(200).optional(), note: text(500).optional(), icon: cineIcon.optional()})
              .strict(),
          )
          .max(12)
          .optional(),
        roadmap: cineRoadmap.optional(),
        note: text(1000).optional(),
      })
      .strict()
      .optional(),
    cta: z
      .object({
        label: text(200).optional(),
        title: heading.optional(),
        sub: text(500).optional(),
        meta: cineList(10, 300).optional(),
      })
      .strict()
      .optional(),
    footer: z
      .object({
        title: heading.optional(),
        channels: z
          .array(
            z
              .object({
                label: text(120).optional(),
                value: text(200).optional(),
                href: footerUrl.optional(),
                icon: cineIcon.optional(),
                external: z.boolean().optional(),
              })
              .strict(),
          )
          .max(12)
          .optional(),
      })
      .strict()
      .optional(),
  })
  .strict()
  .optional()
  .default({});

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
        deliverable: optionalText(300),
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
  brochureUrl: navigationUrl.optional().default(""),
  // Optional page overrides; an empty object means "use the built-in copy".
  cinematic,
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
      linkedin: externalUrl(500).optional().default(""),
      twitter: externalUrl(500).optional().default(""),
      github: externalUrl(500).optional().default(""),
      website: externalUrl(500).optional().default(""),
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
  showOnCareerPage: z.boolean().optional(),
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
  department: optionalText(120),
  vacancies: z.number().int().min(0).nullish(),
  description: optionalText(6000),
  // Every field the public job-details modal renders is accepted here, so an
  // editor can fill a section instead of discovering the input does not exist.
  // The long-form fields mirror the limits on the Job model.
  jobOverview: optionalText(6000),
  aboutCompany: optionalText(6000),
  requirements: stringArray(50),
  // Kept alongside requirements: aggregator records carry both, and the public
  // modal shows the two lists together.
  qualifications: stringArray(50),
  responsibilities: stringArray(50),
  skills: stringArray(40, 120),
  preferredSkills: stringArray(40, 120),
  educationRequirements: optionalText(2000),
  benefits: stringArray(40),
  salaryRange: optionalText(120),
  salaryMin: z.number().int().min(0).nullish(),
  salaryMax: z.number().int().min(0).nullish(),
  // The admin editor exposes this as an Applications toggle. Older records and
  // imports that omit it must still mean "accepting", so a job never silently
  // rejects candidates just because it was saved before the toggle existed.
  acceptsApplications: z.boolean().optional().default(true),
  // http(s) or blank: the value lands in an Apply button's href, and a blank
  // one falls back to a LinkedIn search on the site.
  applicationUrl: z
    .string()
    .max(1000)
    .refine((value) => value === "" || /^https?:\/\//i.test(value), "URL must start with http(s)")
    .optional()
    .default(""),
  applicationEmail: z.string().max(254).optional().default(""),
  source: optionalText(120),
  postedDate: z.coerce.date().nullish(),
  deadline: z.coerce.date().nullish(),
  applicationDeadline: z.coerce.date().nullish(),
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
  // Alumni only — the program detail pages' Career Outcomes testimonials. Same
  // treatment: a query parameter nobody else sends is simply never applied.
  showOnCareerPage: z
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

export const updateBody = (schema) => {
  // partial() so a PATCH can send one field. `revision` rides alongside for the
  // optimistic-concurrency check and is stripped before the model sees it.
  const inner = schema.partial().extend({revision: z.coerce.number().int().min(1).optional()});

  return z.preprocess(
    dropNulls,
    z.unknown().transform((raw, ctx) => {
      const result = inner.safeParse(raw);
      if (!result.success) {
        for (const issue of result.error.issues) ctx.addIssue(issue);
        return z.NEVER;
      }
      // zod 4 applies .default() even inside .partial(), so `{title}` would come
      // back with every other field reset to "" or [] and the PATCH would wipe
      // them. Keep only the top-level keys the caller actually sent.
      const sent = raw && typeof raw === "object" ? raw : {};
      return Object.fromEntries(Object.entries(result.data).filter(([key]) => key in sent));
    }),
  );
};

export const bulkBody = z.object({
  ids: z.array(objectId).min(1).max(100),
});

// "scheduled" is excluded: a bulk change carries no date, and a scheduled
// record without scheduledAt never matches the publisher's sweep — it would sit
// in the admin list as "scheduled" forever. Scheduling goes through /publish.
export const bulkStatusBody = z.object({
  ids: z.array(objectId).min(1).max(100),
  status: z.enum(CONTENT_STATUSES).refine((value) => value !== "scheduled", "Schedule records one at a time."),
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
