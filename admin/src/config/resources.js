

import {writePath} from "../components/fieldPath";

// Field kinds the editor knows how to render.
//   text      single line
//   textarea  multi-line prose
//   number    numeric input
//   list      array of strings, one per line
//   media     image picker backed by the Media Library
//   select    fixed options
//   kv        array of {question, answer} style pairs
//   sections  array of {heading, body[]} article blocks
//   policySections  array of {heading, body[], callout, list[], groups[{title, list[]}], closing} policy blocks
//   modules   array of {n, title, points[]} curriculum blocks
//
// Two different kinds of "required", deliberately kept apart:
//   required: true  the schema will not store the record without it, so a draft
//                   cannot be saved. Marked with a * on the label.
//   publish: true   the draft saves fine, but the public page needs it before it
//                   may go live. Mirrors backend/src/config/publishRules.js and
//                   drives the readiness panel at the top of the editor.
// A half-written program is a legitimate thing to save and come back to, which
// is why most of the list below is the second kind and not the first.
//
// `initial` is the value a NEW record starts with. It is a starting point, never
// a lock: the field is an ordinary input and typing over it is the expected
// thing to do. It exists because most of a CareerVeda program is the same as
// every other CareerVeda program — the fee model, the eligibility line, the
// delivery format — and retyping the identical sentence for each new course is
// both slow and the reason two programs end up disagreeing about the EMI terms.
//
// Every value below was taken from the existing catalogue rather than invented:
// each is what all nine live programs already say, or what all but one says.
// An `initial` is never applied to a record that already exists, so editing an
// old program can't have text appear in a field its author deliberately left
// blank.

const seoFields = [
  {name: "seo.title", label: "SEO title", kind: "text", group: "SEO"},
  {name: "seo.description", label: "Meta description", kind: "textarea", group: "SEO", hint: "Aim for 155 characters — search results truncate beyond that."},
];

const commonFields = [
  {name: "slug", label: "Slug", kind: "text", group: "Basics", hint: "Leave blank to generate from the title. Changing it breaks existing links."},
  {name: "featured", label: "Featured", kind: "boolean", group: "Basics"},
  {
    name: "displayOrder",
    label: "Display order",
    kind: "number",
    group: "Basics",
    hint: "The position in the list, counting from 1. Saving 3 moves this to third and pushes the rest down. Drafts take up a position here but are not shown on the site, so the site's numbering can run lower.",
  },
];

