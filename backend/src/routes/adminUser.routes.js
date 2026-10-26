import {Router} from "express";

import * as adminUsers from "../controllers/adminUser.controller.js";
import {authenticate} from "../middleware/authenticate.js";
import {requirePermission, requireSuperAdmin} from "../middleware/authorize.js";
import {validate} from "../middleware/validate.js";
import {adminLimiter} from "../middleware/rateLimit.js";
import {PERMISSIONS} from "../config/permissions.js";
import {
  adminUserIdParam,
  resetAdminPasswordSchema,
} from "../validators/adminUser.validators.js";

export const adminUserRouter = Router();

// Authentication and both grants apply to the whole router, so a route added
// later cannot be exposed by forgetting a guard. users.manage is currently
// held only by super-admin; requireSuperAdmin states that intent explicitly
// rather than leaving it implied by a permission table.
adminUserRouter.use(
  adminLimiter,
  authenticate,
  requireSuperAdmin,
  requirePermission(PERMISSIONS.USERS_MANAGE),
);

// The list deliberately has no pagination: there are a handful of panel
// accounts, and a screen that hides the very account you are looking for
// behind page two is worse than one long table.
adminUserRouter.get("/", adminUsers.list);

adminUserRouter.post(
  "/:id/reset-password",
  validate({params: adminUserIdParam, body: resetAdminPasswordSchema}),
  adminUsers.resetPassword,
);
