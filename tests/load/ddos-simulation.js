
// DDoS attack simulation — verifies the protection layers respond correctly.
//
// Run: k6 run tests/load/ddos-simulation.js
//
// This test intentionally triggers rate limits and bot detection to confirm
// they work. Expected results:
//   - Most requests return 200 (legitimate traffic passes)
//   - Some return 429 (rate limited — proves limiting works)
//   - Some return 403 (blocked bad bots — proves bot detection works)
//   - Zero requests should time out or hang
//
// If EVERYTHING returns 200, your protection layers are not active.
// If EVERYTHING returns 429/403, your limits are too strict for real users.

import http from "k6/http";
import {check, sleep} from "k6";
import {Counter, Rate, Trend} from "k6/metrics";

const BASE = __ENV.BASE || "http://localhost:8080";

const rateLimited = new Counter("rate_limited");
const badBotBlocked = new Counter("bad_bot_blocked");
const requestTimedOut = new Counter("request_timed_out");
const successRate = new Rate("success_rate");
const responseTime = new Trend("response_time");

export const options = {
  scenarios: {
    // Simulate a flood: sudden spike, sustained high load.
    flood: {
      executor: "constant-vus",
      vus: 200,
      duration: "1m",
    },
  },
  thresholds: {
    // The critical metric: no request should time out or hang.
    request_timed_out: ["count==0"],
    // At least half of the traffic should be served (not 429/403).
    success_rate: ["rate>0.5"],
  },
};

const LEGIT_PATHS = [
  "/health",
  "/api/v1/public/programs?limit=12",
  "/api/v1/public/blogs?limit=12",
  "/api/v1/public/jobs?limit=12",
];

// Simulate a legit browser
const BROWSER_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

// Simulate a known bad bot / scanner
const BAD_BOTS = [
  "sqlmap/1.0 (http://sqlmap.org)",
  "nikto/2.5.0",
  "Nmap Scripting Engine",
  "masscan/1.0",
  "python-requests/2.31.0",
];

// Some requests are legit, some are attacks.
export default function () {
  const isAttack = __ITER % 10 === 0; // 10% of requests are "attacks"

  if (isAttack) {
    // Attack: bad bot UA
    const botUA = BAD_BOTS[Math.floor(Math.random() * BAD_BOTS.length)];
    const attackPath = isAttack && __ITER % 20 === 0
      ? "/wp-login.php"
      : "/api/v1/public/programs?limit=1";
    const response = http.get(`${BASE}${attackPath}`, {
      headers: {"User-Agent": botUA},
      tags: {name: "attack"},
      timeout: "10s",
    });

    if (response.status === 429) rateLimited.add(1);
    if (response.status === 403) badBotBlocked.add(1);
    if (response.timings.duration >= 10000) requestTimedOut.add(1);
    // We don't fail the check for blocked attacks — that's EXPECTED behavior.
    check(response, {
      "attack did not time out": (r) => r.timings.duration < 10000,
      "attack response was fast": (r) => r.timings.duration < 2000,
    });
  } else {
    // Legit traffic
    const path = LEGIT_PATHS[Math.floor(Math.random() * LEGIT_PATHS.length)];
    const response = http.get(`${BASE}${path}`, {
      headers: {"User-Agent": BROWSER_UA},
      tags: {name: "legit"},
      timeout: "10s",
    });

    responseTime.add(response.timings.duration);
    successRate.add(response.status === 200);
    if (response.status === 429) rateLimited.add(1);
    if (response.timings.duration >= 10000) requestTimedOut.add(1);

    check(response, {
      "legit request served": (r) => r.status === 200 || r.status === 429,
      "legit request did not time out": (r) => r.timings.duration < 10000,
    });
  }

  // Variable sleep to simulate real user pacing.
  sleep(Math.random() * 0.5);
}
