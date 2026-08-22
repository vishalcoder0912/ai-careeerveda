import {Router} from "express";
import mongoose from "mongoose";

import {isDatabaseReady} from "../config/database.js";
import {env} from "../config/env.js";

export const healthRouter = Router();

// Recover a mounted router's prefix string from its Express matching regexp,
// e.g. /^\/api\/v1\/auth\/?(?=\/|$)/ -> "/api/v1/auth". Used only by the dev
// route map below.
const mountPath = (layer) => {
  if (!layer.regexp || layer.regexp.fast_slash) return "";
  const match = layer.regexp.source.match(/^\^\\\/(.*?)\\\/\?\(\?=/);
  return match ? "/" + match[1].replace(/\\\//g, "/") : "";
};

// Walk Express's router tree collecting every registered {methods, path}.
const collectRoutes = (stack, prefix = "") => {
  const routes = [];
  for (const layer of stack || []) {
    if (layer.route) {
      const methods = Object.keys(layer.route.methods)
        .filter((method) => method !== "_all")
        .map((method) => method.toUpperCase())
        .sort();
      routes.push({methods, path: prefix + layer.route.path});
    } else if (layer.name === "router" && layer.handle && layer.handle.stack) {
      routes.push(...collectRoutes(layer.handle.stack, prefix + mountPath(layer)));
    }
  }
  return routes;
};

// Dev-only route map. A full list of endpoints is free reconnaissance in
// production, so it 404s there (falls through to notFoundHandler).
if (!env.isProduction) {
  healthRouter.get("/routes", (request, response) => {
    const routes = collectRoutes(request.app._router.stack).sort((a, b) =>
      a.path.localeCompare(b.path),
    );
    return response.json({
      success: true,
      data: {count: routes.length, routes},
      meta: {requestId: request.id},
    });
  });
}

// Liveness. Answers as long as the process can serve a request — deliberately
// does NOT check MongoDB. Cloud Run restarts a container that fails this, and
// restarting the API is the wrong response to the database being briefly away.
healthRouter.get("/health", (request, response) =>
  response.json({
    success: true,
    data: {status: "ok", uptime: Math.round(process.uptime())},
    meta: {requestId: request.id},
  }),
);

// Readiness. This one does check dependencies, because "ready" means "able to
// serve a real request", and every real request needs the database. Cloud Run
// takes an instance out of rotation on failure without killing it.
//
// The response names which dependency is down but never the URI, credentials or
// driver error text — this endpoint is typically reachable without auth.
healthRouter.get("/ready", (request, response) => {
  const database = isDatabaseReady();
  const status = database ? 200 : 503;

  return response.status(status).json({
    success: database,
    data: {
      status: database ? "ready" : "degraded",
      checks: {
        database: database ? "up" : "down",
        // Numeric readyState is useful when triaging and reveals nothing.
        databaseState: mongoose.connection.readyState,
      },
    },
    meta: {requestId: request.id},
  });
});
