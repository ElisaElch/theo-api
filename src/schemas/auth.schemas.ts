import { z } from "zod";

// Sign-up: rules match the hints shown on the sign-up form
export const registerSchema = z.object({
  // Your account
  firstName: z.string().trim().min(1, "First name is required").max(50),
  lastName: z.string().trim().max(50).optional(),

  // Stored lowercase so "Sophie" and "sophie" count as the same username
  username: z
    .string()
    .trim()
    .toLowerCase()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username can be at most 30 characters")
    .regex(/^[a-z0-9_.]+$/, "Username can only contain letters, numbers, dots and underscores"),

  email: z.email("Please enter a valid email address"),

  // At least 8 characters, including a letter and a number
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[a-zA-Z]/, "Password must include a letter")
    .regex(/[0-9]/, "Password must include a number"),

  // About you (the photo is uploaded separately, after the account exists)
  location: z.string().trim().max(100).optional(),
  bio: z.string().trim().max(150, "Bio can be at most 150 characters").optional(),

  // The checkbox must be ticked: only the value true passes
  termsAccepted: z.literal(true, { error: "Please agree to the Terms and Privacy Policy" }),
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