import {Job} from "../models/Job.js";
import {JobApplication} from "../models/JobApplication.js";
import {publishedFilter} from "../models/plugins/contentPlugin.js";
import {AUDIT_ACTIONS} from "../models/AuditLog.js";
import {recordAudit} from "../services/audit.service.js";
import {csvSafe, escapeRegex} from "../utils/sanitize.js";
import {created, ok, paginated} from "../utils/respond.js";
import {ApiError, notFound} from "../utils/apiError.js";
import {hashIp, lastTenDigits} from "./lead.controller.js";
import {logger} from "../config/logger.js";
import {getResumeUploadAuth, storeResumeFile, verifyResumeUploadToken, verifyResumeFileOnServer, deleteResumeFile} from "../services/resumeUpload.service.js";
import {isImageKitUrl} from "../services/imagekit.service.js";
import {env} from "../config/env.js";

// ── Public ──────────────────────────────────────────────────────────────────

const notOpen = () =>
  new ApiError(400, "VALIDATION_ERROR", "This job is not accepting applications.", {
    fields: {job: "This job is not accepting applications."},
  });

const deadlinePassed = (job) => {
  const d = job.applicationDeadline || job.deadline;
  return d && new Date(d).getTime() < Date.now();
};

const loadOpenJobBySlug = async (slug) => {
  const job = await Job.findOne({...publishedFilter(), slug: String(slug)}).select(
    "_id title company deadline applicationDeadline acceptsApplications status",
  );
  if (!job) return null;
  if (job.status && job.status !== "published") return null;
  if (job.acceptsApplications === false) return null;
  if (deadlinePassed(job)) return null;
  return job;
};

export const resumeUploadAuth = async (request, response, next) => {
  try {
    const slug = request.params.jobId;
    const job = await loadOpenJobBySlug(slug);
    if (!job) return next(notOpen());
    // This is still an unauthenticated public endpoint, so the request context
    // is what gets authenticated: a published/open job, a Turnstile-validated
    // body (verifyTurnstile runs on the route), and a per-IP upload budget.
    // What comes back is not an ImageKit credential: it is an opaque, signed
    // uploadToken naming this request's random folder. The browser sends the
    // file bytes back to us, and we do the ImageKit upload server-side.
    const auth = getResumeUploadAuth({jobSlug: slug});
    return ok(response, auth);
  } catch (error) {
    return next(error);
  }
};

// The browser posts the raw file here. Nothing reaches ImageKit until the
// bytes have passed validateResumeFile(), and the destination folder is the one
// named by the signed token issued for this job a moment earlier.
export const resumeUpload = async (request, response, next) => {
  try {
    const slug = request.params.jobId;
    const job = await loadOpenJobBySlug(slug);
    if (!job) return next(notOpen());

    const {folder} = verifyResumeUploadToken({
      token: request.body.uploadToken,
      jobSlug: slug,
    });

    const file = request.file;
    if (!file?.buffer?.byteLength) {
      return next(new ApiError(400, "VALIDATION_ERROR", "No resume file was uploaded.", {
        fields: {resume: "Please choose a resume file."},
      }));
    }

    const stored = await storeResumeFile({
      buffer: file.buffer,
      mimetype: file.mimetype,
      originalname: file.originalname,
      folder,
    });
    return created(response, {...stored, resumeUploadToken: request.body.uploadToken});
  } catch (error) {
    return next(error);
  }
};

