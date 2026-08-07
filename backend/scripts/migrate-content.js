// Moves the frontend's static data files into MongoDB.
//
//   npm run migrate:content:dry-run   report what would change, write nothing
//   npm run migrate:content           apply
//
// Safe to re-run: every record is upserted by slug, so a second pass updates
// rather than duplicates. Slugs are preserved exactly as the static files
// define them, because they are already live URLs — /programs/investment-banking
// must keep working, and a migration that silently re-slugged content would
// break every existing link and search result pointing at it.
//
// The static files are NOT deleted. They stay as the frontend's fallback until
// the API integration is proven in production; removing them is a later,
// separate decision.

import path from "node:path";
import {fileURLToPath} from "node:url";

import {connectDatabase, disconnectDatabase} from "../src/config/database.js";
import {Program} from "../src/models/Program.js";
import {Faculty} from "../src/models/Faculty.js";
import {Alumni} from "../src/models/Alumni.js";
import {Blog} from "../src/models/Blog.js";
import {Job} from "../src/models/Job.js";
import {Policy} from "../src/models/Policy.js";
import {Faq} from "../src/models/Faq.js";
import {CONTENT_STATUS} from "../src/models/plugins/contentPlugin.js";
import {toSlug} from "../src/utils/sanitize.js";
import {loadFrontendData} from "./lib/loadFrontendData.js";

const DRY_RUN = process.argv.includes("--dry-run");
const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

const report = {created: 0, updated: 0, skipped: 0, failed: 0, details: []};

