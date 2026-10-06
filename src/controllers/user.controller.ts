import type { RequestHandler } from "express";
import { isValidObjectId } from "mongoose";
import Connection from "../models/Connection.js";
import User from "../models/User.js";
import Visit from "../models/Visit.js";
import { areFriends } from "../utils/friends.js";
import { toFriendVisit, type PopulatedPlace, type VisitWithPlace } from "../utils/friendVisit.js";

type IdParams = { id: string };
type FriendVisitParams = { id: string; visitId: string };

// "Daisy Smith" → "Daisy"
function firstNameOf(name: string): string {
  return name.trim().split(/\s+/)[0];
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
