import fs from "node:fs/promises";
import type { RequestHandler } from "express";
import { isValidObjectId } from "mongoose";
import cloudinary from "../config/cloudinary.js";
import Connection from "../models/Connection.js";
import User from "../models/User.js";
import Visit from "../models/Visit.js";
import { deletePhotos } from "../utils/deletePhotos.js";
import { areFriends } from "../utils/friends.js";
import {
  toFriendVisit,
  type PopulatedPlace,
  type VisitWithPlace,
} from "../utils/friendVisit.js";

type IdParams = { id: string };
type FriendVisitParams = { id: string; visitId: string };

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

  return {
    id: friend._id.toString(),
    name: friend.name, // the virtual: first and last name
    username: friend.username,
    avatarUrl: friend.avatar?.url ?? null,
  };
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
      firstName: found.firstName,
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

// PUT /api/users/me/avatar: upload or replace MY profile photo (requires parsePhotos)
export const updateAvatar: RequestHandler = async (req, res) => {
  const files = req.photoFiles ?? [];
  const myId = req.user!.id;

  try {
    // parsePhotos guarantees at least one image; only the first is used
    const result = await cloudinary.uploader.upload(files[0].filepath, {
      folder: `theo/${myId}`,
      // A 400×400 square, centred on a face if Cloudinary finds one
      transformation: [{ width: 400, height: 400, crop: "fill", gravity: "face", quality: "auto" }],
    });

    const newAvatar = { url: result.secure_url, publicId: result.public_id };

    // returnDocument "before" gives back the user as it was BEFORE the update,
    // so we know which old photo to delete
    const before = await User.findByIdAndUpdate(
      myId,
      { avatar: newAvatar },
      { returnDocument: "before" },
    );

    // The account no longer exists: remove the photo we just uploaded
    if (!before) {
      await deletePhotos([newAvatar.publicId]);
      throw new Error("User not found", { cause: { status: 404 } });
    }

    // Replaced an old photo: delete it from Cloudinary so it doesn't use up storage
    if (before.avatar?.publicId) {
      await deletePhotos([before.avatar.publicId]);
    }

    res.json({ avatarUrl: newAvatar.url });
  } finally {
    // Always delete the temporary files, even if the upload failed
    await Promise.all(files.map((file) => fs.unlink(file.filepath).catch(() => {})));
  }
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