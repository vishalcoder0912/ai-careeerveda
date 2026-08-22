import {z} from "zod";

// Every field is explicitly typed as a string. This is what stops
// {"email":{"$ne":null}} — sanitizeRequest strips the operator, and this
// refuses the object outright even if a future change lets one through.

const email = z
  .string({invalid_type_error: "Email must be text"})
  .trim()
  .toLowerCase()
  .min(3)
  .max(254)
  .email("Enter a valid email address");

// Only bounded here; strength is enforced by validatePasswordStrength, which
// produces one clear sentence rather than a wall of Zod messages.
const password = z.string({invalid_type_error: "Password must be text"}).min(1).max(200);

export const loginSchema = z.object({
  email,
  password,
});

export const changePasswordSchema = z.object({
  currentPassword: password,
  newPassword: password,
});

export const revokeSessionSchema = z.object({
  id: z.string().regex(/^[a-f0-9]{24}$/i, "Invalid session id"),
});
