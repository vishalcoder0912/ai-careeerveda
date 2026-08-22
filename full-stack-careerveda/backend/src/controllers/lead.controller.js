import {createHmac} from "node:crypto";

import {Lead, LEAD_TYPES, LEAD_STATUSES, MAX_ENROLLMENTS_PER_USER} from "../models/Lead.js";
import {Program} from "../models/Program.js";
import {publishedFilter} from "../models/plugins/contentPlugin.js";
import {AUDIT_ACTIONS} from "../models/AuditLog.js";
import {recordAudit} from "../services/audit.service.js";
import {env} from "../config/env.js";
import {csvSafe, escapeRegex} from "../utils/sanitize.js";
import {ok, created, paginated} from "../utils/respond.js";
import {notFound, ApiError} from "../utils/apiError.js";

// Same reduction api/enroll.js uses: the last ten digits, so formatting cannot
// be used to slip past the submission cap.
const lastTenDigits = (mobile) => String(mobile || "").replace(/\D/g, "").slice(-10);

// Keyed with the refresh secret so the hash cannot be reversed by hashing every
// IPv4 address — an unsalted SHA of an IP is not anonymisation, the keyspace is
// only four billion.
const hashIp = (ip) =>
  ip ? createHmac("sha256", env.JWT_REFRESH_SECRET).update(String(ip)).digest("hex") : "";

// The site and its admissions team are in India. Cloud Run runs in UTC, so a
// `setHours(0,0,0,0)` day boundary would roll "today" over at 5:30 AM IST —
// a lead dropped at 11 PM would be missing from Today for hours. The boundary
// is therefore anchored to midnight Asia/Kolkata, regardless of the host's
// timezone.
const IST_TZ = "Asia/Kolkata";

