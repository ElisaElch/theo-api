import type { RequestHandler } from "express";
import { isValidObjectId, type Types } from "mongoose";
import Connection from "../models/Connection.js";
import User from "../models/User.js";
import Visit from "../models/Visit.js";
import { areFriends } from "../utils/friends.js";

type IdParams = { id: string };
type FriendVisitParams = { id: string; visitId: string };
type PlaceType = "cafe" | "restaurant" | "hotel";

// The place fields loaded alongside a friend's visit
type PopulatedPlace = {
  _id: Types.ObjectId;
  name: string;
  city: string;
  country: string;
  type: PlaceType;
  coordinates: { lat: number; lng: number };
};

type VisitWithPlace = InstanceType<typeof Visit> & { place: PopulatedPlace };

// "Daisy Smith" → "Daisy"
function firstNameOf(name: string): string {
  return name.trim().split(/\s+/)[0];
}

// Builds what friends are allowed to see of a visit, field by field.
// Dates (visitDate, createdAt, updatedAt) are deliberately left out:
// friends never see WHEN someone was somewhere.
function toFriendVisit(visit: VisitWithPlace) {
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

// Checks the friendship and loads the friend, or throws 404.
// Same message whether they don't exist or just aren't your friend,
// so nobody can use these routes to check who has an account.
async function findFriend(myId: string, friendId: string) {
  if (!isValidObjectId(friendId)) {
    throw new Error("Invalid id", { cause: { status: 400 } });
  }

  if (friendId === myId || !(await areFriends(myId, friendId))) {
    throw new Error("Profile not found", { cause: { status: 404 } });
  }

  const friend = await User.findById(friendId);
  if (!friend) {
    throw new Error("Profile not found", { cause: { status: 404 } });
  }

  return { id: friend._id.toString(), name: friend.name, username: friend.username };
}

// GET /api/users/search?username=theotravels
// Finds ONE person by their exact username. There's no partial matching and no
// list of users, so people can only find you if they know your username.
// Searchers only see the username and FIRST name; the full name is only shown
// to the person receiving a request, and to friends.
export const searchUser: RequestHandler = async (req, res) => {
  const username = String(req.query.username ?? "")
    .trim()
    .toLowerCase();

  if (!username) {
    throw new Error("Please enter a username", { cause: { status: 400 } });
  }

  const found = await User.findOne({ username });

  if (!found) {
    throw new Error("No one with that username", { cause: { status: 404 } });
  }

  const myId = req.user!.id;
  const isYou = found._id.toString() === myId;

  // Is there already a friend request between us, in either direction?
  const connection = isYou
    ? null
    : await Connection.findOne({
        $or: [
          { requester: myId, recipient: found._id },
          { requester: found._id, recipient: myId },
        ],
      });

  res.json({
    // Only the username and first name. Never the full name, email or role.
    user: {
      id: found._id.toString(),
      username: found.username,
      firstName: firstNameOf(found.name),
    },
    isYou,
    connection: connection
      ? {
          id: connection._id.toString(),
          status: connection.status, // "pending" or "accepted"
          sentByMe: connection.requester.toString() === myId,
        }
      : null,
  });
};

// GET /api/users/:id/visits: all of a FRIEND's places, best-rated first
export const getFriendVisits: RequestHandler<IdParams> = async (req, res) => {
  const friend = await findFriend(req.user!.id, req.params.id);

  const visits = await Visit.find({ user: friend.id, status: "visited" })
    .populate<{ place: PopulatedPlace | null }>("place")
    .sort({ rating: -1 }); // best first (not by date, which would hint at when)

  const friendVisits = visits
    .filter((visit): visit is VisitWithPlace => visit.place !== null)
    .map(toFriendVisit);

  res.json({ friend, visits: friendVisits });
};

// GET /api/users/:id/visits/:visitId: ONE of a friend's places, in full
export const getFriendVisit: RequestHandler<FriendVisitParams> = async (req, res) => {
  const friend = await findFriend(req.user!.id, req.params.id);

  if (!isValidObjectId(req.params.visitId)) {
    throw new Error("Invalid id", { cause: { status: 400 } });
  }

  // The visit must belong to this friend, so it can't be used to peek at anyone else's
  const visit = await Visit.findOne({
    _id: req.params.visitId,
    user: friend.id,
    status: "visited",
  }).populate<{ place: PopulatedPlace | null }>("place");

  if (!visit || visit.place === null) {
    throw new Error("Place not found", { cause: { status: 404 } });
  }

  res.json({ friend, visit: toFriendVisit(visit as VisitWithPlace) });
};
