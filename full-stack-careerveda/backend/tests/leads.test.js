import {describe, it, expect} from "vitest";
import request from "supertest";

import {createApp} from "../src/app.js";
import {Lead} from "../src/models/Lead.js";
import {Program} from "../src/models/Program.js";
import {AuditLog, AUDIT_ACTIONS} from "../src/models/AuditLog.js";
import {ROLES} from "../src/config/permissions.js";
import {csvSafe} from "../src/utils/sanitize.js";
import {createAdmin, login} from "./helpers/auth.js";

const app = createApp();

const VALID = {
  name: "Asha Menon",
  email: "asha@example.com",
  mobile: "9217801191",
  userType: "Student",
};

const submit = (payload = {}, headers = {}) => {
  const call = request(app).post("/api/v1/public/leads").send({...VALID, ...payload});
  for (const [key, value] of Object.entries(headers)) call.set(key, value);
  return call;
};

const publishedProgram = () =>
  Program.create({
    title: "PG Program in Product Management",
    slug: "product-management",
    status: "published",
    publishedAt: new Date(),
  });

describe("public lead submission", () => {
  it("accepts a valid submission and stores it", async () => {
    const response = await submit({type: "consultation"});

    expect(response.status).toBe(201);
    expect(response.body.data.ok).toBe(true);

    const stored = await Lead.findOne({emailKey: "asha@example.com"});
    expect(stored.name).toBe("Asha Menon");
    expect(stored.type).toBe("consultation");
  });

  it("normalises the email and mobile into lookup keys", async () => {
    await submit({email: "ASHA@Example.COM", mobile: "+91 92178 01191"});

    const stored = await Lead.findOne({});
    expect(stored.emailKey).toBe("asha@example.com");
    // Last ten digits, so formatting cannot dodge the cap.
    expect(stored.mobileKey).toBe("9217801191");
  });

  it("rejects a malformed email", async () => {
    const response = await submit({email: "not-an-email"});

    expect(response.status).toBe(400);
    expect(response.body.error.fields.email).toBeDefined();
  });

  it("rejects a mobile that is not an Indian number", async () => {
    const response = await submit({mobile: "12345"});

    expect(response.status).toBe(400);
  });

  it("rejects a NoSQL operator in a field", async () => {
    const response = await request(app)
      .post("/api/v1/public/leads")
      .send({...VALID, email: {$ne: null}});

    expect(response.status).toBe(400);
  });

  it("strips HTML from the name", async () => {
    await submit({name: "Asha <script>alert(1)</script>"});

    const stored = await Lead.findOne({});
    expect(stored.name).not.toContain("<");
  });

  it("stores UTM values", async () => {
    await submit({
      utm: {source: "google", medium: "cpc", campaign: "pm-launch"},
      sourcePage: "/enroll",
    });

    const stored = await Lead.findOne({});
    expect(stored.utm.source).toBe("google");
    expect(stored.utm.campaign).toBe("pm-launch");
    expect(stored.sourcePage).toBe("/enroll");
  });

  it("hashes the IP rather than storing it", async () => {
    await submit();

    const stored = await Lead.findOne({});
    expect(stored.ipHash).toMatch(/^[a-f0-9]{64}$/);
    expect(stored.ipHash).not.toContain("127.0.0.1");
  });
});

describe("honeypot", () => {
  it("answers success but writes nothing when the hidden field is filled", async () => {
    const response = await submit({company: "SpamCo"});

    // The bot must believe it worked, so it does not retry.
    expect(response.status).toBe(201);
    expect(await Lead.countDocuments({})).toBe(0);
  });

  it("still accepts a submission when the field is empty", async () => {
    await submit({company: ""});

    expect(await Lead.countDocuments({})).toBe(1);
  });
});