// An image URL from the static files becomes a media reference. The URL is all
// we have — these files live in the `anwnlsdyv` ImageKit account, for which
// this backend holds no API key, so there is no fileId to record and they
// cannot be managed (renamed, deleted) from the Media Library. They render
// perfectly; they are just read-only. New uploads get a full record.
// Search engines truncate a meta description around 155-160 characters, so
// pasting a 500-character alumni story into one produces a snippet cut
// mid-sentence. Trimmed at the last word boundary before the limit, with an
// ellipsis, so the snippet reads as a sentence rather than a severed clause.
const metaDescription = (text, limit = 155) => {
  const clean = String(text || "").replace(/\s+/g, " ").trim();
  if (clean.length <= limit) return clean;
  const cut = clean.slice(0, limit);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > 40 ? cut.slice(0, lastSpace) : cut).trim()}…`;
};

const mediaFromUrl = (url, alt = "") => {
  if (!url || typeof url !== "string") return {};
  return {url, alt, fileId: "", thumbnailUrl: ""};
};

// Every slug is normalised, even ones taken straight from a static file's `id`.
// toSlug is a no-op on an already-valid slug ("product-management" in, the same
// out), so live URLs are preserved exactly — but two mentors carry ids like
// "Pankaj Kumar", with a capital and a space. Those are unusable in a URL and
// invalid against the model. Normalising here fixes them without touching the
// frontend file, and without a special case that would quietly rot.
const upsert = async (Model, rawSlug, data, label) => {
  const slug = toSlug(rawSlug);

  if (!slug) {
    report.failed += 1;
    report.details.push(`  ! ${label}: could not derive a slug`);
    return;
  }

  const existing = await Model.findOne({slug});

  if (DRY_RUN) {
    report[existing ? "updated" : "created"] += 1;
    report.details.push(`  ${existing ? "~" : "+"} ${label} (${slug})`);
    return;
  }

  try {
    if (existing) {
      // revision and lifecycle fields are left alone: re-running the migration
      // must not resurrect a record an admin has since unpublished, nor reset
      // an edit they made in the panel back to the static file's version
      // without it showing up as a revision.
      Object.assign(existing, data);
      existing.revision += 1;
      await existing.save();
      report.updated += 1;
      report.details.push(`  ~ ${label} (${slug})`);
    } else {
      await Model.create({
        ...data,
        slug,
        status: data.status || CONTENT_STATUS.PUBLISHED,
        publishedAt: data.publishedAt || new Date(),
      });
      report.created += 1;
      report.details.push(`  + ${label} (${slug})`);
    }
  } catch (error) {
    report.failed += 1;
    report.details.push(`  ! ${label} (${slug}): ${error.message}`);
  }
};

const migratePrograms = async (modules) => {
  const catalog = modules.programCatalog.programCatalog || [];
  console.log(`\nPrograms (${catalog.length})`);

  for (const [index, program] of catalog.entries()) {
    await upsert(
      Program,
      program.id,
      {
        title: program.title,
        fullTitle: program.fullTitle || "",
        subtitle: program.subtitle || "",
        category: program.category || "",
        description: program.description || "",
        lead: program.lead || "",
        duration: program.duration || "",
        mentorship: Array.isArray(program.mentorship) ? program.mentorship : (program.mentorship ? [program.mentorship] : []),
        format: program.format || "",
        eligibility: program.eligibility || "",
        image: mediaFromUrl(program.image, program.title),
        badges: program.badges || [],
        overview: program.overview || [],
        curriculumIntro: program.curriculumIntro || "",
        curriculum: program.curriculum || [],
        modules: (program.modules || []).map((entry) => ({
          n: entry.n ?? null,
          title: entry.title || "",
          points: entry.points || [],
        })),
        outcomes: program.outcomes || [],
        gainsIntro: program.gainsIntro || "",
        gains: program.gains || [],
        skills: program.skills || [],
        softSkills: program.softSkills || [],
        internship: program.internship || [],
        learners: program.learners || "",
        projects: program.projects || "",
        // Absent fields stay absent rather than becoming "" — the detail page
        // drops its fee panel when there is no fee, which is the honest state
        // for a program that has not been priced.
        startingPrice: program.startingPrice || "",
        fee: program.fee || null,
        emi: program.emi || "",
        guarantee: program.guarantee || "",
        nextBatch: program.nextBatch || "",
        seats: program.seats || "",
        // The explorer numbers its rail off catalog order, so that order is
        // carried across rather than left to insertion time.
        displayOrder: index,
        seo: {title: program.title, description: metaDescription(program.description || "")},
      },
      program.title,
    );
  }
};

const migrateFaculty = async (modules) => {
  const mentors = modules.mentors.mentors || [];
  console.log(`\nFaculty (${mentors.length})`);

  for (const [index, mentor] of mentors.entries()) {
    await upsert(
      Faculty,
      mentor.id || toSlug(mentor.name),
      {
        name: mentor.name,
        discipline: mentor.discipline || "",
        role: mentor.role || "",
        description: mentor.description || "",
        bio: mentor.bio || "",
        photo: mediaFromUrl(mentor.photo, mentor.name),
        education: mentor.education || "",
        experience: mentor.experience || "",
        specialization: mentor.specialization || "",
        achievements: mentor.achievements || [],
        expertise: mentor.expertise || [],
        displayOrder: index,
        // The file's `draft: true` becomes a draft status, so an unfinished
        // profile stays unpublished exactly as it does today.
        status: mentor.draft ? CONTENT_STATUS.DRAFT : CONTENT_STATUS.PUBLISHED,
        seo: {title: mentor.name, description: metaDescription(mentor.role || "")},
      },
      mentor.name,
    );
  }
};

const migrateAlumni = async (modules) => {
  const profiles = modules.alumniSpotlight.alumniSpotlights || [];

  // The home page's outcome strip asks for alumni?featured=true and treats an
  // answered-but-empty response as authoritative — deliberately, so unticking
  // every story removes the section instead of silently reverting to the static
  // four. The consequence is that a database where nothing was ever ticked
  // renders no "Learner outcomes" section at all, which is what a freshly
  // migrated one was: this script set every other field and left `featured` at
  // its default of false.
  //
  // Which stories belong there is not a new decision — siteData's `reviews` is
  // already exactly that list, and is what the page falls back to when the API
  // cannot be reached. Matching on name keeps the two in step: edit `reviews`
  // and the next migration marks the same people.
  const featured = new Set(
    ((modules.siteData && modules.siteData.reviews) || []).map(([name]) =>
      String(name).trim().toLowerCase(),
    ),
  );

  console.log(`\nAlumni (${profiles.length}, ${featured.size} featured on the home page)`);

  for (const [index, profile] of profiles.entries()) {
    // `role` in the source is "Title, Company" as one string. Splitting on the
    // last comma recovers both, and falls back to the whole string as the role
    // when there is no comma — better than inventing an empty company.
    const roleText = profile.role || "";
    const splitAt = roleText.lastIndexOf(",");
    const currentRole = splitAt > 0 ? roleText.slice(0, splitAt).trim() : roleText;
    const currentCompany = splitAt > 0 ? roleText.slice(splitAt + 1).trim() : "";

    await upsert(
      Alumni,
      profile.id || toSlug(profile.name),
      {
        name: profile.name,
        image: mediaFromUrl(profile.imageUrl || profile.image, profile.name),
        currentRole,
        currentCompany,
        percentageHike: profile.hike || "",
        story: profile.story || "",
        quote: profile.story || "",
        accent: profile.accent || "",
        accentEnd: profile.accentEnd || "",
        featured: featured.has(String(profile.name).trim().toLowerCase()),
        displayOrder: index,
        seo: {title: profile.name, description: metaDescription(profile.story || "")},
      },
      profile.name,
    );
  }
};

// The static file only carries a human date ("July 2026"), but publishedAt is
// what the public list sorts by. Left unset, the content plugin stamped every
// post with the migration's own clock, so the blog came out in exactly the
// order this file lists it — reversed. Anchored to UTC so the month a post
// lands in does not depend on the timezone the migration happens to run in.
const publishedFrom = (date) => {
  if (!date) return null;
  const parsed = new Date(`${date} 1 UTC`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const migrateBlogs = async (modules) => {
  const posts = modules.blogPosts.default || [];
  console.log(`\nBlog posts (${posts.length})`);

  for (const [index, post] of posts.entries()) {
    await upsert(
      Blog,
      post.id || toSlug(post.title),
      {
        title: post.title,
        category: post.category || "",
        tag: post.tag || "",
        author: post.author || "CareerVeda Team",
        date: post.date || "",
        readTime: post.readTime || "",
        excerpt: post.excerpt || "",
        lead: post.lead || "",
        sections: (post.sections || []).map((section) => ({
          heading: section.heading || "",
          body: section.body || [],
        })),
        highlights: post.highlights || [],
        cta: {
          label: post.cta?.label || "Explore CareerVeda programs",
          url: post.cta?.url || "/programs",
        },
        image: mediaFromUrl(post.image, post.title),
        displayOrder: index,
        publishedAt: publishedFrom(post.date),
        seo: {title: post.title, description: metaDescription(post.excerpt || "")},
      },
      post.title,
    );
  }
};

const migrateJobs = async (modules) => {
  const listings = modules.jobsData.jobs || [];
  console.log(`\nJobs (${listings.length})`);

  for (const [index, job] of listings.entries()) {
    // Job ids are numeric in the source, which makes a poor URL. Title plus
    // company is stable and readable; generateUniqueSlug is not used here
    // because upsert-by-slug needs the same input to produce the same slug on
    // every run.
    await upsert(
      Job,
      toSlug(`${job.title}-${job.company}`),
      {
        title: job.title,
        company: job.company || "",
        location: job.location || "",
        workMode: job.workMode || "",
        employmentType: job.jobType || "",
        experienceLevel: job.experience || "",
        description: job.description || "",
        skills: job.skills || [],
        salaryRange: job.salary || "",
        applicationUrl: job.applyUrl || "",
        source: job.source || "",
        postedDate: job.postedDate ? new Date(job.postedDate) : null,
        featured: Boolean(job.featured),
        displayOrder: index,
      },
      `${job.title} — ${job.company}`,
    );
  }
};

const migratePolicies = async (modules) => {
  const policies = modules.policies.policies || {};
  const entries = Object.entries(policies);
  console.log(`\nPolicies (${entries.length})`);

  for (const [[slug, policy], index] of entries.map((entry, i) => [entry, i])) {
    await upsert(
      Policy,
      slug,
      {
        title: policy.title,
        eyebrow: policy.eyebrow || "Legal",
        lead: policy.lead || "",
        updated: policy.updated || "",
        stats: policy.stats || [],
        sections: (policy.sections || []).map((section) => ({
          id: section.id || "",
          heading: section.heading || "",
          body: section.body || [],
          callout: section.callout || "",
          list: section.list || [],
          groups: section.groups || [],
          closing: section.closing || "",
        })),
        displayOrder: index,
        // Same rule the static file enforces: a draft policy must not serve
        // placeholder text as though it were binding terms.
        status: policy.draft ? CONTENT_STATUS.DRAFT : CONTENT_STATUS.PUBLISHED,
        seo: {title: policy.title, description: metaDescription(policy.lead || "")},
      },
      policy.title,
    );
  }
};

const migrateFaqs = async (modules) => {
  // siteData exports FAQs as [question, answer] tuples.
  const faqs = modules.siteData.faqs || [];
  console.log(`\nFAQs (${faqs.length})`);

  for (const [index, entry] of faqs.entries()) {
    const [question, answer] = Array.isArray(entry) ? entry : [entry.question, entry.answer];
    if (!question || !answer) {
      report.skipped += 1;
      continue;
    }

    await upsert(
      Faq,
      toSlug(question).slice(0, 120),
      {question, answer, category: "General", displayOrder: index},
      question.slice(0, 60),
    );
  }
};

const run = async () => {
  console.log(DRY_RUN ? "\nDRY RUN — nothing will be written\n" : "\nMigrating static content into MongoDB\n");

  const {modules, cleanup} = await loadFrontendData(PROJECT_ROOT);

  const broken = Object.entries(modules).filter(([, value]) => value.__error);
  for (const [name, value] of broken) {
    console.error(`  ! could not load ${name}: ${value.__error}`);
  }

  await connectDatabase();

  try {
    await migratePrograms(modules);
    await migrateFaculty(modules);
    await migrateAlumni(modules);
    await migrateBlogs(modules);
    await migrateJobs(modules);
    await migratePolicies(modules);
    await migrateFaqs(modules);
  } finally {
    cleanup();
  }

  console.log("\n" + report.details.join("\n"));
  console.log(
    `\nCreated ${report.created} · updated ${report.updated} · skipped ${report.skipped} · failed ${report.failed}\n`,
  );

  if (report.failed > 0) process.exitCode = 1;
};

run()
  .catch((error) => {
    console.error("\nMigration failed:", error.message, "\n");
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectDatabase();
  });
