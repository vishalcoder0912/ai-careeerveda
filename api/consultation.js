// Vercel serverless function: POST /api/consultation
//
// Receives a consultation lead from the home page form and stores it in
// MongoDB. Runs server-side only, so MONGODB_URI never reaches the browser —
// note it deliberately has no VITE_ prefix, because Vite inlines any variable
// that does into the client bundle.
//
// Required environment variables (set in Vercel → Settings → Environment
// Variables, and in .env for local `vercel dev`):
//   MONGODB_URI  mongodb+srv://user:pass@cluster.mongodb.net/?retryWrites=true
//   MONGODB_DB   database name, e.g. careerveda   (optional, defaults below)

import {getCollection, asString, validateLead} from "./_db.js";
import {programCatalog} from "../src/data/programCatalog.js";

const COLLECTION = "consultations";

// The form derives its choices from this catalog too. Reading both sides from
// one source means a legitimate course can never be accepted in the browser
// and rejected by the API because its title changed in only one place.
const PROGRAM_TITLES = programCatalog.map(({title}) => title);

export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return response.status(405).json({error: "Method not allowed."});
  }

  // Vercel parses JSON bodies for us, but guard against a non-object body.
  const body = typeof request.body === "object" && request.body !== null ? request.body : {};

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
  // for a lead that was never stored — a silently dropped lead is worse than a
  // visible failure.
  if (!collection) {
    console.error("MONGODB_URI is not set; consultation lead was not stored.");
    return response.status(503).json({error: "Submissions aren't configured yet. Please try again later."});
  }

  try {
    await collection.insertOne({
      ...lead,
      program,
      source: "home-consultation-form",
      submittedAt: new Date(),
    });

    return response.status(201).json({ok: true});
  } catch (error) {
    console.error("Failed to store consultation lead:", error);
    return response.status(502).json({error: "We couldn't save your details. Please try again."});
  }
}
