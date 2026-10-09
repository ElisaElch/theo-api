import { z } from "zod";

const PLACE_TYPES = ["cafe", "restaurant", "hotel"] as const;

// Facts about the place, from the location search on the frontend.
// Its type is only a suggestion for future visitors (set by whoever saves it first).
const placeSchema = z.object({
  externalId: z.string().min(1),
  type: z.enum(PLACE_TYPES),
  name: z.string().trim().min(1, "Name is required").max(100),
  city: z.string().trim().min(1, "City is required").max(100),
  country: z.string().trim().min(1, "Country is required").max(100),
  coordinates: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
  }),
});

// Visit dates can't be in the future. One day of leeway, so someone in a time zone
// that's already "tomorrow" (e.g. New Zealand) can still save today's date.
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

// The personal part: someone's memory of the place
const visitFields = {
  type: z.enum(PLACE_TYPES).optional(), // if not sent, the place's type is used
  status: z.enum(["visited", "wantToGo"]).default("visited"),
  // Accepts "2025-03-12" and turns it into a Date; rejects dates in the future
  visitDate: z.coerce
    .date()
    .refine((date) => date.getTime() <= Date.now() + ONE_DAY_MS, {
      error: "The visit date can't be in the future",
    })
    .optional(),  
  rating: z.number().int().min(1).max(11).optional(), // 11 = exceptional star
  exceptionalReason: z.string().trim().max(150).optional(),
  isFavourite: z.boolean().optional(),
  whatIHad: z.string().trim().max(300).optional(),
  memory: z.string().trim().max(2000).optional(),
  tags: z.array(z.string().trim().min(1).max(30)).max(20).optional(),
  photos: z
    .array(z.object({ url: z.url(), publicId: z.string().min(1) }))
    .max(12)
    .optional(),
  sourceUrl: z.url().optional(),
};

// POST /api/visits: place details + visit details
export const createVisitSchema = z.object({
  place: placeSchema,
  ...visitFields,
});

// PATCH /api/visits/:id: only visit details, every field optional.
// The place itself can't be edited, because it's shared with other users.
export const updateVisitSchema = z.object(visitFields).partial();

export type CreateVisitInput = z.infer<typeof createVisitSchema>;
export type UpdateVisitInput = z.infer<typeof updateVisitSchema>;
