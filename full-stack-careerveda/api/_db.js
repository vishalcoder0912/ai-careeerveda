// Shared MongoDB access for the serverless functions in this folder.
//
// The leading underscore matters: Vercel treats every other file in api/ as a
// route, but skips ones starting with `_`. This is a helper, not an endpoint.
//
// SECRETS: MONGODB_URI is read from the environment and never leaves the server.
// It deliberately has NO `VITE_` prefix — Vite inlines any VITE_* variable into
// the client bundle, which would publish the database password to every visitor.
// Set it in Vercel → Settings → Environment Variables (and in .env for local dev).

import {MongoClient} from "mongodb";

const DB_NAME = process.env.MONGODB_DB || "careerveda";

// A serverless function is re-invoked constantly, and a fresh connection per
// request would exhaust the Atlas connection limit under any real traffic. The
// client promise is cached on the module scope so warm invocations reuse the
// pool the previous one opened.
let clientPromise = null;

export const getClient = () => {
  const uri = process.env.MONGODB_URI;

  if (!uri) return null;

  if (!clientPromise) {
    clientPromise = new MongoClient(uri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 8000,
    }).connect();
  }

  return clientPromise;
};

export const getCollection = async (name) => {
  const client = await getClient();

  if (!client) return null;

  return client.db(DB_NAME).collection(name);
};

export const asString = (value) => (typeof value === "string" ? value.trim() : "");

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
// Indian mobile numbers, tolerating +91, spaces, and dashes.
export const MOBILE_PATTERN = /^(\+?91[-\s]?)?[6-9]\d{9}$/;

export const USER_TYPES = ["Student", "Working Professional", "Career Switcher"];

// Shared field checks. The browser runs its own copy for instant feedback; this
// one is the real gate, because anything sent from a browser can be forged.
export const validateLead = (body) => {
  const name = asString(body.name);
  const email = asString(body.email);
  const mobile = asString(body.mobile);
  const userType = asString(body.userType);

  const errors = {};

  if (!name) errors.name = "Please enter your name.";
  else if (name.length > 120) errors.name = "That name is too long.";

  if (!email) errors.email = "Please enter your email.";
  else if (!EMAIL_PATTERN.test(email)) errors.email = "That email doesn't look right.";

  if (!mobile) errors.mobile = "Please enter your mobile number.";
  else if (!MOBILE_PATTERN.test(mobile.replace(/[-\s]/g, ""))) {
    errors.mobile = "That mobile number doesn't look right.";
  }

  if (!USER_TYPES.includes(userType)) errors.userType = "Please choose a valid user type.";

  return {errors, lead: {name, email, mobile, userType}};
};
