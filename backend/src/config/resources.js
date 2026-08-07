import {Program} from "../models/Program.js";
import {Faculty} from "../models/Faculty.js";
import {Alumni} from "../models/Alumni.js";
import {Blog} from "../models/Blog.js";
import {Job} from "../models/Job.js";
import {Policy} from "../models/Policy.js";
import {Faq} from "../models/Faq.js";
import {PERMISSIONS} from "./permissions.js";
import {
  programBody,
  facultyBody,
  alumniBody,
  blogBody,
  jobBody,
  policyBody,
  faqBody,
} from "../validators/content.validators.js";

// The single registry that drives both the admin CRUD routes and the public
// read routes. Adding a content type is one entry here plus a model and a Zod
// schema — not a new controller, a new router and seven new tests that
// accidentally omit the soft-delete filter.
//
// `permissions` is the important column. Programs use the granular
// read/create/update/delete set; the rest use one `*.manage` grant, matching
// the permission vocabulary the brief specified.

// Fields the public may never see, whatever the endpoint. Applied as a
// projection so they are excluded by the database rather than deleted in JS —
// a field that is never loaded cannot be leaked by a later refactor.
const PUBLIC_EXCLUDE = "-createdBy -updatedBy -deletedBy -deletedAt -revision -__v";

export const RESOURCES = {
  programs: {
    name: "programs",
    model: Program,
    label: "Program",
    body: programBody,
    permissions: {
      read: PERMISSIONS.PROGRAMS_READ,
      create: PERMISSIONS.PROGRAMS_CREATE,
      update: PERMISSIONS.PROGRAMS_UPDATE,
      delete: PERMISSIONS.PROGRAMS_DELETE,
    },
    publicProjection: PUBLIC_EXCLUDE,
    // Programs are ordered by hand — the explorer numbers its rail off this
    // order rather than off any intrinsic property of the records.
    defaultSort: {sort: "displayOrder", order: "asc"},
  },

  faculty: {
    name: "faculty",
    model: Faculty,
    label: "Faculty member",
    body: facultyBody,
    permissions: {
      read: PERMISSIONS.FACULTY_MANAGE,
      create: PERMISSIONS.FACULTY_MANAGE,
      update: PERMISSIONS.FACULTY_MANAGE,
      delete: PERMISSIONS.FACULTY_MANAGE,
    },
    publicProjection: PUBLIC_EXCLUDE,
    defaultSort: {sort: "displayOrder", order: "asc"},
  },

  alumni: {
    name: "alumni",
    model: Alumni,
    label: "Alumni story",
    body: alumniBody,
    permissions: {
      read: PERMISSIONS.ALUMNI_MANAGE,
      create: PERMISSIONS.ALUMNI_MANAGE,
      update: PERMISSIONS.ALUMNI_MANAGE,
      delete: PERMISSIONS.ALUMNI_MANAGE,
    },
    publicProjection: PUBLIC_EXCLUDE,
    defaultSort: {sort: "displayOrder", order: "asc"},
  },

  blogs: {
    name: "blogs",
    model: Blog,
    label: "Blog post",
    body: blogBody,
    // Posts are authored in src/data/blogPosts.js and only mirrored into Mongo
    // by `npm run migrate:content`, which writes through the model rather than
    // the API. So the admin panel gets no blog routes at all — admin.routes.js
    // skips this entry entirely. A post created there would never appear on the
    // site, and one deleted there would come back on the next migrate. The
    // public read routes below still serve the mirror.
    codeAuthored: true,
    permissions: {
      read: PERMISSIONS.BLOGS_MANAGE,
      create: PERMISSIONS.BLOGS_MANAGE,
      update: PERMISSIONS.BLOGS_MANAGE,
      delete: PERMISSIONS.BLOGS_MANAGE,
    },
    publicProjection: PUBLIC_EXCLUDE,
    // Public: newest published first, unlike the hand-ordered collections.
    defaultSort: {sort: "publishedAt", order: "desc"},
    // Admin: most-recently-touched first. Sorting the admin list by publishedAt
    // (as the public page does) sinks every draft to the bottom, because a draft
    // has publishedAt: null and null sorts last in a descending order — so a
    // blog you just created lands on the last page and looks like it never
    // saved. updatedAt is always set, so a new or edited post surfaces at the
    // top where the editor is looking for it.
    adminSort: {sort: "updatedAt", order: "desc"},
  },

  jobs: {
    name: "jobs",
    model: Job,
    label: "Job listing",
    body: jobBody,
    permissions: {
      read: PERMISSIONS.JOBS_MANAGE,
      create: PERMISSIONS.JOBS_MANAGE,
      update: PERMISSIONS.JOBS_MANAGE,
      delete: PERMISSIONS.JOBS_MANAGE,
    },
    publicProjection: PUBLIC_EXCLUDE,
    defaultSort: {sort: "publishedAt", order: "desc"},
    // Same reasoning as blogs: keep drafts visible at the top of the admin list.
    adminSort: {sort: "updatedAt", order: "desc"},
  },

  policies: {
    name: "policies",
    model: Policy,
    label: "Policy",
    body: policyBody,
    permissions: {
      read: PERMISSIONS.POLICIES_MANAGE,
      create: PERMISSIONS.POLICIES_MANAGE,
      update: PERMISSIONS.POLICIES_MANAGE,
      delete: PERMISSIONS.POLICIES_MANAGE,
    },
    publicProjection: PUBLIC_EXCLUDE,
    defaultSort: {sort: "displayOrder", order: "asc"},
  },

  faqs: {
    name: "faqs",
    model: Faq,
    label: "FAQ",
    body: faqBody,
    permissions: {
      read: PERMISSIONS.PAGES_MANAGE,
      create: PERMISSIONS.PAGES_MANAGE,
      update: PERMISSIONS.PAGES_MANAGE,
      delete: PERMISSIONS.PAGES_MANAGE,
    },
    publicProjection: PUBLIC_EXCLUDE,
    defaultSort: {sort: "displayOrder", order: "asc"},
  },
};

export const RESOURCE_NAMES = Object.keys(RESOURCES);
