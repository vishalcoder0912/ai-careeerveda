import {describe, it, expect} from "vitest";
import request from "supertest";
import mongoose from "mongoose";
import {Router} from "express";

import {createApp} from "../src/app.js";
import {env} from "../src/config/env.js";
import {Admin} from "../src/models/Admin.js";
import {Faq} from "../src/models/Faq.js";
import {Lead} from "../src/models/Lead.js";
import {RateLimit} from "../src/models/RateLimit.js";
import {ROLES} from "../src/config/permissions.js";
import {createAdmin, login} from "./helpers/auth.js";

// Each case pins one fix from the weakness review, so a regression fails here
// with a name that says which guarantee broke.

const app = createApp();

const signIn = async (role) => {
  const email = `${role}@careerveda.test`;
  await createAdmin({email, role});
  const {accessToken} = await login(app, {email});
  return accessToken;
};

const asRole = (token) => ({
  post: (path, body = {}) =>
    request(app).post(path).set("Authorization", `Bearer ${token}`).send(body),
});

describe("publishing is a separate grant from editing", () => {
  const draftFaq = () => Faq.create({question: "Is it online?", answer: "Yes.", slug: "online"});

  it("refuses an editor's publish and accepts their send-for-review", async () => {
    const faq = await draftFaq();
    const editor = asRole(await signIn(ROLES.EDITOR));

    expect((await editor.post(`/api/v1/admin/faqs/${faq._id}/publish`)).status).toBe(403);
    expect((await editor.post(`/api/v1/admin/faqs/${faq._id}/submit-review`)).status).toBe(200);
    expect((await Faq.findById(faq._id)).status).toBe("in-review");
  });

  it("refuses an editor's bulk publish but allows a bulk unpublish", async () => {
    const faq = await draftFaq();
    const editor = asRole(await signIn(ROLES.EDITOR));

    const publish = await editor.post("/api/v1/admin/faqs/bulk/status", {ids: [String(faq._id)], status: "published"});
    expect(publish.status).toBe(403);

    const unpublish = await editor.post("/api/v1/admin/faqs/bulk/status", {ids: [String(faq._id)], status: "draft"});
    expect(unpublish.status).toBe(200);
  });

  it("lets an admin approve and publish", async () => {
    const faq = await draftFaq();
    const admin = asRole(await signIn(ROLES.ADMIN));

    expect((await admin.post(`/api/v1/admin/faqs/${faq._id}/publish`)).status).toBe(200);
    expect((await Faq.findById(faq._id)).status).toBe("published");
  });

  it("refuses bulk scheduling, which carries no date", async () => {
    const faq = await draftFaq();
    const admin = asRole(await signIn(ROLES.ADMIN));

    const response = await admin.post("/api/v1/admin/faqs/bulk/status", {ids: [String(faq._id)], status: "scheduled"});
    expect(response.status).toBe(400);
  });
});

describe("failed-login counting under concurrency", () => {
  it("counts every parallel wrong guess, so the lockout still fires", async () => {
    const {_id} = await createAdmin();
    // Separate document instances, as separate requests would load them.
    const copies = await Promise.all(Array.from({length: 6}, () => Admin.findById(_id)));

    await Promise.all(copies.map((copy) => copy.registerFailedLogin()));

    const stored = await Admin.findById(_id);
    expect(stored.failedLoginAttempts).toBe(6);
    expect(stored.isLocked()).toBe(true);
  });
});

describe("shared rate limits", () => {
  it("counts form submissions in the database and refuses the sixth in an hour", async () => {
    env.isTest = false;
    try {
      const statuses = [];
      for (let i = 0; i < 6; i += 1) {
        const response = await request(app)
          .post("/api/v1/public/leads")
          .send({name: "Spam Bot", email: `bot${i}@example.com`, mobile: `98765432${10 + i}`, consent: true});
        statuses.push(response.status);
      }

      expect(statuses.slice(0, 5)).toEqual([201, 201, 201, 201, 201]);
      expect(statuses[5]).toBe(429);
      expect(await Lead.countDocuments({})).toBe(5);

      // The counter lives in MongoDB, where every instance sees it.
      const counter = await RateLimit.findOne({_id: /^form:/}).lean();
      expect(counter.hits).toBe(6);
    } finally {
      env.isTest = true;
    }
  });
});

describe("concurrent edits", () => {
  it("refuses the second of two saves made from the same loaded copy", async () => {
    const faq = await Faq.create({question: "Q?", answer: "A.", slug: "q"});
    const [first, second] = await Promise.all([Faq.findById(faq._id), Faq.findById(faq._id)]);

    first.answer = "First editor.";
    await first.save();

    second.answer = "Second editor.";
    await expect(second.save()).rejects.toBeInstanceOf(mongoose.Error.VersionError);
    expect((await Faq.findById(faq._id)).answer).toBe("First editor.");
  });

  it("answers a version conflict with the 409 the admin panel knows how to handle", async () => {
    const router = Router();
    router.get("/", () => {
      throw new mongoose.Error.VersionError({_doc: {_id: "x"}}, 1, []);
    });

    const response = await request(createApp({extraRouters: [{path: "/probe-conflict", router}]})).get(
      "/probe-conflict",
    );

    expect(response.status).toBe(409);
    expect(response.body.error.fields.revision).toBeDefined();
  });
});
