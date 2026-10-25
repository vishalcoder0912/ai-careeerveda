import {Job} from "../models/Job.js";
import {JobApplication} from "../models/JobApplication.js";
import {publishedFilter} from "../models/plugins/contentPlugin.js";
import {AUDIT_ACTIONS} from "../models/AuditLog.js";
import {recordAudit} from "../services/audit.service.js";
import {csvSafe, escapeRegex} from "../utils/sanitize.js";
import {created, ok, paginated} from "../utils/respond.js";
import {ApiError, notFound} from "../utils/apiError.js";
import {hashIp, lastTenDigits} from "./lead.controller.js";

// ── Public submission ───────────────────────────────────────────────────────

const notOpen = () =>
  new ApiError(400, "VALIDATION_ERROR", "This job is not accepting applications.", {
    fields: {job: "This job is not accepting applications."},
  });

export const submit = async (request, response, next) => {
  try {
    const body = request.body;

    // Honeypot: answer like a success so the bot moves on, store nothing.
    if (body.company && body.company.trim()) return created(response, {ok: true});

    // Any published job not past its deadline: every listing takes applications.
    // The slug is validated by the schema; the filter keys are all ours.
    const job = await Job.findOne({
      ...publishedFilter(),
      slug: String(body.job),
    }).select("_id title company deadline");

    if (!job) return next(notOpen());
    if (job.deadline && job.deadline.getTime() < Date.now()) return next(notOpen());

    const mobileKey = lastTenDigits(body.mobile);

    // Get-or-create on the natural key (one application per job per phone),
    // NOT a plain insert. Production runs Firestore, where Mongoose's
    // auto-indexing is off and the unique index exists only after someone ran
    // `npm run sync:indexes` — which did not include this model for a while.
    // The upsert keeps a repeated submit idempotent even on a database whose
    // index is still missing, and the index (once created) closes the
    // concurrent-request race. Both outcomes answer 201 {ok: true}, so the
    // endpoint cannot be used to learn who has applied where.
    try {
      await JobApplication.updateOne(
        {job: job._id, mobileKey},
        {
          $setOnInsert: {
            job: job._id,
            jobTitle: job.title,
            jobCompany: job.company,
            name: body.name,
            mobile: body.mobile,
            mobileKey,
            lmsId: body.lmsId,
            consent: true,
            status: "new",
            ipHash: hashIp(request.ip),
            userAgent: String(request.get("user-agent") || "").slice(0, 400),
          },
        },
        {upsert: true},
      );
    } catch (error) {
      // With the unique index in place, two simultaneous submissions can still
      // collide on insert. The first one won; answer the second like a success.
      if (error && error.code === 11000) return created(response, {ok: true});
      throw error;
    }

    return created(response, {ok: true});
  } catch (error) {
    return next(error);
  }
};

// ── Admin ───────────────────────────────────────────────────────────────────

// Every key is written here; only validated values come from the request.
const buildFilter = (query) => {
  const filter = {};
  if (query.job) filter.job = String(query.job);
  if (query.status) filter.status = String(query.status);
  const search = typeof query.search === "string" ? query.search.slice(0, 200) : "";
  if (search) {
    const pattern = new RegExp(escapeRegex(search), "i");
    filter.$or = [{name: pattern}, {mobile: pattern}, {lmsId: pattern}, {jobTitle: pattern}, {jobCompany: pattern}];
  }
  return filter;
};

const INTERNAL = "-ipHash -mobileKey";

export const list = async (request, response, next) => {
  try {
    const page = Math.min(Math.max(Number(request.query.page) || 1, 1), 10000);
    const limit = Math.min(Math.max(Number(request.query.limit) || 25, 1), 100);
    const filter = buildFilter(request.query);

    const [items, total] = await Promise.all([
      JobApplication.find(filter).sort({createdAt: -1}).skip((page - 1) * limit).limit(limit).select(INTERNAL).lean(),
      JobApplication.countDocuments(filter),
    ]);

    return paginated(response, items, {page, limit, total});
  } catch (error) {
    return next(error);
  }
};

// The jobs that have applications, for the admin's "filter by job" menu.
export const jobs = async (request, response, next) => {
  try {
    const rows = await JobApplication.aggregate([
      {$group: {_id: "$job", title: {$last: "$jobTitle"}, company: {$last: "$jobCompany"}, count: {$sum: 1}}},
      {$sort: {count: -1}},
      {$limit: 200},
    ]);
    return ok(response, rows);
  } catch (error) {
    return next(error);
  }
};

export const update = async (request, response, next) => {
  try {
    // new: false returns the record as it was, which gives the audit its "from".
    const before = await JobApplication.findByIdAndUpdate(
      request.params.id,
      {$set: {status: request.body.status}},
      {new: false, runValidators: true, projection: INTERNAL},
    ).lean();
    if (!before) return next(notFound("Application not found"));

    const application = {...before, status: request.body.status};

    await recordAudit(request, {
      action: AUDIT_ACTIONS.APPLICATION_UPDATED,
      actor: request.admin,
      targetType: "job-application",
      targetId: application._id,
      metadata: {from: before.status, to: application.status},
    });

    return ok(response, application);
  } catch (error) {
    return next(error);
  }
};

export const remove = async (request, response, next) => {
  try {
    const application = await JobApplication.findByIdAndDelete(request.params.id);
    if (!application) return next(notFound("Application not found"));

    await recordAudit(request, {
      action: AUDIT_ACTIONS.APPLICATION_DELETED,
      actor: request.admin,
      targetType: "job-application",
      targetId: request.params.id,
      metadata: {job: application.jobTitle},
    });

    return ok(response, {deleted: true, id: request.params.id});
  } catch (error) {
    return next(error);
  }
};

const CSV_COLUMNS = [
  ["Applied", (row) => row.createdAt.toISOString()],
  ["Job", (row) => row.jobTitle],
  ["Company", (row) => row.jobCompany],
  ["Name", (row) => row.name],
  ["Mobile", (row) => row.mobile],
  ["LMS ID", (row) => row.lmsId],
  ["Status", (row) => row.status],
];

export const exportCsv = async (request, response, next) => {
  try {
    const rows = await JobApplication.find(buildFilter(request.query)).sort({createdAt: -1}).limit(5000).lean();

    // csvSafe neutralises cells that a spreadsheet would run as a formula.
    const lines = [
      CSV_COLUMNS.map(([header]) => csvSafe(header)).join(","),
      ...rows.map((row) => CSV_COLUMNS.map(([, read]) => csvSafe(read(row))).join(",")),
    ];

    await recordAudit(request, {
      action: AUDIT_ACTIONS.APPLICATION_EXPORTED,
      actor: request.admin,
      targetType: "job-application",
      metadata: {count: rows.length},
    });

    response.setHeader("Content-Type", "text/csv; charset=utf-8");
    response.setHeader(
      "Content-Disposition",
      `attachment; filename="careerveda-job-applications-${new Date().toISOString().slice(0, 10)}.csv"`,
    );
    response.setHeader("X-Content-Type-Options", "nosniff");
    return response.send(`﻿${lines.join("\r\n")}`);
  } catch (error) {
    return next(error);
  }
};
