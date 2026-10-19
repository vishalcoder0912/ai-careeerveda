import {isIP} from "node:net";

import {Router} from "express";

import {requireSuperAdmin} from "../middleware/authorize.js";
import {authenticate} from "../middleware/authenticate.js";
import {adminLimiter} from "../middleware/rateLimit.js";
import {blockIP, unblockIP, getBlocklist} from "../middleware/ipBlocklist.js";
import {getMetricsSnapshot} from "../services/metrics.js";

export const securityRouter = Router();

// All security routes require super-admin authentication.
securityRouter.use(adminLimiter, authenticate);
securityRouter.use(requireSuperAdmin);

// GET /api/v1/admin/security/blocklist — view currently blocked IPs.
securityRouter.get("/blocklist", (req, res) => {
  return res.json({
    success: true,
    data: {entries: getBlocklist()},
    meta: {requestId: req.id},
  });
});

// GET /api/v1/admin/security/metrics — live application metrics.
securityRouter.get("/metrics", (req, res) => {
  return res.json({
    success: true,
    data: getMetricsSnapshot(),
    meta: {requestId: req.id},
  });
});

// POST /api/v1/admin/security/block — block an IP.
// Body: {ip: string, durationMs?: number, reason?: string}
securityRouter.post("/block", (req, res) => {
  const {ip, durationMs, reason} = req.body;

  // A real address only: the value becomes a stored row and a lookup key.
  // Blocking the caller's own address would lock the operator out mid-incident.
  const durationOk =
    durationMs === undefined || (Number.isFinite(durationMs) && durationMs > 0);
  if (typeof ip !== "string" || !isIP(ip) || ip === req.ip || !durationOk) {
    return res.status(400).json({
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "ip must be a valid address other than your own, and durationMs a positive number",
      },
      meta: {requestId: req.id},
    });
  }

  blockIP(ip, {durationMs, reason: typeof reason === "string" ? reason : undefined});
  return res.json({
    success: true,
    data: {message: `IP ${ip} blocked`},
    meta: {requestId: req.id},
  });
});

// POST /api/v1/admin/security/unblock — unblock an IP.
// Body: {ip: string}
securityRouter.post("/unblock", (req, res) => {
  const {ip} = req.body;

  if (!ip || typeof ip !== "string") {
    return res.status(400).json({
      success: false,
      error: {code: "VALIDATION_ERROR", message: "ip is required and must be a string"},
      meta: {requestId: req.id},
    });
  }

  unblockIP(ip);
  return res.json({
    success: true,
    data: {message: `IP ${ip} unblocked`},
    meta: {requestId: req.id},
  });
});
