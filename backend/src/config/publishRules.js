// What a record must carry before it may face the public.
//
// The schema's `required` fields are the rules for *storing* a draft — a
// half-written program is a legitimate thing to save and come back to. These
// are the rules for *publishing* one, which is a different and stricter
// question: a published program is a page a visitor lands on, and a page with
// no duration, no description and no curriculum is not a program page, it is a
// heading over three empty lists.
//
// Enforced in content.service.js on every path that can make something public
// (publish, schedule, bulk status), so the check cannot be skipped by taking a
// different route through the admin panel.
//
// Keyed by Mongoose model name so a resource that has no entry here publishes
// with no extra conditions — adding a rule set is opt-in, and forgetting one
// fails open rather than blocking an editor from publishing.

// A field counts as filled when it is a non-blank string, or a non-empty array.
// `0` is deliberately not treated as empty: displayOrder 0 is the first item,
// not a missing value.
export const isFilled = (value) => {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "object") {
    // A media reference is filled when it actually points at an image.
    if ("url" in value) return String(value.url || "").trim().length > 0;
    return Object.keys(value).length > 0;
  }
  return true;
};

export const PUBLISH_REQUIREMENTS = {
  // The program page renders its hero from title/subtitle/description, its meta
  // strip from duration/mentorship/format, and its three tabs from
  // overview/curriculum/outcomes. Every one of those is a visible section that
  // reads as broken when empty, which is exactly what an editor cannot see from
  // inside the form.
  Program: [
    {field: "title", label: "Title"},
    {field: "subtitle", label: "Subtitle"},
    {field: "category", label: "Category"},
    {field: "description", label: "Short description"},
    {field: "duration", label: "Duration"},
    {field: "mentorship", label: "Mentorship"},
    {field: "format", label: "Format"},
    {field: "image", label: "Card image"},
    {field: "overview", label: "Overview points"},
    {field: "curriculum", label: "Curriculum summary"},
    {field: "outcomes", label: "Outcomes"},
  ],

  // A mentor card is a name, a discipline chip and the role line that earns the
  // credibility. Without the role it is a name over an empty chip.
  Faculty: [
    {field: "name", label: "Name"},
    {field: "discipline", label: "Discipline"},
    {field: "role", label: "Role"},
  ],

  // The spotlight prints name, hike and role together as one line, and the
  // story underneath it.
  Alumni: [
    {field: "name", label: "Name"},
    {field: "currentRole", label: "Current role"},
    {field: "percentageHike", label: "Percentage hike"},
    {field: "story", label: "Story"},
  ],

  // The card shows excerpt and category; the reader opens it for the body.
  Blog: [
    {field: "title", label: "Title"},
    {field: "category", label: "Category"},
    {field: "excerpt", label: "Excerpt"},
    {field: "sections", label: "Body sections"},
  ],

  // A listing with no way to apply wastes the reader's click.
  Job: [
    {field: "title", label: "Title"},
    {field: "company", label: "Company"},
    {field: "location", label: "Location"},
    {field: "description", label: "Description"},
    {field: "applicationUrl", label: "Application URL"},
  ],

  // A policy is a document with legal force. Publishing one with no sections
  // serves a visitor an empty page as though it were the terms binding them.
  Policy: [
    {field: "title", label: "Title"},
    {field: "lead", label: "Lead"},
    {field: "updated", label: "Last updated"},
    {field: "sections", label: "Sections"},
  ],

  Faq: [
    {field: "question", label: "Question"},
    {field: "answer", label: "Answer"},
  ],
};

/**
 * The fields this document is missing before it may be published.
 * Returns {} when it is ready — the shape ApiError carries as `fields`, so the
 * admin panel can mark the offending inputs rather than showing one blunt
 * message with no indication of which field it means.
 */
export const missingForPublish = (document) => {
  const rules = PUBLISH_REQUIREMENTS[document.constructor.modelName] || [];

  return Object.fromEntries(
    rules
      .filter((rule) => !isFilled(document.get(rule.field)))
      .map((rule) => [rule.field, `${rule.label} is required before publishing.`]),
  );
};
