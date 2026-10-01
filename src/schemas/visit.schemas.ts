import { z } from "zod";

// Facts about the place, from the location search on the frontend
const placeSchema = z.object({
  externalId: z.string().min(1),
  type: z.enum(["cafe", "restaurant", "hotel"]),
  name: z.string().trim().min(1, "Name is required").max(100),
  city: z.string().trim().min(1, "City is required").max(100),
  country: z.string().trim().min(1, "Country is required").max(100),
  coordinates: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
  }),
});

// The personal part: someone's memory of the place
const visitFields = {
  status: z.enum(["visited", "wantToGo"]).default("visited"),
  visitDate: z.coerce.date().optional(), // accepts "2025-03-12" and turns it into a Date
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