// Built once, not per call: Intl.DateTimeFormat compiles a locale pattern and is
// expensive to construct, and startOfTodayIST runs on every stats request.
const IST_DATE_FORMATTER = new Intl.DateTimeFormat("en-CA", {
  timeZone: IST_TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

// Returns the UTC instant of midnight at the start of today in Kolkata.
const startOfTodayIST = () => {
  const parts = IST_DATE_FORMATTER.formatToParts(new Date());
  // formatToParts always yields year/month/day for these options; the guard
  // keeps a future options change from crashing the stats route.
  const part = (type) => Number(parts.find((entry) => entry.type === type)?.value ?? 0);
  // Date.UTC builds midnight UTC for the calendar date seen in Kolkata; IST is
  // UTC+5:30, so midnight IST is five and a half hours earlier.
  return Date.UTC(part("year"), part("month") - 1, part("day")) - 5.5 * 60 * 60 * 1000;
};

// ── Public submission ───────────────────────────────────────────────────────

export const submit = async (request, response, next) => {
  try {
    const body = request.body;

    // Honeypot. Answer 200 so the bot believes it succeeded and does not retry,
    // but write nothing. Behaviour carried over from the existing functions.
    if (body.company && body.company.trim()) {
      return created(response, {ok: true});
    }

    const type = body.type || "consultation";
    const emailKey = body.email.toLowerCase();
    const mobileKey = lastTenDigits(body.mobile);

    // Idempotency: a retried request with the same key returns the original
    // result instead of creating a second lead. Checked before anything else
    // so a network retry is cheap.
    const idempotencyKey = request.get("idempotency-key") || null;
    if (idempotencyKey) {
      const existing = await Lead.findOne({idempotencyKey});
      if (existing) return created(response, {ok: true, id: existing._id, deduplicated: true});
    }

    // The program must be one that actually exists and is published. Reading
    // from the database rather than a second hard-coded list means a program
    // cannot be valid on the form and rejected by the API.
    if (body.program) {
      // String(), so the value compared against a title is a title and not a
      // shape. submitLeadSchema already types this field; the coercion is here
      // because the guarantee belongs next to the query, not three files away
      // in whichever middleware happens to run first.
      const known = await Program.findOne({
        ...publishedFilter(),
        title: String(body.program),
      }).select("_id");
      if (!known) {
        return next(
          new ApiError(400, "VALIDATION_ERROR", "Please choose a valid program.", {
            fields: {program: "Please choose a valid program."},
          }),
        );
      }
    }

    // The two-submission cap, preserved from api/enroll.js. Counts matches on
    // either key, so a different email with the same phone still counts as the
    // same person. Enrollments only — a consultation is not an application.
    if (type === "enrollment") {
      const priorCount = await Lead.countDocuments({
        type: "enrollment",
        $or: [{emailKey}, {mobileKey}],
      });

      if (priorCount >= MAX_ENROLLMENTS_PER_USER) {
        return next(
          new ApiError(
            429,
            "ALREADY_APPLIED",
            "You've already applied. Our team has your details and will reach out — no need to submit again.",
          ),
        );
      }
    }

    // A repeat of the identical form within a few minutes is a double-click or
    // an impatient retry, not a second enquiry. Flagged rather than refused,
    // because refusing a genuine correction is worse than one duplicate row.
    const recentDuplicate = await Lead.findOne({
      type: {$eq: type},
      emailKey: {$eq: emailKey},
      createdAt: {$gt: new Date(Date.now() - 5 * 60 * 1000)},
    }).select("_id");

    const lead = await Lead.create({
      type,
      name: body.name,
      email: body.email,
      mobile: body.mobile,
      userType: body.userType || "",
      program: body.program || "",
      message: body.message || "",
      emailKey,
      mobileKey,
      source: body.source || "",
      sourcePage: body.sourcePage || "",
      utm: body.utm || {},
      consent: Boolean(body.consent),
      spamScore: recentDuplicate ? 30 : 0,
      ipHash: hashIp(request.ip),
      userAgent: String(request.get("user-agent") || "").slice(0, 400),
      idempotencyKey,
    });

    // 201 only after the write resolved. The frontend must never be told a
    // submission was saved when it was not — a silently dropped applicant is
    // worse than a visible failure.
    return created(response, {ok: true, id: lead._id});
  } catch (error) {
    // A duplicate idempotency key means a concurrent retry won the race. That
    // is a success from the caller's point of view, not an error.
    if (error && error.code === 11000 && error.keyPattern && error.keyPattern.idempotencyKey) {
      return created(response, {ok: true, deduplicated: true});
    }
    return next(error);
  }
};

// ── Admin management ────────────────────────────────────────────────────────

// Every value here is re-derived from the request rather than copied out of it.
// leadListQuery validates all of them before a handler runs, so this is the
// second layer — but it is the layer that lives beside the query, and a lead row
// holds a name, an email and a phone number, which is the last collection where
// a filter should depend on middleware ordering to be safe.
//
// `find` rather than a truthiness check: what reaches Mongo is the element out
// of our own constant list, not the caller's string that happened to equal it.
const buildLeadFilter = (query) => {
  const filter = {};

  const type = LEAD_TYPES.find((allowed) => allowed === query.type);
  const status = LEAD_STATUSES.find((allowed) => allowed === query.status);
  if (type) filter.type = type;
  if (status) filter.status = status;

  // Strict true, not truthiness: the schema hands over a real boolean, and
  // anything else is treated as "not archived" rather than passed through.
  filter.archived = query.archived === true;

  // Dates only. z.coerce.date() produces a Date; a value that is not one has no
  // business becoming a range bound, so it is dropped rather than compared.
  const from = query.from instanceof Date && !Number.isNaN(query.from.getTime()) ? query.from : null;
  const to = query.to instanceof Date && !Number.isNaN(query.to.getTime()) ? query.to : null;
  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = from;
    if (to) filter.createdAt.$lte = to;
  }

  const search = typeof query.search === "string" ? query.search.slice(0, 200) : null;
  if (search) {
    // escapeRegex stops the input being a pattern in its own right; the typeof
    // check above stops it being an object. Only the value is caller-derived —
    // every key in `filter` is written by this function.
    const pattern = new RegExp(escapeRegex(search), "i");
    filter.$or = [{name: pattern}, {email: pattern}, {mobile: pattern}, {program: pattern}];
  }

  return filter;
};

export const list = async (request, response, next) => {
  try {
    // Clamped here as well as in the schema, for the same reason as the filter
    // above: skip/limit are arithmetic that reaches the driver.
    const page = Math.min(Math.max(Number(request.query.page) || 1, 1), 10000);
    const limit = Math.min(Math.max(Number(request.query.limit) || 25, 1), 100);
    const filter = buildLeadFilter(request.query);

    const [items, total] = await Promise.all([
      Lead.find(filter)
        .sort({createdAt: -1})
        .skip((page - 1) * limit)
        .limit(limit)
        // ipHash and idempotencyKey are internal; nothing in the admin UI
        // shows them and there is no reason to move them over the wire.
        .select("-ipHash -idempotencyKey")
        .populate("assignedTo", "name email")
        .lean(),
      Lead.countDocuments(filter),
    ]);

    return paginated(response, items, {page, limit, total});
  } catch (error) {
    return next(error);
  }
};

export const getOne = async (request, response, next) => {
  try {
    const lead = await Lead.findById(request.params.id)
      .select("-ipHash -idempotencyKey")
      .populate("assignedTo", "name email")
      .populate("notes.author", "name email")
      .lean();

    if (!lead) return next(notFound("Lead not found"));

    return ok(response, lead);
  } catch (error) {
    return next(error);
  }
};

export const update = async (request, response, next) => {
  try {
    const lead = await Lead.findById(request.params.id);
    if (!lead) return next(notFound("Lead not found"));

    const {status, assignedTo, archived} = request.body;
    const before = lead.status;

    if (status !== undefined) lead.status = status;
    if (assignedTo !== undefined) lead.assignedTo = assignedTo;
    if (archived !== undefined) lead.archived = archived;

    await lead.save();

    await recordAudit(request, {
      action: AUDIT_ACTIONS.LEAD_UPDATED,
      actor: request.admin,
      targetType: "lead",
      targetId: lead._id,
      // The lead's own details are not copied into the audit metadata — the
      // trail records who changed what state, not a second copy of a member of
      // the public's contact information.
      metadata: {from: before, to: lead.status, archived: lead.archived},
    });

    return ok(response, lead);
  } catch (error) {
    return next(error);
  }
};

export const remove = async (request, response, next) => {
  try {
    const lead = await Lead.findByIdAndDelete(request.params.id);
    if (!lead) return next(notFound("Lead not found"));

    await recordAudit(request, {
      action: AUDIT_ACTIONS.LEAD_DELETED,
      actor: request.admin,
      targetType: "lead",
      targetId: request.params.id,
      metadata: {email: lead.email},
    });

    return ok(response, {deleted: true, id: request.params.id});
  } catch (error) {
    return next(error);
  }
};

export const addNote = async (request, response, next) => {
  try {
    const lead = await Lead.findById(request.params.id);
    if (!lead) return next(notFound("Lead not found"));

    lead.notes.push({body: request.body.body, author: request.admin._id});
    await lead.save();

    return created(response, lead);
  } catch (error) {
    return next(error);
  }
};

const CSV_COLUMNS = [
  ["Submitted", (lead) => lead.createdAt.toISOString()],
  ["Type", (lead) => lead.type],
  ["Name", (lead) => lead.name],
  ["Email", (lead) => lead.email],
  ["Mobile", (lead) => lead.mobile],
  ["User type", (lead) => lead.userType],
  ["Program", (lead) => lead.program],
  ["Message", (lead) => lead.message],
  ["Status", (lead) => lead.status],
  ["Source", (lead) => lead.source],
  ["Source page", (lead) => lead.sourcePage],
  ["UTM source", (lead) => (lead.utm || {}).source],
  ["UTM medium", (lead) => (lead.utm || {}).medium],
  ["UTM campaign", (lead) => (lead.utm || {}).campaign],
  ["UTM term", (lead) => (lead.utm || {}).term],
  ["UTM content", (lead) => (lead.utm || {}).content],
  ["Consent", (lead) => (lead.consent ? "yes" : "no")],
];

export const exportCsv = async (request, response, next) => {
  try {
    const filter = request.query.ids
      ? {_id: {$in: request.query.ids}}
      : buildLeadFilter(request.query);

    // Bounded: an unbounded export would build the entire collection as a
    // string in memory.
    const leads = await Lead.find(filter).sort({createdAt: -1}).limit(5000).lean();

    // Every cell goes through csvSafe, which prefixes a leading =, +, - or @
    // with an apostrophe. Without it a lead who types "=HYPERLINK(...)" as
    // their name becomes a live formula the moment someone opens the export.
    const rows = [
      CSV_COLUMNS.map(([header]) => csvSafe(header)).join(","),
      ...leads.map((lead) =>
        CSV_COLUMNS.map(([, read]) => csvSafe(read(lead))).join(","),
      ),
    ];

    await recordAudit(request, {
      action: AUDIT_ACTIONS.LEAD_EXPORTED,
      actor: request.admin,
      targetType: "lead",
      metadata: {count: leads.length, filtered: !request.query.ids},
    });

    response.setHeader("Content-Type", "text/csv; charset=utf-8");
    response.setHeader(
      "Content-Disposition",
      `attachment; filename="careerveda-leads-${new Date().toISOString().slice(0, 10)}.csv"`,
    );
    // Stops a browser rendering the response as a document if the disposition
    // header is ever dropped by a proxy.
    response.setHeader("X-Content-Type-Options", "nosniff");

    // A BOM, so Excel opens the file as UTF-8 and does not mangle the rupee
    // sign and the accented names.
    return response.send(`﻿${rows.join("\r\n")}`);
  } catch (error) {
    return next(error);
  }
};

export const stats = async (request, response, next) => {
  try {
    const todayStart = new Date(startOfTodayIST());

    const [byStatus, byType, total, recent, todayCount, byUserType] = await Promise.all([
      Lead.aggregate([{$match: {archived: false}}, {$group: {_id: "$status", count: {$sum: 1}}}]),
      Lead.aggregate([{$match: {archived: false}}, {$group: {_id: "$type", count: {$sum: 1}}}]),
      Lead.countDocuments({archived: false}),
      Lead.countDocuments({
        archived: false,
        createdAt: {$gt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)},
      }),
      Lead.countDocuments({archived: false, createdAt: {$gte: todayStart}}),
      Lead.aggregate([
        {$match: {archived: false, userType: {$ne: ""}}},
        {$group: {_id: "$userType", count: {$sum: 1}}},
      ]),
    ]);

    return ok(response, {
      total,
      lastSevenDays: recent,
      todayCount,
      byStatus: Object.fromEntries(byStatus.map((entry) => [entry._id, entry.count])),
      byType: Object.fromEntries(byType.map((entry) => [entry._id, entry.count])),
      byUserType: Object.fromEntries(byUserType.map((entry) => [entry._id, entry.count])),
    });
  } catch (error) {
    return next(error);
  }
};