export const submit = async (request, response, next) => {
  let verifiedResume = null;
  try {
    const body = request.body;

    // Honeypot: answer like a success so the bot moves on, store nothing.
    if (body.company && body.company.trim()) return created(response, {ok: true});

    const job = await Job.findOne({
      ...publishedFilter(),
      slug: String(body.job),
    }).select("_id title company deadline applicationDeadline acceptsApplications status");

    if (!job) return next(notOpen());
    if (job.acceptsApplications === false) return next(notOpen());
    if (deadlinePassed(job)) return next(notOpen());

    const mobileKey = lastTenDigits(body.mobile || body.phone);
    const fullName = (body.fullName || body.name || "").trim();
    const mobile = String(body.mobile || body.phone || "").trim();
    const email = String(body.email || "").trim().toLowerCase();

    if (body.resumeFileId) {
      // Never trust a client-provided file id/URL. The signed token proves we
      // issued an upload for this job, and its folder is the only path the file
      // may live in; verification then checks the file's real ImageKit record.
      try {
        const {folder} = verifyResumeUploadToken({
          token: body.resumeUploadToken,
          jobSlug: String(body.job),
        });
        verifiedResume = await verifyResumeFileOnServer({
          fileId: body.resumeFileId,
          expectedFolder: folder,
        });
      } catch (error) {
        // A rejected file is an abuse signal (forged tokens, cross-folder file
        // ids, mismatched bytes). Record it with the request id so a pattern can
        // be traced back to an IP via the access logs — but never log the token
        // or the file contents.
        logger.warn(
          {requestId: request.id, job: String(body.job), code: error.code, reason: error.message},
          "resume verification failed",
        );
        throw error;
      }
    }

    const now = new Date();
    const baseDoc = {
      job: job._id,
      jobTitle: job.title || "",
      jobCompany: job.company || "",
      name: fullName,
      fullName,
      mobile,
      phone: mobile,
      email,
      mobileKey,
      currentLocation: body.currentLocation || body.location || "",
      gender: body.gender || "",
      totalExperience: body.totalExperience || body.experience || "",
      experience: body.totalExperience || body.experience || "",
      currentEmploymentStatus: body.currentEmploymentStatus || body.employmentStatus || "",
      employmentStatus: body.currentEmploymentStatus || body.employmentStatus || "",
      linkedinUrl: body.linkedinUrl || "",
      portfolioUrl: body.portfolioUrl || "",
      coverLetter: body.coverLetter || "",
      qualification: body.qualification || "",
      college: body.college || "",
      graduationYear: body.graduationYear || "",
      consent: true,
      status: "new",
      applicationStatus: "new",
      appliedAt: now,
      ipHash: hashIp(request.ip),
      userAgent: String(request.get("user-agent") || "").slice(0, 400),
    };

    if (verifiedResume) {
      Object.assign(baseDoc, {
        ...verifiedResume,
        resume: verifiedResume,
      });
    }

    // Duplicate prevention: one application per job per phone (mobileKey).
    const existing = await JobApplication.findOne({job: job._id, mobileKey}).select("_id");
    if (existing) {
      // If a resume was uploaded for this duplicate attempt, clean it up best-effort.
      if (verifiedResume?.resumeFileId) await deleteResumeFile(verifiedResume.resumeFileId);
      return next(
        new ApiError(409, "DUPLICATE_APPLICATION", "You have already applied for this job.", {
          fields: {mobile: "An application for this job with this mobile number already exists."},
        }),
      );
    }

    try {
      await JobApplication.create({
        ...baseDoc,
        statusHistory: [{from: "", to: "new", changedAt: now, changedBy: null, note: "Application submitted"}],
      });
    } catch (error) {
      if (error && error.code === 11000) {
        if (verifiedResume?.resumeFileId) await deleteResumeFile(verifiedResume.resumeFileId);
        return next(
          new ApiError(409, "DUPLICATE_APPLICATION", "You have already applied for this job.", {
            fields: {mobile: "An application for this job with this mobile number already exists."},
          }),
        );
      }
      throw error;
    }

    return created(response, {ok: true, message: "Application submitted successfully."});
  } catch (error) {
    // If submission failed after a verified upload, attempt cleanup to avoid orphans.
    if (verifiedResume?.resumeFileId) {
      try { await deleteResumeFile(verifiedResume.resumeFileId); } catch { /* ignore */ }
    }
    return next(error);
  }
};

// ── Admin ───────────────────────────────────────────────────────────────────

