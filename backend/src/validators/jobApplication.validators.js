import {z} from "zod";

import {APPLICATION_STATUSES} from "../models/JobApplication.js";
import {stripTags, isValidSlug} from "../utils/sanitize.js";

// Same mobile rule as the lead form, so the two forms agree on what is valid.
const MOBILE_PATTERN = /^(\+?91[-\s]?)?[6-9]\d{9}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const objectId = z.string().regex(/^[a-f0-9]{24}$/i, "Invalid id");

export const submitApplicationSchema = z.object({
  job: z.string().max(140).refine(isValidSlug, "Please choose a valid job."),
  name: z
    .string()
    .max(120)
    .transform(stripTags)
    .transform((value) => value.trim())
    .refine((value) => value.length > 0, "Please enter your name."),
  mobile: z
    .string()
    .max(30)
    .trim()
    .refine((value) => MOBILE_PATTERN.test(value.replace(/[-\s]/g, "")), "That mobile number doesn't look right."),
  email: z
    .string()
    .max(254)
    .trim()
    .toLowerCase()
    .refine((value) => EMAIL_PATTERN.test(value), "That email doesn't look right."),
  consent: z.literal(true, {error: "Please agree to share these details with the hiring team."}),
  // Honeypot: hidden in the markup, so only bots fill it in.
  company: z.string().max(200).optional(),
});

export const applicationListQuery = z.object({
  page: z.coerce.number().int().min(1).max(10000).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(25),
  job: objectId.optional(),
  status: z.enum(APPLICATION_STATUSES).optional(),
  search: z.string().max(200).optional(),
});

export const updateApplicationSchema = z.object({
  status: z.enum(APPLICATION_STATUSES),
});

export const applicationIdParam = z.object({id: objectId});
