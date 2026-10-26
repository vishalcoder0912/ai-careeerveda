import {z} from "zod";

// Account ids are Mongo ObjectIds. Parsing the shape here keeps a malformed id
// from reaching a cast that would throw a 500.
export const adminUserIdParam = z.object({
  id: z.string().regex(/^[a-f0-9]{24}$/i, "Invalid account id"),
});

// Strength is enforced by validatePasswordStrength, which produces one clear
// sentence instead of a wall of Zod messages. Only the type and an upper bound
// belong here — Argon2 is slow by design and an unbounded input is a DoS.
export const resetAdminPasswordSchema = z.object({
  newPassword: z.string({error: "Password must be text"}).min(1).max(200),
});
