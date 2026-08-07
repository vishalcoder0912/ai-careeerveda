// Load and stress profile for the public read path — the only endpoints that
// see visitor traffic, and the ones Cloud Run will autoscale on.
//
//   k6 run tests/load/public-read.js                        # against localhost
//   k6 run -e BASE=https://api.careerveda.in tests/load/public-read.js
//
// k6 is a single static binary (winget install k6 / brew install k6); it is not
// an npm package, which is why this is a standalone script rather than an
// `npm run` target.
//
// On 429: the public limiter allows 200 requests/minute PER IP. A load test runs
// from one IP, so past ~3 req/s every extra request is correctly rejected. A 429
// here is the rate limiter working, not a failure — so it is counted separately
// and excluded from the error rate. What the thresholds actually guard is the
// latency of the requests that DID get served.

import http from "k6/http";
import {check, sleep} from "k6";
import {Counter, Rate} from "k6/metrics";

const BASE = __ENV.BASE || "http://localhost:8080";

const rateLimited = new Counter("rate_limited");
const serverErrors = new Rate("server_errors");

export const options = {
  scenarios: {
    // Ramp to a steady load, hold, ramp down. The hold is what matters: a spike
    // alone only measures cold start, not whether latency degrades under
    // sustained traffic once the connection pool is warm.
    steady: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        {duration: "30s", target: 20},
        {duration: "1m", target: 20},
        {duration: "30s", target: 0},
      ],
    },
  },
  thresholds: {
    // Served requests only. Cloud Run + Atlas over the public internet is a
    // different number than localhost — retune these against a real deploy
    // before treating them as a release gate.
    "http_req_duration{expected_response:true}": ["p(95)<500", "p(99)<1500"],
    server_errors: ["rate<0.01"],
    checks: ["rate>0.99"],
  },
};

// Read endpoints only. Nothing here writes, so the script is safe to point at a
// staging deploy without seeding junk into its database. Do NOT add the lead or
// enrolment forms to this list — those write a row per request.
const PATHS = [
  "/health",
  "/api/v1/public/programs?limit=12",
  "/api/v1/public/blogs?limit=12",
  "/api/v1/public/faqs?limit=20",
  "/api/v1/public/jobs?limit=12",
];

export default function () {
  const path = PATHS[Math.floor(Math.random() * PATHS.length)];
  const response = http.get(`${BASE}${path}`, {tags: {name: path.split("?")[0]}});

  if (response.status === 429) {
    rateLimited.add(1);
  } else {
    serverErrors.add(response.status >= 500);
    check(response, {
      "status is 200": (r) => r.status === 200,
      "body is not empty": (r) => r.body && r.body.length > 0,
      // Every public response is supposed to carry an ETag so browsers can
      // revalidate for a few hundred bytes instead of refetching the payload.
      // A missing one is a silent bandwidth regression no unit test would catch.
      "carries an ETag": (r) => r.headers["Etag"] !== undefined,
    });
  }

  sleep(1);
}
