import {Router} from "express";

import * as auth from "../controllers/auth.controller.js";
import {validate} from "../middleware/validate.js";
import {authenticate} from "../middleware/authenticate.js";
import {requireCsrf} from "../middleware/csrf.js";
import {authLimiter, adminLimiter} from "../middleware/rateLimit.js";
import {
  loginSchema,
  changePasswordSchema,
  revokeSessionSchema,
} from "../validators/auth.validators.js";

export const authRouter = Router();

// Unauthenticated and therefore rate-limited hard. The only endpoint an
// attacker can reach without any credential at all.
//
// There is deliberately no self-service password reset. Recovery for a locked
// -out admin is out of band, and needs shell access rather than an HTTP call:
// `npm --prefix backend run seed:admin -- --reset`.
authRouter.post("/login", authLimiter, validate({body: loginSchema}), auth.login);

// Cookie-authenticated, so they carry a CSRF check. Refresh is not behind
// authenticate() on purpose — its whole job is to run when the access token has
// already expired.
authRouter.post("/refresh", authLimiter, requireCsrf, auth.refresh);
// adminLimiter rather than authLimiter: logout is not a credential guess, and a
// user who reloads a broken tab a few times should not be locked out of ending
// their own session. Still bounded — every call writes a session revocation.
authRouter.post("/logout", adminLimiter, requireCsrf, auth.logout);

// Bearer-authenticated from here down.
authRouter.get("/me", adminLimiter, authenticate, auth.me);
authRouter.get("/sessions", adminLimiter, authenticate, auth.listSessions);
authRouter.delete(
  "/sessions/:id",
  adminLimiter,
  authenticate,
  validate({params: revokeSessionSchema}),
  auth.revokeSession,
);
authRouter.post(
  "/change-password",
  authLimiter,
  authenticate,
  validate({body: changePasswordSchema}),
  auth.changePassword,
);