const buildFilter = (query) => {
  const filter = {};
  if (query.job) filter.job = String(query.job);
  if (query.status) filter.status = String(query.status);
  const search = typeof query.search === "string" ? query.search.slice(0, 200) : "";
  if (search) {
    const pattern = new RegExp(escapeRegex(search), "i");
    filter.$or = [
      {name: pattern}, {fullName: pattern}, {mobile: pattern}, {phone: pattern},
      {email: pattern}, {jobTitle: pattern}, {jobCompany: pattern},
    ];
  }
  const from = query.from ? new Date(String(query.from)) : null;
  const to = query.to ? new Date(String(query.to)) : null;
  if ((from && !isNaN(from)) || (to && !isNaN(to))) {
    filter.createdAt = {};
    if (from && !isNaN(from)) filter.createdAt.$gte = from;
    if (to && !isNaN(to)) {
      const end = new Date(to);
      end.setHours(23, 59, 59, 999);
      filter.createdAt.$lte = end;
    }
  }
  return filter;
};

const INTERNAL = "-ipHash -mobileKey";

const normalizeStatus = (s) => {
  const map = {
    reviewing: "under_review",
    hired: "selected",
  };
  return map[s] || s || "new";
};

export const list = async (request, response, next) => {
  try {
    const page = Math.min(Math.max(Number(request.query.page) || 1, 1), 10000);
    const limit = Math.min(Math.max(Number(request.query.limit) || 25, 1), 100);
    const filter = buildFilter(request.query);
    const sort = request.query.sort === "oldest" ? {createdAt: 1} : {createdAt: -1};

    const [items, total, statsAgg] = await Promise.all([
      JobApplication.find(filter).sort(sort).skip((page - 1) * limit).limit(limit).select(INTERNAL).lean(),
      JobApplication.countDocuments(filter),
      JobApplication.aggregate([
        {$match: filter},
        {$group: {_id: "$status", count: {$sum: 1}}},
      ]),
    ]);

    const stats = {
      totalApplications: total,
      new: 0,
      underReview: 0,
      shortlisted: 0,
      interviewScheduled: 0,
      selected: 0,
      rejected: 0,
    };
    for (const row of statsAgg) {
      const n = normalizeStatus(row._id);
      if (n === "new") stats.new += row.count;
      if (n === "under_review") stats.underReview += row.count;
      if (n === "shortlisted") stats.shortlisted += row.count;
      if (n === "interview_scheduled") stats.interviewScheduled += row.count;
      if (n === "selected") stats.selected += row.count;
      if (n === "rejected") stats.rejected += row.count;
    }

    return paginated(response, items, {page, limit, total, stats});
  } catch (error) {
    return next(error);
  }
};

export const getOne = async (request, response, next) => {
  try {
    const application = await JobApplication.findById(request.params.id).select(INTERNAL).lean();
    if (!application) return next(notFound("Application not found"));
    return ok(response, application);
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
    const before = await JobApplication.findById(request.params.id).select(INTERNAL);
    if (!before) return next(notFound("Application not found"));

    const nextStatus = request.body.status;
    const remark = typeof request.body.remark === "string" ? request.body.remark.trim() : "";
    const now = new Date();

    if (nextStatus && nextStatus !== before.status) {
      before.statusHistory.push({
        from: before.status || "",
        to: nextStatus,
        changedAt: now,
        changedBy: request.admin?._id || null,
        note: remark || "",
      });
      before.status = nextStatus;
      before.applicationStatus = nextStatus;
    }
    if (remark) {
      before.adminRemarks.push({body: remark, addedAt: now, addedBy: request.admin?._id || null});
    }
    await before.save();

    await recordAudit(request, {
      action: AUDIT_ACTIONS.APPLICATION_UPDATED,
      actor: request.admin,
      targetType: "job-application",
      targetId: before._id,
      metadata: {from: request.body._from || undefined, to: nextStatus, remarked: Boolean(remark)},
    });

    const application = await JobApplication.findById(before._id).select(INTERNAL).lean();
    return ok(response, application);
  } catch (error) {
    return next(error);
  }
};

