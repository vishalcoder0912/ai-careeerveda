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
import {publicRouter} from "./routes/public.routes.js";
import {mediaRouter} from "./routes/media.routes.js";
import {publicLeadRouter, adminLeadRouter} from "./routes/lead.routes.js";
import {forbidden} from "./utils/apiError.js";

// `extraRouters` lets a caller mount additional routers between the real ones
// and the 404 handler. It exists so tests can exercise the auth middleware on a
// probe route without reaching into Express's internals, and so future feature
// modules can be composed in. Nothing in production passes it.
export const createApp = ({extraRouters = []} = {}) => {
  const app = express();

  // Cloud Run terminates TLS at its front end and forwards one X-Forwarded-For
  // hop. Trusting exactly 1 proxy means req.ip is the real client (so rate
  // limiting works) without trusting a spoofed header from a direct caller —
  // `trust proxy: true` would let anyone forge their IP past the limiter.
  app.set("trust proxy", 1);

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

  // Unversioned and outside /api on purpose — probe URLs should not move when
  // the API version does.
  app.use(healthRouter);

  app.use("/api/v1/auth", authRouter);
  // Registered before the generic public router so /public/leads is not
  // matched as a content resource named "leads".
  app.use("/api/v1/public/leads", publicLeadRouter);
  app.use("/api/v1/public", publicRouter);

  app.use("/api/v1/admin/media", mediaRouter);
  app.use("/api/v1/admin/leads", adminLeadRouter);
  app.use("/api/v1/admin", adminRouter);

  for (const {path, router} of extraRouters) app.use(path, router);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};
