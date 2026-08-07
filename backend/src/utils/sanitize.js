// Text coming from an admin is trusted less than the admin is.
//
// All editable content on this site is *structured* — headings, paragraph
// arrays, list items — never raw HTML. That is a deliberate constraint: it
// means the frontend can render everything through React's normal escaping and
// never needs dangerouslySetInnerHTML, which removes stored XSS as a category
// rather than mitigating it. These helpers enforce that constraint at the API
// boundary so a crafted request cannot smuggle markup into a field the frontend
// will later print.
//
// Every character class below uses \u escapes rather than literal characters.
// Writing the control range literally makes this file contain raw control
// bytes, which git classifies as binary — it stops producing readable diffs on
// exactly the file where a subtle change matters most.

// Angle brackets go first, so <script> cannot survive as text and be
// reassembled by a careless renderer. Control characters are stripped because
// they serve no purpose in prose and can break CSV export and log parsing.
// Matching control characters is the entire purpose of this pattern; the rule
// exists to catch them appearing by accident, which is not the case here.
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = new RegExp("[\u0000-\u001f\u007f]", "g");

export const stripTags = (value) => {
  if (typeof value !== "string") return value;

  // Until the string stops changing, not once. A single pass is a rewrite, and
  // a rewrite can reassemble what it removed: "<<b>>" loses "<b>" and leaves
  // "<b>" behind, which is markup again. Each pass is strictly shorter than the
  // last, so this terminates; the fields that reach here are length-capped by
  // their zod schemas, which bounds the work.
  //
  // Stripping tags rather than only their brackets is what keeps the result
  // readable — a caption pasted from a word processor as "<b>Cohort 12</b>"
  // should become "Cohort 12", not "bCohort 12/b".
  let text = value;
  for (let previous; previous !== text; ) {
    previous = text;
    text = text.replace(/<[^>]*>/g, "");
  }

  return (
    text
      // Anything still here is an unbalanced bracket. It cannot open a tag on
      // its own, but it has no place in the plain prose these fields hold, and
      // removing it is what makes "no markup survives" unconditional rather
      // than dependent on what the pattern above happened to recognise.
      .replace(/[<>]/g, "")
      .replace(CONTROL_CHARS, "")
      .trim()
  );
};

// Combining diacritical marks, left over after NFKD splits "é" into "e" + "◌́".
const COMBINING_MARKS = new RegExp("[\u0300-\u036f]", "g");

// Slugs end up in URLs and in Mongo queries. Restricting them to a known
// character set means a slug can never be a path traversal, a regex, or an
// operator — whatever the caller sends.
export const toSlug = (value) =>
  String(value || "")
    .toLowerCase()
    .normalize("NFKD")
    // Strip accents rather than dropping the letter entirely, so "Café" becomes
    // "cafe" and not "caf".
    .replace(COMBINING_MARKS, "")
    .replace(/[^a-z0-9]+/g, "-")
    // Truncate BEFORE stripping the edge hyphens, not after. The cut lands
    // wherever character 120 happens to fall, and if that is a word boundary it
    // re-introduces the trailing hyphen the strip just removed — so a title long
    // enough to be truncated produced "...aaa-", which isValidSlug rejects. The
    // read path checks isValidSlug, so that content saved and then 404ed. Found
    // by the property test in tests/unit/sanitize.test.js, not by a report.
    .slice(0, 120)
    .replace(/^-+|-+$/g, "");

export const isValidSlug = (value) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(String(value || ""));

// A search box feeds a $regex. Without escaping, a user typing ".*" or an
// unbalanced "(" either scans the whole collection or throws — and a
// catastrophic backtracking pattern is a denial of service.
export const escapeRegex = (value) => String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Excel, Sheets and Numbers all execute a cell that begins with one of these.
// A lead whose name is "=HYPERLINK(...)" becomes a live formula in whatever
// spreadsheet an employee opens the export in — so the value is prefixed with
// an apostrophe, which those applications treat as "this is text".
const FORMULA_TRIGGERS = ["=", "+", "-", "@", "\t", "\r"];

export const csvSafe = (value) => {
  if (value === null || value === undefined) return "";
  const text = String(value);
  const escaped = FORMULA_TRIGGERS.some((trigger) => text.startsWith(trigger)) ? `'${text}` : text;
  // Standard CSV quoting on top: doubled quotes, wrapped if it contains a
  // delimiter, quote or newline.
  return /[",\n\r]/.test(escaped) ? `"${escaped.replace(/"/g, '""')}"` : escaped;
};