export const remove = async (request, response, next) => {
  try {
    const application = await JobApplication.findById(request.params.id);
    if (!application) return next(notFound("Application not found"));

    await JobApplication.deleteOne({_id: application._id});

    // The resume lives on ImageKit, not in the database row. Deleting the
    // application must destroy the file too, or it is an orphan forever.
    const fileId = application.resumeFileId || application.resume?.resumeFileId;
    if (fileId) await deleteResumeFile(fileId);

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

export const resume = async (request, response, next) => {
  try {
    const application = await JobApplication.findById(request.params.id)
      .select("resume resumeFileId resumeUrl resumeFileName imageKitFilePath")
      .lean();
    if (!application) return next(notFound("Application not found"));
    const fileId = application.resumeFileId || application.resume?.resumeFileId;
    const directUrl = application.resumeUrl || application.resume?.resumeUrl;
    if (!fileId && !directUrl) return next(notFound("Resume not found"));

    let target = null;
    // Try to generate a short-lived authenticated URL for private assets when possible.
    if (fileId && env.imagekitConfigured) {
      try {
        const ImageKit = (await import("@imagekit/nodejs")).default;
        const ik = new ImageKit({
          privateKey: env.IMAGEKIT_PRIVATE_KEY,
          publicKey: env.IMAGEKIT_PUBLIC_KEY,
          urlEndpoint: env.IMAGEKIT_URL_ENDPOINT,
        });
        const details = typeof ik.files.get === "function" ? await ik.files.get(fileId) : null;
        const path = details?.filePath || details?.file_path || application.imageKitFilePath || application.resume?.imageKitFilePath;
        // @imagekit/nodejs v7 has no ik.url(); signing is ik.helper.buildSrc().
        // Without this the branch never ran and private resumes never previewed.
        const signed = path && ik.helper?.buildSrc?.({
          src: path,
          urlEndpoint: env.IMAGEKIT_URL_ENDPOINT,
          signed: true,
          expiresIn: 300,
        });
        if (signed && isImageKitUrl(signed)) target = signed;
      } catch {
        // fall through to stored URL if signing unavailable
      }
    }
    // Stored URLs are only trusted if they point at our ImageKit host. Legacy
    // rows (or anything that wrote resumeUrl directly) must not be able to turn
    // an admin's "View resume" click into an open redirect.
    if (!target && directUrl && isImageKitUrl(directUrl)) target = directUrl;
    if (!target) return next(notFound("Resume not found"));

    // The admin panel reaches this route with fetch(). Following a redirect to
    // ImageKit there makes it a credentialed cross-origin request, which the
    // browser blocks on CORS. Returning the URL as JSON lets the panel open it
    // as a plain top-level navigation, which CORS does not apply to. Direct
    // browser links keep getting the redirect.
    if (request.query.format === "json") return ok(response, {url: target});
    return response.redirect(target);
  } catch (error) {
    return next(error);
  }
};

const CSV_COLUMNS = [
  ["Applied", (row) => (row.appliedAt || row.createdAt ? new Date(row.appliedAt || row.createdAt).toISOString() : "")],
  ["Job", (row) => row.jobTitle || ""],
  ["Company", (row) => row.jobCompany || ""],
  ["Candidate", (row) => row.fullName || row.name || ""],
  ["Email", (row) => row.email || ""],
  ["Phone", (row) => row.mobile || row.phone || ""],
  ["Location", (row) => row.currentLocation || ""],
  ["Experience", (row) => row.totalExperience || row.experience || ""],
  ["Status", (row) => row.status || ""],
  ["Resume", (row) => row.resumeUrl || row.resume?.resumeUrl || ""],
];

export const exportCsv = async (request, response, next) => {
  try {
    const rows = await JobApplication.find(buildFilter(request.query)).sort({createdAt: -1}).limit(5000).lean();

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
    return response.send(`\uFEFF${lines.join("\r\n")}`);
  } catch (error) {
    return next(error);
  }
};