describe("enrollment cap", () => {
  it("allows two enrollments and refuses the third", async () => {
    await publishedProgram();
    const payload = {type: "enrollment", program: "PG Program in Product Management"};

    expect((await submit(payload)).status).toBe(201);
    expect((await submit(payload)).status).toBe(201);

    const third = await submit(payload);
    expect(third.status).toBe(429);
    expect(third.body.error.code).toBe("ALREADY_APPLIED");

    expect(await Lead.countDocuments({type: "enrollment"})).toBe(2);
  });

  it("counts a different email with the same mobile as the same person", async () => {
    await publishedProgram();
    const payload = {type: "enrollment", program: "PG Program in Product Management"};

    await submit(payload);
    await submit({...payload, email: "second@example.com"});

    const third = await submit({...payload, email: "third@example.com"});
    expect(third.status).toBe(429);
  });

  it("counts a different mobile with the same email as the same person", async () => {
    await publishedProgram();
    const payload = {type: "enrollment", program: "PG Program in Product Management"};

    await submit(payload);
    await submit({...payload, mobile: "9876543210"});

    const third = await submit({...payload, mobile: "9876543211"});
    expect(third.status).toBe(429);
  });

  it("does not apply the cap to consultations", async () => {
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const response = await submit({type: "consultation"});
      expect(response.status).toBe(201);
    }

    expect(await Lead.countDocuments({type: "consultation"})).toBe(4);
  });
});

describe("program validation", () => {
  it("refuses a program that does not exist", async () => {
    const response = await submit({program: "Diploma in Nothing"});

    expect(response.status).toBe(400);
    expect(response.body.error.fields.program).toBeDefined();
  });

  it("refuses a program that exists but is not published", async () => {
    await Program.create({title: "Unreleased Program", slug: "unreleased", status: "draft"});

    const response = await submit({program: "Unreleased Program"});
    expect(response.status).toBe(400);
  });

  it("accepts a published program", async () => {
    await publishedProgram();

    const response = await submit({program: "PG Program in Product Management"});
    expect(response.status).toBe(201);
  });
});

describe("idempotency", () => {
  it("does not create a second lead for a repeated key", async () => {
    const key = "submission-abc-123";

    const first = await submit({}, {"Idempotency-Key": key});
    const second = await submit({}, {"Idempotency-Key": key});

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(second.body.data.deduplicated).toBe(true);
    expect(await Lead.countDocuments({})).toBe(1);
  });

  it("treats different keys as different submissions", async () => {
    await submit({}, {"Idempotency-Key": "key-one"});
    await submit({}, {"Idempotency-Key": "key-two"});

    expect(await Lead.countDocuments({})).toBe(2);
  });

  it("flags a rapid repeat of the same form as possible spam", async () => {
    await submit();
    await submit();

    const leads = await Lead.find().sort({createdAt: 1});
    expect(leads[0].spamScore).toBe(0);
    // Flagged, not refused — refusing a genuine correction is worse.
    expect(leads[1].spamScore).toBeGreaterThan(0);
  });
});

