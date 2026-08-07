// The audit service's contract has two halves and only one of them is visible
// through the routes: a row gets written, and a write that fails does NOT take
// the caller's request down with it. The second half is what these cover — the
// integration suites exercise recordAudit only by side effect, so if the catch
// were removed tomorrow they would still pass right up until a database hiccup
// locked everyone out of the panel.

import {describe, it, expect, vi, beforeEach, afterEach} from "vitest";
import mongoose from "mongoose";

import {recordAudit} from "../src/services/audit.service.js";
import {AuditLog, AUDIT_ACTIONS} from "../src/models/AuditLog.js";
import {logger} from "../src/config/logger.js";

const actor = {
  _id: new mongoose.Types.ObjectId(),
  email: "editor@careerveda.test",
  role: "editor",
};

const requestOf = (overrides = {}) => ({
  id: "req-123",
  ip: "203.0.113.42",
  get: (header) => (header === "user-agent" ? "Mozilla/5.0 (test)" : undefined),
  ...overrides,
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("recordAudit", () => {
  it("writes a row carrying the actor, the action and the target", async () => {
    await recordAudit(requestOf(), {
      action: AUDIT_ACTIONS.CONTENT_PUBLISHED,
      actor,
      targetType: "Program",
      targetId: "507f1f77bcf86cd799439011",
    });

    const entry = await AuditLog.findOne({action: AUDIT_ACTIONS.CONTENT_PUBLISHED}).lean();

    expect(entry).toBeTruthy();
    expect(String(entry.actor)).toBe(String(actor._id));
    expect(entry.actorEmail).toBe(actor.email);
    expect(entry.actorRole).toBe(actor.role);
    expect(entry.targetType).toBe("Program");
    expect(entry.targetId).toBe("507f1f77bcf86cd799439011");
    expect(entry.outcome).toBe("success");
  });

  it("truncates the IP to a prefix — enough to spot a burst, not a location log", async () => {
    await recordAudit(requestOf(), {action: AUDIT_ACTIONS.LOGIN_SUCCESS, actor});

    const entry = await AuditLog.findOne({action: AUDIT_ACTIONS.LOGIN_SUCCESS}).lean();

    expect(entry.ipPrefix).toBe("203.0.x.x");
    expect(entry.ipPrefix).not.toContain("113");
  });

  it("caps the user agent at 400 characters so one client cannot bloat the collection", async () => {
    const request = requestOf({get: () => "U".repeat(5000)});

    await recordAudit(request, {action: AUDIT_ACTIONS.LOGIN_SUCCESS, actor});

    const entry = await AuditLog.findOne({}).lean();
    expect(entry.userAgent).toHaveLength(400);
  });

  it("records a failed login without asserting an identity it could not verify", async () => {
    await recordAudit(requestOf(), {
      action: AUDIT_ACTIONS.LOGIN_FAILED,
      actorEmail: "someone@example.com",
      outcome: "failure",
    });

    const entry = await AuditLog.findOne({}).lean();

    expect(entry.actor).toBeNull();
    expect(entry.actorRole).toBeNull();
    expect(entry.actorEmail).toBe("someone@example.com");
    expect(entry.outcome).toBe("failure");
  });

  it("prefers an explicit actorEmail over the actor's own, for a rename in flight", async () => {
    await recordAudit(requestOf(), {
      action: AUDIT_ACTIONS.USER_UPDATED,
      actor,
      actorEmail: "typed@example.com",
    });

    const entry = await AuditLog.findOne({}).lean();
    expect(entry.actorEmail).toBe("typed@example.com");
  });

  it("stringifies an ObjectId target, since targetId is a string column", async () => {
    const id = new mongoose.Types.ObjectId();

    await recordAudit(requestOf(), {action: AUDIT_ACTIONS.CONTENT_DELETED, actor, targetId: id});

    const entry = await AuditLog.findOne({}).lean();
    expect(entry.targetId).toBe(String(id));
  });

  it("carries the request id, so a log line and an audit row can be joined", async () => {
    await recordAudit(requestOf({id: "trace-xyz"}), {action: AUDIT_ACTIONS.LOGOUT, actor});

    const entry = await AuditLog.findOne({}).lean();
    expect(entry.requestId).toBe("trace-xyz");
  });

  it("works with no request at all, for actions raised by a background job", async () => {
    await expect(
      recordAudit(null, {action: AUDIT_ACTIONS.CONTENT_PUBLISHED, actor}),
    ).resolves.toBeUndefined();

    const entry = await AuditLog.findOne({}).lean();
    expect(entry.requestId).toBeNull();
    expect(entry.ipPrefix).toBe("");
    expect(entry.userAgent).toBe("");
  });

  it("persists the metadata it was given", async () => {
    await recordAudit(requestOf(), {
      action: AUDIT_ACTIONS.SETTINGS_UPDATED,
      actor,
      metadata: {field: "siteTitle", from: "old", to: "new"},
    });

    const entry = await AuditLog.findOne({}).lean();
    expect(entry.metadata).toEqual({field: "siteTitle", from: "old", to: "new"});
  });

  it("stores no metadata key at all when none was supplied", async () => {
    // Mongoose minimizes an empty object away rather than storing `{}`. Reading
    // it back as undefined is therefore expected — anything consuming the audit
    // screen has to handle a missing key, not just an empty one.
    await recordAudit(requestOf(), {action: AUDIT_ACTIONS.SETTINGS_UPDATED, actor});

    const entry = await AuditLog.findOne({}).lean();
    expect(entry.metadata).toBeUndefined();
    // The hydrated document still presents it as an object.
    expect((await AuditLog.findOne({})).metadata).toEqual({});
  });

  // ── The half the integration suites cannot see ────────────────────────────

  it("does not reject when the write fails — a database hiccup must not fail the request", async () => {
    vi.spyOn(AuditLog, "create").mockRejectedValue(new Error("collection unavailable"));

    await expect(
      recordAudit(requestOf(), {action: AUDIT_ACTIONS.CONTENT_PUBLISHED, actor}),
    ).resolves.toBeUndefined();
  });

  it("logs the failure loudly rather than swallowing it — a silent gap in the trail is worse", async () => {
    const failure = new Error("collection unavailable");
    vi.spyOn(AuditLog, "create").mockRejectedValue(failure);
    const errorSpy = vi.spyOn(logger, "error").mockImplementation(() => {});

    await recordAudit(requestOf(), {action: AUDIT_ACTIONS.CONTENT_PURGED, actor});

    expect(errorSpy).toHaveBeenCalledTimes(1);
    const [context, message] = errorSpy.mock.calls[0];
    // The reason, not the error object. A mongoose write error carries the
    // rejected document, and that document is an audit row — actor email, IP
    // prefix, user agent. Those belong in the audit collection, not in the
    // application log, so only the message crosses over.
    expect(context.reason).toBe(failure.message);
    expect(context.err).toBeUndefined();
    // Nor the action: the names are audit-event detail themselves, and the
    // request id already identifies which entry was lost by pointing at the
    // pino-http line that has the method and path.
    expect(context.action).toBeUndefined();
    expect(context.requestId).toBe("req-123");
    expect(message).toMatch(/audit/i);
  });

  it("swallows a validation failure too, not only a connection one", async () => {
    const errorSpy = vi.spyOn(logger, "error").mockImplementation(() => {});

    // `action` is required by the schema; this is a caller bug, and it still
    // must not become the reason a legitimate publish fails.
    await expect(recordAudit(requestOf(), {actor})).resolves.toBeUndefined();

    expect(errorSpy).toHaveBeenCalled();
    expect(await AuditLog.countDocuments({})).toBe(0);
  });
});

describe("audit rows are append-only", () => {
  it("refuses an update through the application layer", async () => {
    await recordAudit(requestOf(), {action: AUDIT_ACTIONS.LOGIN_SUCCESS, actor});

    await expect(
      AuditLog.updateOne({action: AUDIT_ACTIONS.LOGIN_SUCCESS}, {$set: {outcome: "failure"}}),
    ).rejects.toThrow(/immutable/i);
  });

  it("refuses a delete through the application layer", async () => {
    await recordAudit(requestOf(), {action: AUDIT_ACTIONS.LOGIN_SUCCESS, actor});

    await expect(AuditLog.deleteMany({})).rejects.toThrow(/immutable/i);
  });

  it("refuses a re-save of a loaded row", async () => {
    await recordAudit(requestOf(), {action: AUDIT_ACTIONS.LOGIN_SUCCESS, actor});

    const entry = await AuditLog.findOne({});
    entry.outcome = "failure";

    await expect(entry.save()).rejects.toThrow(/immutable/i);
  });
});
