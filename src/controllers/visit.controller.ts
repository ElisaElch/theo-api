import type { RequestHandler } from "express";
import { isValidObjectId } from "mongoose";
import Place from "../models/Place.js";
import Visit from "../models/Visit.js";
import type { CreateVisitInput, UpdateVisitInput } from "../schemas/visit.schemas.js";
import { deletePhotos } from "../utils/deletePhotos.js";

type IdParams = { id: string };

// --- Helpers ---

// A "visited" place needs a date and a rating. "Want to go" doesn't.
function checkVisitedHasDetails(visit: {
  status?: string | null;
  visitDate?: Date | null;
  rating?: number | null;
}) {
  if (visit.status === "visited" && (!visit.visitDate || !visit.rating)) {
    throw new Error("A visited place needs a visit date and a rating", {
      cause: { status: 400 },
    });
  }
}

// 11 stars needs a reason, so the extra star always means something
function checkExceptionalHasReason(visit: {
  rating?: number | null;
  exceptionalReason?: string | null;
}) {
  if (visit.rating === 11 && !visit.exceptionalReason?.trim()) {
    throw new Error("Tell us what made it exceptional to give it the 11th star", {
      cause: { status: 400 },
    });
  }
}

// Finds one of the logged-in user's own visits, or throws 404.
// Searching by _id AND user means other people's visits are never found.
async function findMyVisit(id: string, userId: string) {
  if (!isValidObjectId(id)) {
    throw new Error("Invalid id", { cause: { status: 400 } });
  }

  const visit = await Visit.findOne({ _id: id, user: userId });

  if (!visit) {
    throw new Error("Visit not found", { cause: { status: 404 } });
  }

  return visit;
}

// --- Routes ---

// POST /api/visits: save a place (find or create the Place, then create the Visit)
export const createVisit: RequestHandler<unknown, unknown, CreateVisitInput> = async (req, res) => {
  const { place: placeData, ...visitData } = req.body;
  const userId = req.user!.id;

  checkVisitedHasDetails(visitData);
  checkExceptionalHasReason(visitData);

  // Find the shared Place by externalId, or create it if nobody has saved it yet.
  // $setOnInsert only writes the details when creating, never over an existing place.
  const place = await Place.findOneAndUpdate(
    { externalId: placeData.externalId },
    { $setOnInsert: placeData },
    { upsert: true, returnDocument: "after" },
  );

  // One visit per user per place (for now)
  const alreadySaved = await Visit.exists({ user: userId, place: place._id });
  if (alreadySaved) {
    throw new Error("You've already saved this place", { cause: { status: 409 } });
  }

  // Only 11-star visits keep a reason
  const exceptionalReason = visitData.rating === 11 ? visitData.exceptionalReason : "";

  const visit = await Visit.create({
    ...visitData,
    exceptionalReason,
    user: userId,
    place: place._id,
  });
  await visit.populate("place");

  res.status(201).json({ visit });
};

// GET /api/visits: all of the logged-in user's visits, newest first
export const getMyVisits: RequestHandler = async (req, res) => {
  const visits = await Visit.find({ user: req.user!.id })
    .populate("place")
    .sort({ visitDate: -1, createdAt: -1 });

  res.json({ visits });
};

// GET /api/visits/:id: one of the user's visits
export const getVisit: RequestHandler<IdParams> = async (req, res) => {
  const visit = await findMyVisit(req.params.id, req.user!.id);
  await visit.populate("place");

  res.json({ visit });
};

// PATCH /api/visits/:id: edit the visit (only the fields that were sent)
export const updateVisit: RequestHandler<IdParams, unknown, UpdateVisitInput> = async (
  req,
  res,
) => {
  const visit = await findMyVisit(req.params.id, req.user!.id);

  // Remember the current photos, to spot which ones get removed
  const oldPublicIds = visit.photos.map((photo) => photo.publicId);

  visit.set(req.body);
  checkVisitedHasDetails(visit); // checked after the changes, e.g. wantToGo → visited
  checkExceptionalHasReason(visit);

  // Lowering the rating from 11 removes the reason, so it can't linger
  if (visit.rating !== 11) {
    visit.exceptionalReason = "";
  }

  await visit.save();

  // Photos that were on the visit before but aren't any more → delete from Cloudinary
  if (req.body.photos) {
    const newPublicIds = new Set(req.body.photos.map((photo) => photo.publicId));
    await deletePhotos(oldPublicIds.filter((id) => !newPublicIds.has(id)));
  }

  await visit.populate("place");
  res.json({ visit });
};

// DELETE /api/visits/:id: remove the visit and its photos (the shared Place stays)
export const deleteVisit: RequestHandler<IdParams> = async (req, res) => {
  const visit = await findMyVisit(req.params.id, req.user!.id);
  const publicIds = visit.photos.map((photo) => photo.publicId);

  await visit.deleteOne();
  await deletePhotos(publicIds); // after the visit is gone, so it never points at deleted photos

  res.status(204).end();
};