describe("admin lead management", () => {
  const asAdmin = async (role = ROLES.SUPER_ADMIN, email = "super@careerveda.test") => {
    await createAdmin({email, role});
    return (await login(app, {email})).accessToken;
  };

  it("refuses an unauthenticated request", async () => {
    expect((await request(app).get("/api/v1/admin/leads")).status).toBe(401);
  });

  it("lists leads without exposing the IP hash", async () => {
    await submit();
    const token = await asAdmin();

    const response = await request(app)
      .get("/api/v1/admin/leads")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(JSON.stringify(response.body)).not.toContain("ipHash");
  });

  it("updates a status and audits the change", async () => {
    await submit();
    const token = await asAdmin();
    const lead = await Lead.findOne({});

    const response = await request(app)
      .patch(`/api/v1/admin/leads/${lead._id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({status: "contacted"});

    expect(response.status).toBe(200);
    expect(response.body.data.status).toBe("contacted");

    const entry = await AuditLog.findOne({action: AUDIT_ACTIONS.LEAD_UPDATED});
    expect(entry.metadata.to).toBe("contacted");
    // The trail records the state change, not a second copy of the person's
    // contact details.
    expect(JSON.stringify(entry.metadata)).not.toContain("asha@example.com");
  });

  it("adds a note", async () => {
    await submit();
    const token = await asAdmin();
    const lead = await Lead.findOne({});

    const response = await request(app)
      .post(`/api/v1/admin/leads/${lead._id}/notes`)
      .set("Authorization", `Bearer ${token}`)
      .send({body: "Called, left a voicemail."});

    expect(response.status).toBe(201);
    expect(response.body.data.notes).toHaveLength(1);
  });

  it("refuses a status update from a viewer, who has forms.read only", async () => {
    await submit();
    const token = await asAdmin(ROLES.VIEWER, "viewer@careerveda.test");
    const lead = await Lead.findOne({});

    const response = await request(app)
      .patch(`/api/v1/admin/leads/${lead._id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({status: "contacted"});

    expect(response.status).toBe(403);
  });

  it("filters by status and type", async () => {
    await publishedProgram();
    await submit({type: "consultation"});
    await submit({
      type: "enrollment",
      email: "other@example.com",
      mobile: "9876543210",
      program: "PG Program in Product Management",
    });
    const token = await asAdmin();

    const response = await request(app)
      .get("/api/v1/admin/leads?type=enrollment")
      .set("Authorization", `Bearer ${token}`);

    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].type).toBe("enrollment");
  });
});

describe("CSV export", () => {
  it("escapes a formula so a spreadsheet treats it as text", () => {
    // Excel, Sheets and Numbers all execute a cell beginning with these.
    expect(csvSafe("=SUM(A1)")).toMatch(/^'=/);
    expect(csvSafe("+1234")).toMatch(/^'\+/);
    expect(csvSafe("-1234")).toMatch(/^'-/);
    expect(csvSafe("@SUM(A1)")).toMatch(/^'@/);
  });

  it("applies both the formula guard and CSV quoting to one value", () => {
    // A formula that also contains quotes gets wrapped for CSV, so the
    // apostrophe sits just inside the opening quote rather than at position 0.
    const output = csvSafe('=HYPERLINK("http://evil")');

    expect(output.startsWith('"\'=')).toBe(true);
    expect(output).not.toMatch(/^=/);
  });

  it("leaves an ordinary value alone", () => {
    expect(csvSafe("Asha Menon")).toBe("Asha Menon");
  });

  it("quotes a value containing a comma or a quote", () => {
    expect(csvSafe("Menon, Asha")).toBe('"Menon, Asha"');
    expect(csvSafe('She said "hi"')).toBe('"She said ""hi"""');
  });

  it("exports leads as CSV with a formula-injected name neutralised", async () => {
    await submit({name: "=HYPERLINK(\"http://evil.example.com\",\"click\")"});

    await createAdmin();
    const token = (await login(app)).accessToken;

    const response = await request(app)
      .get("/api/v1/admin/leads/export")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toContain("text/csv");
    expect(response.headers["content-disposition"]).toContain("attachment");
    // Present as text, never as a live formula.
    expect(response.text).toContain("'=HYPERLINK");
    expect(response.text).not.toMatch(/,=HYPERLINK/);
  });

  it("audits an export", async () => {
    await submit();
    await createAdmin();
    const token = (await login(app)).accessToken;

    await request(app)
      .get("/api/v1/admin/leads/export")
      .set("Authorization", `Bearer ${token}`);

    const entry = await AuditLog.findOne({action: AUDIT_ACTIONS.LEAD_EXPORTED});
    expect(entry).not.toBeNull();
    expect(entry.metadata.count).toBe(1);
  });

  it("refuses an export from a role without forms.export", async () => {
    await createAdmin({email: "editor@careerveda.test", role: ROLES.EDITOR});
    const token = (await login(app, {email: "editor@careerveda.test"})).accessToken;

    const response = await request(app)
      .get("/api/v1/admin/leads/export")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(403);
  });
});
