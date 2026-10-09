import { z } from "zod";

// Editing your own profile. Same rules as at sign-up (see auth.schemas.ts).
// .partial() makes every field optional, so you can send just the ones that changed.
export const updateProfileSchema = z
  .object({
    firstName: z.string().trim().min(1, "First name is required").max(50),
    lastName: z.string().trim().max(50), // "" clears it
    location: z.string().trim().max(100), // "" clears it
    bio: z.string().trim().max(150, "Bio can be at most 150 characters"), // "" clears it
  })
  .partial();

// TypeScript type generated from the schema, for use in the controller
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;