export const RESOURCES = {
  programs: {
    name: "programs",
    label: "Programs",
    singular: "Program",
    permission: "programs.read",
    // Programs are the one resource with granular CRUD grants. Keep the
    // action-to-permission map next to the UI definition so a read-only viewer
    // never sees controls the API will reject.
    permissions: {
      read: "programs.read",
      create: "programs.create",
      update: "programs.update",
      delete: "programs.delete",
    },
    titleField: "title",
    columns: ["title", "category", "status", "displayOrder"],
    // Which media field the card view shows as the thumbnail, and the default
    // layout. Resources with an image read far better as cards than as a row of
    // truncated text, so they open that way; the toggle still offers the table.
    imageField: "image",
    defaultView: "cards",
    subtitleField: "subtitle",
    publicPath: "/programs/:slug",
    fields: [
      {name: "title", label: "Title", kind: "text", publish: true, required: true, group: "Basics"},
      {name: "fullTitle", label: "Full title", kind: "text", group: "Basics"},
      {name: "subtitle", label: "Subtitle", kind: "text", publish: true, group: "Basics"},
      {name: "category", label: "Category", kind: "text", publish: true, group: "Basics"},
      ...commonFields,
      {name: "image", label: "Card image", kind: "media", publish: true, group: "Media"},
      {name: "heroMedia", label: "Hero image", kind: "media", group: "Media"},
      {name: "description", label: "Short description", kind: "textarea", publish: true, group: "Content"},
      {name: "lead", label: "Lead paragraph", kind: "textarea", group: "Content"},
      // 7 of the 9 live programs run 6 months; Data Science and Data
      // Engineering run 12. Change it on those two.
      {name: "duration", label: "Duration", kind: "text", publish: true, group: "Details", initial: "6 Months", hint: "Most programs run 6 months. Change it if this one differs."},
      // The one genuinely varied field of this group — it names who teaches, so
      // it is left to be filled in per program rather than defaulted to a phrase
      // that would go stale on nine pages at once.
      {name: "mentorship", label: "Mentorship", kind: "list", publish: true, group: "Details", hint: "One mentor type per line, e.g. Expert Trainers or AI Mentor."},
      {name: "format", label: "Format", kind: "text", publish: true, group: "Details", initial: "Live Online"},
      {name: "eligibility", label: "Eligibility", kind: "text", group: "Details", initial: "Freshers, Graduates, Experienced"},
      {name: "learners", label: "Learners", kind: "text", group: "Details", initial: "10,000+"},
      {name: "projects", label: "Projects", kind: "text", group: "Details", initial: "30+"},
      // No default: the price is the one number nobody should inherit from
      // another program by accident. Leave it blank and the card and the fee
      // panel are simply not rendered, which is the honest state for a program
      // that has not been priced.
      {name: "startingPrice", label: "Starting price", kind: "text", group: "Pricing", hint: "Leave blank until the fee is set — the page drops its fee panel rather than showing a wrong number."},
      {name: "emi", label: "EMI terms", kind: "text", group: "Pricing", initial: "3, 6, 9 & 12 months (No Cost EMIs) · Zero hidden charges"},
      {name: "guarantee", label: "Guarantee", kind: "text", group: "Pricing", initial: "7-Day Money Back Guarantee"},
      // The batch date is one value for the whole catalogue. Saving either field
      // below updates every program: Auto keeps them all on the next Saturday,
      // Custom makes the typed date apply everywhere.
      {name: "nextBatch", label: "Next batch", kind: "text", group: "Pricing", hint: "Auto mode keeps this on the next Saturday. In Custom mode, the date you type here is applied to every program when you save."},
      {name: "nextBatchMode", label: "Next batch mode", kind: "select", group: "Pricing", initial: "auto", options: [{value: "auto", label: "Auto — next Saturday"}, {value: "custom", label: "Custom — I'll type the date"}], hint: "Saving either way updates all programs: Auto rolls every program forward to the next Saturday, Custom pushes the typed date to every program."},
      {name: "seats", label: "Seats", kind: "text", group: "Pricing", initial: "Few seats left"},
      {name: "badges", label: "Badges", kind: "list", group: "Content", initial: ["Industry-Aligned", "Enrolling Now", "100% Placement Assurance"]},
      {name: "overview", label: "Overview points", kind: "list", publish: true, group: "Content"},
      {name: "curriculum", label: "Curriculum summary", kind: "list", publish: true, group: "Curriculum"},
      {name: "modules", label: "Curriculum modules", kind: "modules", group: "Curriculum"},
      {name: "outcomes", label: "Outcomes", kind: "list", publish: true, group: "Content"},
      {name: "gains", label: "What you gain", kind: "list", group: "Content", initial: ["100% Live Instructor-Led Classes", "Expert Trainers from Top Technology Companies", "Daily Live Doubt-Solving Sessions", "Real Industry Projects", "25+ Assignments & Industry Case Studies", "Three Globally Recognised Certifications", "Dedicated Profile Building — Portfolio, Resume & LinkedIn", "Lifetime Placement Assistance", "LMS Access for 2 Years", "Full Access to Recordings & Notes", "Flexible Weekend Learning", "Advance Learning Modules", "Multiple Practice Quizzes", "Tech for PM & Analytics for PM Tracks", "PM Interview Mastery Framework", "Mock Interview Labs with Expert Feedback", "AI Product Case Practice", "Dedicated Virtual Classroom & Student Support", "10K+ Student & Alumni Community", "Hiring Preparation Support"]},
      {name: "skills", label: "Skills", kind: "list", group: "Content"},
      {name: "softSkills", label: "Soft skills", kind: "list", group: "Content", initial: ["Stakeholder Communication", "Executive Presentations & Storytelling", "Influence Without Authority", "Decision-Making Under Uncertainty", "Cross-Functional Team Leadership", "Conflict Resolution"]},
      {name: "internship", label: "Internship", kind: "list", group: "Content", initial: ["Real-world Product Management Projects", "Product Roadmap Development", "User Research & PRD Writing", "Feature Launch & A/B Testing", "Product Analytics & Metrics Tracking", "Industry Mentorship by Senior PMs"]},
      {name: "faqs", label: "FAQs", kind: "kv", group: "FAQ"},
      {name: "gallery", label: "Gallery", kind: "mediaList", group: "Media"},
      ...seoFields,
    ],
  },

  faculty: {
    name: "faculty",
    label: "Faculty",
    singular: "Faculty member",
    permission: "faculty.manage",
    titleField: "name",
    columns: ["name", "discipline", "status", "displayOrder"],
    imageField: "photo",
    defaultView: "cards",
    subtitleField: "role",
    fields: [
      {name: "name", label: "Name", kind: "text", publish: true, required: true, group: "Basics"},
      {name: "discipline", label: "Discipline", kind: "text", publish: true, group: "Basics"},
      {name: "role", label: "Role", kind: "text", publish: true, group: "Basics"},
      ...commonFields,
      {name: "photo", label: "Photo", kind: "media", group: "Media"},
      {name: "description", label: "Short description", kind: "textarea", group: "Content"},
      {name: "bio", label: "Biography", kind: "textarea", group: "Content"},
      {name: "education", label: "Education", kind: "text", group: "Details"},
      {name: "experience", label: "Experience", kind: "text", group: "Details"},
      {name: "specialization", label: "Specialisation", kind: "textarea", group: "Details"},
      {name: "achievements", label: "Achievements", kind: "list", group: "Details"},
      {name: "expertise", label: "Expertise", kind: "list", group: "Details"},
      ...seoFields,
    ],
  },

  alumni: {
    name: "alumni",
    label: "Alumni",
    singular: "Alumni story",
    permission: "alumni.manage",
    titleField: "name",
    columns: ["name", "currentCompany", "featured", "showOnAlumniPage", "status"],
    imageField: "image",
    defaultView: "cards",
    subtitleField: "currentRole",
    fields: [
      {name: "name", label: "Name", kind: "text", publish: true, required: true, group: "Basics"},
      // The generic "Featured" flag, renamed for the one thing it actually does
      // here. The home page asks the API for featured alumni only, so this
      // checkbox is the whole mechanism for choosing who appears there — and a
      // checkbox labelled "Featured" gives no hint of that.
      ...commonFields.map((field) =>
        field.name === "featured"
          ? {
              ...field,
              label: "Show on the home page",
              hint: "Ticked stories appear in the outcomes strip on the home page.",
            }
          : field,
      ),
      {
        name: "showOnAlumniPage",
        label: "Show on the alumni page",
        kind: "boolean",
        group: "Basics",
        hint: "Ticked stories appear in the review grid on /alumni. Independent of the home page — a story can be on one, both, or neither. Either way every published story still appears in the dome gallery on /alumni, which is the full record of the network.",
      },
      {name: "image", label: "Photo", kind: "media", group: "Media"},
      {name: "currentRole", label: "Current role", kind: "text", publish: true, group: "Career"},
      {name: "currentCompany", label: "Current company", kind: "text", group: "Career"},
      {name: "previousRole", label: "Previous role", kind: "text", group: "Career"},
      {name: "previousCompany", label: "Previous company", kind: "text", group: "Career"},
      {name: "percentageHike", label: "Salary hike", kind: "text", publish: true, group: "Career"},
      {name: "graduationYear", label: "Graduation year", kind: "text", group: "Career"},
      {name: "programTitle", label: "Program", kind: "text", group: "Career"},
      {name: "quote", label: "Quote", kind: "textarea", group: "Content"},
      {name: "story", label: "Story", kind: "textarea", publish: true, group: "Content"},
      {name: "skills", label: "Skills", kind: "list", group: "Content"},
      ...seoFields,
    ],
  },

  // The blog is deliberately absent. Posts live in src/data/blogPosts.js on the
  // public site and are edited there, so a CMS form for them would be a second
  // source of truth that the site no longer reads — an editor would publish a
  // post here and never see it appear. The backend Blog model and its routes
  // are left in place and dormant; restoring this block is all it takes to turn
  // the CMS side back on, but src/pages/BlogPage.jsx has to start reading the
  // API again for that to mean anything.

  jobs: {
    name: "jobs",
    label: "Jobs",
    singular: "Job listing",
    permission: "jobs.manage",
    titleField: "title",
    // `source` earns its column here in a way it does not on other resources:
    // most job rows arrive from an aggregator, and which one sent a listing is
    // the first thing a reviewer wants when the listing looks wrong.
    columns: ["title", "company", "source", "status", "publishedAt"],
    // Jobs have no logo, so cards use the image-less layout: a compact status
    // header instead of a thumbnail. `cards` opts the resource into the card
    // view without an imageField; subtitleField and cardMeta decide what the
    // card shows below the title.
    cards: true,
    defaultView: "cards",
    subtitleField: "company",
    cardMeta: ["location", "workMode", "employmentType", "salaryRange", "source", "rejectedReason"],
    publicPath: "/jobs",
    fields: [
      {name: "title", label: "Title", kind: "text", publish: true, required: true, group: "Basics"},
      {name: "company", label: "Company", kind: "text", publish: true, group: "Basics"},
      {name: "location", label: "Location", kind: "text", publish: true, group: "Basics"},
      {name: "workMode", label: "Work mode", kind: "text", group: "Basics", initial: "On-site"},
      {name: "employmentType", label: "Employment type", kind: "text", group: "Basics", initial: "Full-time"},
      {name: "experienceLevel", label: "Experience level", kind: "text", group: "Basics"},
      ...commonFields,
      {name: "description", label: "Description", kind: "textarea", publish: true, group: "Content"},
      {name: "requirements", label: "Requirements", kind: "list", group: "Content"},
      {name: "responsibilities", label: "Responsibilities", kind: "list", group: "Content"},
      {name: "skills", label: "Skills", kind: "list", group: "Content"},
      {name: "salaryRange", label: "Salary range", kind: "text", group: "Details"},
      {name: "applicationUrl", label: "Application URL", kind: "text", publish: true, group: "Details"},
      {name: "source", label: "Source", kind: "text", group: "Details"},
    ],
  },

  policies: {
    name: "policies",
    label: "Policies",
    singular: "Policy",
    permission: "policies.manage",
    titleField: "title",
    columns: ["title", "version", "status", "updated"],
    publicPath: "/:slug",
    fields: [
      {name: "title", label: "Title", kind: "text", publish: true, required: true, group: "Basics"},
      {name: "eyebrow", label: "Eyebrow", kind: "text", group: "Basics", initial: "Legal"},
      {name: "version", label: "Version", kind: "text", group: "Basics"},
      {name: "updated", label: "Updated (display)", kind: "text", publish: true, group: "Basics"},
      ...commonFields,
      {name: "lead", label: "Lead paragraph", kind: "textarea", publish: true, group: "Content"},
      {name: "sections", label: "Sections", kind: "policySections", publish: true, group: "Content"},
      ...seoFields,
    ],
  },

  faqs: {
    name: "faqs",
    label: "FAQs",
    singular: "FAQ",
    permission: "pages.manage",
    titleField: "question",
    columns: ["question", "category", "status", "displayOrder"],
    fields: [
      {name: "question", label: "Question", kind: "text", publish: true, required: true, group: "Basics"},
      {name: "answer", label: "Answer", kind: "textarea", publish: true, required: true, group: "Basics"},
      {name: "category", label: "Category", kind: "text", group: "Basics", initial: "General"},
      ...commonFields,
    ],
  },
};

