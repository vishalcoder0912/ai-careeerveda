import {z} from "zod";

import {LEAD_TYPES, LEAD_STATUSES} from "../models/Lead.js";
import {stripTags} from "../utils/sanitize.js";

// Field rules match api/_db.js so the browser's instant feedback and the
// server's real gate agree. The patterns are copied from there rather than
// rewritten: a stricter server than client means a form that says it is valid
// and then fails, which is worse than either rule alone.

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
// Indian mobile numbers, tolerating +91, spaces and dashes.
const MOBILE_PATTERN = /^(\+?91[-\s]?)?[6-9]\d{9}$/;

export const USER_TYPES = ["Student", "Working Professional", "Career Switcher"];

const text = (max) => z.string().max(max).transform(stripTags);

export const submitLeadSchema = z.object({
  type: z.enum(LEAD_TYPES).optional().default("consultation"),

  name: text(120).refine((value) => value.length > 0, "Please enter your name."),

  email: z
    .string()
    .max(254)
    .trim()
    .toLowerCase()
    .refine((value) => EMAIL_PATTERN.test(value), "That email doesn't look right."),

  mobile: z
    .string()
    .max(30)
    .trim()
    .refine(
      (value) => MOBILE_PATTERN.test(value.replace(/[-\s]/g, "")),
      "That mobile number doesn't look right.",
    ),

  userType: z.enum(USER_TYPES).optional(),

  program: text(300).optional().default(""),
  message: text(4000).optional().default(""),

  sourcePage: text(300).optional().default(""),
  source: text(120).optional().default(""),

  utm: z
    .object({
      source: text(200).optional().default(""),
      medium: text(200).optional().default(""),
      campaign: text(200).optional().default(""),
      term: text(200).optional().default(""),
      content: text(200).optional().default(""),
    })
    .optional(),

  consent: z.boolean().optional().default(false),

  // The honeypot. Hidden in the markup, so a person never fills it in and a
  // bot that fills every field does. Kept as `company` — the name the existing
  // forms already use.
  company: z.string().max(200).optional(),
});

export const leadListQuery = z.object({
  page: z.coerce.number().int().min(1).max(10000).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(25),
  type: z.enum(LEAD_TYPES).optional(),
  status: z.enum(LEAD_STATUSES).optional(),
  search: z.string().max(200).optional(),
  archived: z
    .enum(["true", "false"])
    .transform((value) => value === "true")
    .optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

export const updateLeadSchema = z.object({
  status: z.enum(LEAD_STATUSES).optional(),
  assignedTo: z.string().regex(/^[a-f0-9]{24}$/i).nullish(),
  archived: z.boolean().optional(),
});

export const addNoteSchema = z.object({
  body: text(4000).refine((value) => value.length > 0, "A note cannot be empty."),
});

// Export accepts the same filters as the list, plus an optional explicit id
// set so an admin can export exactly the rows they ticked.
export const exportQuery = leadListQuery.extend({
  ids: z
    .string()
    .max(4000)
    .optional()
    .transform((value) =>
      value
        ? value
            .split(",")
            .map((id) => id.trim())
            .filter((id) => /^[a-f0-9]{24}$/i.test(id))
        : undefined,
    ),
});
