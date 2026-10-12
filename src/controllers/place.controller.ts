import type { RequestHandler } from "express";
import Place from "../models/Place.js";

type SearchQuery = { q?: string };

const MAX_RESULTS = 5;
const MAX_WORDS = 5; // keeps the database query small, even if someone pastes a long text

// Makes user text safe to put in a regex, so "Café (Mitte)" or "A+B" are searched
// as plain letters instead of being read as regex symbols
function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// GET /api/places/search?q=lune melbourne
// Places already saved on Theo, by anyone. Only the place itself is returned,
// never who saved it.
export const searchPlaces: RequestHandler<unknown, unknown, unknown, SearchQuery> = async (
  req,
  res,
) => {
  const query = typeof req.query.q === "string" ? req.query.q.trim() : "";

  // Too short to be useful (or suspiciously long): just return nothing
  if (query.length < 2 || query.length > 100) {
    res.json({ places: [] });
    return;
  }

  // Every word has to appear in the name OR the city, so "Lune Melbourne"
  // finds "Lune Croissanterie" in Melbourne. "i" = ignore upper/lower case.
  const words = query.split(/\s+/).slice(0, MAX_WORDS);
  const conditions = words.map((word) => {
    const pattern = new RegExp(escapeRegex(word), "i");
    return { $or: [{ name: pattern }, { city: pattern }] };
  });

  const places = await Place.find({ $and: conditions })
    .select("externalId type name city country coordinates -_id")
    .sort({ name: 1 })
    .limit(MAX_RESULTS)
    .lean(); // plain objects instead of full Mongoose documents: faster, and we only read them

  res.json({ places });
};