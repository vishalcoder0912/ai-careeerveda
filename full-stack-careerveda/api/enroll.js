// Vercel serverless function: POST /api/enroll
//
// Receives an enrollment application from /enroll and stores it in MongoDB.
// Runs server-side only, so MONGODB_URI never reaches the browser.
//
// Required environment variables (Vercel → Settings → Environment Variables,
// and .env for local `vercel dev`):
//   MONGODB_URI  mongodb+srv://user:pass@cluster.mongodb.net/?retryWrites=true
//   MONGODB_DB   database name (optional, defaults to "careerveda")

import {getCollection, asString, validateLead} from "./_db.js";
import {programCatalog} from "../src/data/programCatalog.js";

const COLLECTION = "enrollments";

// A real applicant might legitimately re-submit once (wrong program, a typo they
// wanted to fix), so we allow a small number of tries. Beyond that it's spam, and
// we refuse without writing anything. Enforced server-side because the browser
// check can be bypassed.
const MAX_ENROLLMENTS_PER_USER = 2;

// The same person can reach us under two identities — a different email but the
// same phone, or vice versa — so we count matches on either. Mobile is reduced to
// its last 10 digits so "+91 92178 01191" and "9217801191" count as one person.
const lastTenDigits = (mobile) => mobile.replace(/\D/g, "").slice(-10);

// Read from the catalog rather than a second hardcoded list, so a program can't
// be valid on the form and rejected by the server. Submissions naming anything
// else are refused, so a tampered form can't write arbitrary values.
const PROGRAM_TITLES = programCatalog.map(({title}) => title);

export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return response.status(405).json({error: "Method not allowed."});
  }

  // Vercel parses JSON bodies for us, but guard against a non-object body.
  const body =
    typeof request.body === "object" && request.body !== null ? request.body : {};

  // Honeypot: a real person never fills this in, because it's hidden. Bots do.
  // Answer 200 so the bot believes it succeeded and doesn't retry, but write
  // nothing.
  if (asString(body.company)) {
    return response.status(200).json({ok: true});
  }

  const {errors, lead} = validateLead(body);
  const program = asString(body.program);

  if (!program) errors.program = "Please choose a program.";
  else if (!PROGRAM_TITLES.includes(program)) {
    errors.program = "Please choose a valid program.";
  }

  if (Object.keys(errors).length > 0) {
    return response.status(400).json({error: "Please check the form.", errors});
  }

  const collection = await getCollection(COLLECTION);

  // Configuration is missing. Say so honestly rather than reporting a success
  // for an application that was never stored — a silently dropped applicant is
  // worse than a visible failure.
  if (!collection) {
    console.error("MONGODB_URI is not set; enrollment was not stored.");
    return response
      .status(503)
      .json({error: "Applications aren't configured yet. Please try again later."});
  }

  const emailKey = lead.email.toLowerCase();
  const mobileKey = lastTenDigits(lead.mobile);

  try {
    // Refuse a third submission from the same person. We match on a lowercased
    // email or the last 10 mobile digits, so casing and phone formatting can't be
    // used to slip past the cap. Answer 429 so the form can show a clear message.
    const priorCount = await collection.countDocuments({
      $or: [{emailKey}, {mobileKey}],
    });

    if (priorCount >= MAX_ENROLLMENTS_PER_USER) {
      return response.status(429).json({
        error:
          "You've already applied. Our team has your details and will reach out — no need to submit again.",
      });
    }

    await collection.insertOne({
      ...lead,
      emailKey,
      mobileKey,
      program,
      source: "enroll-page",
      submittedAt: new Date(),
    });

    return response.status(201).json({ok: true});
  } catch (error) {
    console.error("Failed to store enrollment:", error);
    return response
      .status(502)
      .json({error: "We couldn't save your application. Please try again."});
  }
}
