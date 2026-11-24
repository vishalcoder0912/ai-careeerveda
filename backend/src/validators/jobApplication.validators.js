import {z} from "zod";

import {APPLICATION_STATUSES} from "../models/JobApplication.js";
import {stripTags, isValidSlug} from "../utils/sanitize.js";

// Same mobile rule as the lead form, so the two forms agree on what is valid.
const MOBILE_PATTERN = /^(\+?91[-\s]?)?[6-9]\d{9}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const URL_OPTIONAL = z
  .string()
  .max(500)
  .trim()
  .optional()
  .transform((v) => v || "")
  .refine((v) => !v || /^https?:\/\//i.test(v), "Please enter a valid URL.");

const objectId = z.string().regex(/^[a-f0-9]{24}$/i, "Invalid id");
const clean = (max = 200) =>
  z
    .string()
    .max(max)
    .transform(stripTags)
    .transform((value) => value.trim());

export const submitApplicationSchema = z.object({
  job: z.string().max(140).refine(isValidSlug, "Please choose a valid job."),
  name: clean(120).optional().default(""),
  fullName: clean(120).optional().default(""),
  mobile: z
    .string()
    .max(30)
    .trim()
    .refine((value) => MOBILE_PATTERN.test(value.replace(/[-\s]/g, "")), "That mobile number doesn't look right."),
  phone: z.string().max(30).trim().optional().default(""),
  email: z
    .string()
    .max(254)
    .trim()
    .toLowerCase()
    .refine((value) => EMAIL_PATTERN.test(value), "That email doesn't look right."),
  currentLocation: clean(200).optional().default(""),
  location: clean(200).optional().default(""),
  gender: clean(40).optional().default(""),
  totalExperience: clean(120).optional().default(""),
  experience: clean(120).optional().default(""),
  currentEmploymentStatus: clean(120).optional().default(""),
  employmentStatus: clean(120).optional().default(""),
  linkedinUrl: URL_OPTIONAL,
  portfolioUrl: URL_OPTIONAL,
  coverLetter: z.string().max(5000).transform(stripTags).optional().default(""),
  qualification: clean(200).optional().default(""),
  college: clean(200).optional().default(""),
  graduationYear: clean(20).optional().default(""),
  resumeFileId: z.string().max(200).optional().default(""),
  resumeUrl: z.string().max(2000).optional().default(""),
  resumeFileName: z.string().max(300).transform(stripTags).optional().default(""),
  resumeFileSize: z.coerce.number().int().min(0).max(5 * 1024 * 1024).optional().default(0),
  resumeMimeType: z.string().max(120).optional().default(""),
  imageKitFilePath: z.string().max(1000).optional().default(""),
  // Signed at resume-upload-auth and required back with the file id: it names
  // the random folder the upload was authorised for, so a file id from anywhere
  // else cannot be attached to this application.
  resumeUploadToken: z.string().max(2000).optional().default(""),
  consent: z.literal(true, {error: "Please agree to share these details with the hiring team."}),
  // Honeypot: hidden in the markup, so only bots fill it in.
  company: z.string().max(200).optional(),
}).superRefine((value, ctx) => {
  const resolvedName = (value.fullName || value.name || "").trim();
  if (!resolvedName) {
    ctx.addIssue({code: z.ZodIssueCode.custom, path: ["fullName"], message: "Please enter your full name."});
  }
  if (value.resumeFileId && !value.resumeUploadToken) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["resume"],
      message: "Please upload your resume again.",
    });
  }
});

export const resumeAuthSchema = z.object({
  turnstileToken: z.string().max(2048).optional(),
});

// Multipart fields are parsed by multer before this runs; the file itself is
// read by the controller, not trusted as a string.
export const resumeUploadSchema = z.object({
  uploadToken: z.string().min(1).max(2000),
});

export const applicationListQuery = z.object({
  page: z.coerce.number().int().min(1).max(10000).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(25),
  job: objectId.optional(),
  status: z.enum(APPLICATION_STATUSES).optional(),
  search: z.string().max(200).optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  sort: z.string().max(40).optional(),
});

export const updateApplicationSchema = z.object({
  status: z.enum(APPLICATION_STATUSES),
  remark: z.string().max(2000).transform(stripTags).optional(),
});

export const applicationIdParam = z.object({id: objectId});
export const jobSlugParam = z.object({jobId: z.string().max(140).refine(isValidSlug, "Invalid job")});
