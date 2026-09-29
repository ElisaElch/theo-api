import { z } from "zod";

// Sign-up: rules match the hints shown on the sign-up form
export const registerSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(50),

  // Stored lowercase so "Sophie" and "sophie" count as the same username
  username: z
    .string()
    .trim()
    .toLowerCase()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username can be at most 30 characters")
    .regex(/^[a-z0-9_.]+$/, "Username can only contain letters, numbers, dots and underscores"),

  email: z.email("Please enter a valid email address"),

  // At least 8 characters, including a letter and a number (as in the sign-up mockup)
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[a-zA-Z]/, "Password must include a letter")
    .regex(/[0-9]/, "Password must include a number"),
});

// Log in: only checks that both fields are filled in.
// The real check is whether the password matches the stored hash.
export const loginSchema = z.object({
  email: z.email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

// TypeScript types generated from the schemas, for use in the controller
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
