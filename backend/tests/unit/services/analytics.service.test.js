import {afterEach, beforeEach, describe, expect, it, jest} from "@jest/globals";

const ORIGINAL = {
  id: process.env.GA4_MEASUREMENT_ID,
  secret: process.env.GA4_API_SECRET,
  fetch: global.fetch,
};

beforeEach(() => {
  jest.resetModules();
  delete process.env.GA4_MEASUREMENT_ID;
  delete process.env.GA4_API_SECRET;
});

afterEach(() => {
  if (ORIGINAL.id === undefined) delete process.env.GA4_MEASUREMENT_ID;
  else process.env.GA4_MEASUREMENT_ID = ORIGINAL.id;
  if (ORIGINAL.secret === undefined) delete process.env.GA4_API_SECRET;
  else process.env.GA4_API_SECRET = ORIGINAL.secret;
  global.fetch = ORIGINAL.fetch;
});

const configure = (fetchMock) => {
  process.env.GA4_MEASUREMENT_ID = "G-TEST";
  process.env.GA4_API_SECRET = "test-secret";
  global.fetch = fetchMock || jest.fn().mockResolvedValue({ok: true});
};

const lead = {
  _id: "65a000000000000000000001",
  email: "User.Name@Gmail.com",
  mobile: "+91 92178 01191",
  type: "consultation",
  source: "home-consultation-form",
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  utm: {source: "google", medium: "cpc", campaign: "pm"},
  clickIds: {gclid: "abc123"},
  attribution: {
    clientId: "1234567890.1700000000",
    referrer: "https://www.google.com/",
    landingPage: "/?gclid=abc123",
  },
};

describe("GA4 Measurement Protocol reporting", () => {
  it("does nothing when the API secret is not configured", async () => {
    const fetchMock = jest.fn();
    global.fetch = fetchMock;
    const {sendGa4Event, analyticsEnabled} = await import("../../../src/services/analytics.service.js");

    expect(analyticsEnabled()).toBe(false);
    expect(await sendGa4Event("generate_lead", lead)).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sends a generate_lead event with hashed, normalised user data", async () => {
    const fetchMock = jest.fn().mockResolvedValue({ok: true});
    configure(fetchMock);
    const {sendGa4Event, sha256} = await import("../../../src/services/analytics.service.js");

    expect(await sendGa4Event("generate_lead", lead)).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toContain("measurement_id=G-TEST");
    expect(url).toContain("api_secret=test-secret");

    const body = JSON.parse(options.body);
    expect(body.client_id).toBe("1234567890.1700000000");
    expect(body.user_id).toBe(lead._id);
    expect(body.events[0].name).toBe("generate_lead");
    expect(body.events[0].params).toMatchObject({
      lead_type: "consultation",
      utm_source: "google",
      gclid: "abc123",
    });
    // Gmail dots are insignificant and phone numbers are E.164 before hashing.
    expect(body.user_data.sha256_email_address).toBe(sha256("username@gmail.com"));
    expect(body.user_data.sha256_phone_number).toBe(sha256("+919217801191"));
  });

  it("never throws into a request when Google is unreachable", async () => {
    configure(jest.fn().mockRejectedValue(new Error("offline")));
    const {sendGa4Event} = await import("../../../src/services/analytics.service.js");

    await expect(sendGa4Event("generate_lead", lead)).resolves.toBe(false);
  });
});