/**
 * The starting form for a new record of this type: every field that declares an
 * `initial`, and nothing else. Applied only on create — see the note above on
 * why an existing record is never touched.
 */
export const initialValues = (resource) => {
  let values = {};

  for (const field of resource.fields) {
    if (field.initial === undefined) continue;
    // Arrays are copied, not shared. Without this every new program would edit
    // the one badges array that lives in this module, and the second program
    // created in a session would start with the first one's edits.
    const value = Array.isArray(field.initial) ? [...field.initial] : field.initial;
    // writePath rather than a plain assignment, so a dotted name like
    // "seo.description" nests correctly instead of creating a literal key with a
    // dot in it that readPath would never find.
    values = writePath(values, field.name, value);
  }

  return values;
};

/** The fields of this resource that start from a shared default. */
export const prefilledFields = (resource) =>
  resource.fields.filter((field) => field.initial !== undefined).map((field) => field.name);

export const RESOURCE_LIST = Object.values(RESOURCES);

// Most resources use one `*.manage` permission for every action. Programs are
// deliberately more granular, so consumers must ask for the permission for
// the action they are about to render rather than treating read access as write
// access. The legacy `permission` value remains the read fallback for the
// resources that use one grant.
export const resourcePermission = (resource, action = "read") =>
  resource?.permissions?.[action] || resource?.permission;

export const STATUS_LABELS = {
  draft: "Draft",
  "in-review": "In review",
  scheduled: "Scheduled",
  published: "Published",
  archived: "Archived",
};
