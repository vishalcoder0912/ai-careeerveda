import express from "express";
import helmet from "helmet";
import cors from "cors";
import compression from "compression";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";

import {env} from "./config/env.js";
import {logger} from "./config/logger.js";
import {requestId} from "./middleware/requestId.js";
import {sanitizeRequest} from "./middleware/sanitizeRequest.js";
import {csrfGuard} from "./middleware/csrf.js";
import {errorHandler, notFoundHandler} from "./middleware/errorHandler.js";
import {healthRouter} from "./routes/health.routes.js";
import {authRouter} from "./routes/auth.routes.js";
import {adminRouter} from "./routes/admin.routes.js";
import {adminUserRouter} from "./routes/adminUser.routes.js";
import {publicRouter} from "./routes/public.routes.js";
import {mediaRouter} from "./routes/media.routes.js";
import {publicLeadRouter, adminLeadRouter} from "./routes/lead.routes.js";
import {publicApplicationRouter, adminApplicationRouter} from "./routes/jobApplication.routes.js";
import {securityRouter} from "./routes/security.routes.js";
import {forbidden} from "./utils/apiError.js";
import {globalLimiter} from "./middleware/rateLimit.js";
import {authSlowDown, publicSlowDown, formSlowDown} from "./middleware/slowDown.js";
import {ipBlockGuard} from "./middleware/ipBlocklist.js";
import {anomalyDetector} from "./middleware/anomalyDetector.js";
import {metricsMiddleware} from "./services/metrics.js";

// `extraRouters` lets a caller mount additional routers between the real ones
// and the 404 handler. It exists so tests can exercise the auth middleware on a
// probe route without reaching into Express's internals, and so future feature
// modules can be composed in. Nothing in production passes it.
export const createApp = ({extraRouters = []} = {}) => {
  const app = express();

  // How many proxy hops sit in front of this process. Every per-IP control
  // (rate limits, the blocklist, the anomaly counters) keys on req.ip, so this
  // must equal the real hop count: one too few and every visitor shares the
  // proxy's address and one bucket; one too many and a client can spoof its IP
  // with X-Forwarded-For. Cloud Run alone is 1; Cloudflare in front of it is 2.
  app.set("trust proxy", env.trustProxy);

  // Advertising Express and its version is free reconnaissance.
  app.disable("x-powered-by");

  app.use(requestId);

  app.use(
    pinoHttp({
      logger,
      genReqId: (request) => request.id,
      autoLogging: {
        // Health probes fire constantly and would drown everything else.
        ignore: (request) => request.url === "/health" || request.url === "/ready",
      },
    }),
  );

  app.use(
    helmet({
      // This process serves JSON, never HTML, so the browser should never be
      // executing anything that arrives from it. Locking the CSP to nothing at
      // all makes a would-be XSS sink inert even if one is introduced later.
      contentSecurityPolicy: {
        directives: {defaultSrc: ["'none'"], frameAncestors: ["'none'"]},
      },
      crossOriginResourcePolicy: {policy: "same-site"},
      referrerPolicy: {policy: "no-referrer"},
      // Enable HSTS when TLS is configured (behind Cloudflare or load balancer).
      // maxAge: 1 year, includeSubDomains, preload list eligible.
      hsts: env.isProduction ? {maxAge: 31536000, includeSubDomains: true, preload: true} : false,
      // Block browser features that are never needed for a JSON API.
      permissionsPolicy: {
        directives: {
          camera: [],
          microphone: [],
          geolocation: [],
          payment: [],
          usb: [],
          magnetometer: [],
          gyroscope: [],
          accelerometer: [],
          "interest-cohort": [],
        },
      },
    }),
  );

  app.use(
    cors({
      // An allow-list, not a reflector. Returning the caller's own Origin would
      // make `credentials: true` meaningless — any site could then read
      // authenticated responses on a logged-in user's behalf.
      origin: (origin, callback) => {
        // No Origin header: same-origin navigation, curl, or a server-to-server
        // call. Not a browser cross-origin request, so there is nothing for CORS
        // to protect and nothing to reflect.
        if (!origin) return callback(null, true);
        if (env.allowedOrigins.includes(origin)) return callback(null, true);
        return callback(forbidden("Origin not allowed"));
      },
      credentials: true,
      methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization", "X-Request-Id", "X-CSRF-Token", "Idempotency-Key"],
      exposedHeaders: ["X-Request-Id"],
      maxAge: 600,
    }),
  );

  app.use(compression());

  // Record request metrics for the /api/v1/admin/metrics dashboard.
  app.use(metricsMiddleware);

  // 256 KB is generous for the largest thing we accept as JSON (a page with many
  // sections) and far below what would let a caller exhaust memory. File uploads
  // do not pass through here — multer handles those with its own limit.
  app.use(express.json({limit: "256kb"}));
  app.use(express.urlencoded({extended: false, limit: "64kb"}));
  app.use(cookieParser());

  // Immediately after cookieParser, because that is what makes ambient
  // credentials available: any state-changing request that arrives carrying the
  // refresh cookie must prove same-origin before a handler can spend it.
  app.use(csrfGuard);

  // After body parsing, before any route: strip Mongo operators and
  // prototype-pollution keys from everything.
  app.use(sanitizeRequest);

  // ── DDoS / abuse protection ────────────────────────────────────────────────
  // Order matters: IP blocklist first (cheapest check), then anomaly detection,
  // then global rate limit. All three run before any route handler. Anomaly
  // detection sits BEFORE the limiter: requests the limiter rejects never reach
  // later middleware, so behind it the detector's counter capped at the
  // limiter's 500 and its auto-block (at 1000) could never fire.
  app.use(ipBlockGuard);
  app.use(anomalyDetector);
  app.use(globalLimiter);

  // Unversioned and outside /api on purpose — probe URLs should not move when
  // the API version does.
  app.use(healthRouter);

  // ── Per-route rate limiting + slow-down ─────────────────────────────────────
  // Slow-down runs before the rate limiter on each route group: it penalises
  // sustained high request rates with progressive delays, while the rate limiter
  // hard-cuts after the absolute ceiling.
  app.use("/api/v1/auth", authSlowDown);
  app.use("/api/v1/auth", authRouter);
  // Registered before the generic public router so /public/leads is not
  // matched as a content resource named "leads".
  app.use("/api/v1/public/leads", formSlowDown);
  app.use("/api/v1/public/leads", publicLeadRouter);
  app.use("/api/v1/public/job-applications", formSlowDown);
  app.use("/api/v1/public/job-applications", publicApplicationRouter);
  app.use("/api/v1/public", publicSlowDown);
  app.use("/api/v1/public", publicRouter);

  app.use("/api/v1/admin/media", mediaRouter);
  app.use("/api/v1/admin/leads", adminLeadRouter);
  app.use("/api/v1/admin/job-applications", adminApplicationRouter);
  app.use("/api/v1/admin/security", securityRouter);
  // Before the generic admin router: /admin/admins is account management, not
  // a content resource, and must not be captured by /admin/:resource.
  app.use("/api/v1/admin/admins", adminUserRouter);
  app.use("/api/v1/admin", adminRouter);

  for (const {path, router} of extraRouters) app.use(path, router);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};
