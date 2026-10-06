import type { Types } from "mongoose";
import type Visit from "../models/Visit.js";

type PlaceType = "cafe" | "restaurant" | "hotel";

// The place fields loaded alongside a friend's visit
export type PopulatedPlace = {
  _id: Types.ObjectId;
  name: string;
  city: string;
  country: string;
  type: PlaceType;
  coordinates: { lat: number; lng: number };
};

export type VisitWithPlace = InstanceType<typeof Visit> & { place: PopulatedPlace };

// Builds what friends are allowed to see of a visit, field by field.
// Dates (visitDate, createdAt, updatedAt) are deliberately left out:
// friends never see WHEN someone was somewhere.
export function toFriendVisit(visit: VisitWithPlace) {
  const { place } = visit;
  return {
    _id: visit._id.toString(),
    place: {
      _id: place._id.toString(),
      name: place.name,
      city: place.city,
      country: place.country,
      type: place.type,
      coordinates: place.coordinates,
    },
    type: visit.type ?? place.type, // their own category
    rating: visit.rating,
    exceptionalReason: visit.exceptionalReason,
    isFavourite: visit.isFavourite,
    whatIHad: visit.whatIHad,
    memory: visit.memory,
    tags: visit.tags,
    photos: visit.photos.map((photo) => ({
      _id: photo._id.toString(),
      url: photo.url,
      publicId: photo.publicId,
    })),
  };
}
