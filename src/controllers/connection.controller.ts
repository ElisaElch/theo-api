import type { RequestHandler } from "express";
import { isValidObjectId, Types } from "mongoose";
import Connection from "../models/Connection.js";
import User from "../models/User.js";
import Visit from "../models/Visit.js";
import type { MuteInput, SendRequestInput } from "../schemas/connection.schemas.js";

type IdParams = { id: string };

// The user fields we load alongside a connection
type PopulatedUser = { _id: Types.ObjectId; name: string; username: string };

// "Daisy Smith" → "Daisy"
function firstNameOf(name: string): string {
  return name.trim().split(/\s+/)[0];
}

// How many places each of these users has saved, e.g. { "userId1": 12, "userId2": 3 }
async function countPlaces(userIds: string[]): Promise<Record<string, number>> {
  if (userIds.length === 0) return {};

  // One database query for everyone: group their visits by user and count them
  const counts = await Visit.aggregate<{ _id: Types.ObjectId; count: number }>([
    {
      $match: {
        user: { $in: userIds.map((id) => new Types.ObjectId(id)) },
        status: "visited",
      },
    },
    { $group: { _id: "$user", count: { $sum: 1 } } },
  ]);

  return Object.fromEntries(counts.map((row) => [row._id.toString(), row.count]));
}

// POST /api/connections: send a friend request
export const sendRequest: RequestHandler<unknown, unknown, SendRequestInput> = async (req, res) => {
  const myId = req.user!.id;
  const otherId = req.body.userId;

  if (otherId === myId) {
    throw new Error("You can't add yourself", { cause: { status: 400 } });
  }

  const otherUser = await User.exists({ _id: otherId });
  if (!otherUser) {
    throw new Error("User not found", { cause: { status: 404 } });
  }

  // Is there already a connection between us, in either direction?
  const existing = await Connection.findOne({
    $or: [
      { requester: myId, recipient: otherId },
      { requester: otherId, recipient: myId },
    ],
  });

  if (existing?.status === "accepted") {
    throw new Error("You're already friends", { cause: { status: 409 } });
  }

  if (existing && existing.requester.toString() === myId) {
    throw new Error("You've already sent a request", { cause: { status: 409 } });
  }

  // They already asked me: both want to be friends, so accept it straight away
  if (existing) {
    existing.status = "accepted";
    await existing.save();
    res.json({ connection: existing, autoAccepted: true });
    return;
  }

  const connection = await Connection.create({ requester: myId, recipient: otherId });
  res.status(201).json({ connection });
};

// GET /api/connections: my friends, plus requests sent to me and by me
export const listConnections: RequestHandler = async (req, res) => {
  const myId = req.user!.id;

  const connections = await Connection.find({
    $or: [{ requester: myId }, { recipient: myId }],
  }).populate<{ requester: PopulatedUser; recipient: PopulatedUser }>(
    "requester recipient",
    "name username",
  );

  const friends = [];
  const incoming = [];
  const outgoing = [];

  for (const connection of connections) {
    const sentByMe = connection.requester?._id.toString() === myId;
    const other = sentByMe ? connection.recipient : connection.requester;

    // Skip connections to accounts that no longer exist
    if (!other) continue;

    if (connection.status === "accepted") {
      // Friends see each other's full name. isMuted only says whether *I* muted them.
      friends.push({
        connectionId: connection._id.toString(),
        user: { id: other._id.toString(), name: other.name, username: other.username },
        isMuted: connection.mutedBy.some((id) => id.toString() === myId),
      });
    } else if (sentByMe) {
      // Requests I sent: still only the first name, as in search
      outgoing.push({
        connectionId: connection._id.toString(),
        user: {
          id: other._id.toString(),
          firstName: firstNameOf(other.name),
          username: other.username,
        },
      });
    } else {
      // Requests sent to me: full name, so I can be sure who it is
      incoming.push({
        connectionId: connection._id.toString(),
        user: { id: other._id.toString(), name: other.name, username: other.username },
      });
    }
  }

  // Add each friend's number of places (for "Emma · 48 places")
  const placeCounts = await countPlaces(friends.map((friend) => friend.user.id));
  const friendsWithCounts = friends.map((friend) => ({
    ...friend,
    placeCount: placeCounts[friend.user.id] ?? 0,
  }));

  res.json({ friends: friendsWithCounts, incoming, outgoing });
};

// PATCH /api/connections/:id/accept: accept a request sent TO me
export const acceptRequest: RequestHandler<IdParams> = async (req, res) => {
  if (!isValidObjectId(req.params.id)) {
    throw new Error("Invalid id", { cause: { status: 400 } });
  }

  // Only the recipient can accept, and only while it's pending
  const connection = await Connection.findOne({
    _id: req.params.id,
    recipient: req.user!.id,
    status: "pending",
  });

  if (!connection) {
    throw new Error("Request not found", { cause: { status: 404 } });
  }

  connection.status = "accepted";
  await connection.save();

  res.json({ connection });
};

// PATCH /api/connections/:id/mute: mute or unmute a friend (only affects what *I* see)
export const muteFriend: RequestHandler<IdParams, unknown, MuteInput> = async (req, res) => {
  if (!isValidObjectId(req.params.id)) {
    throw new Error("Invalid id", { cause: { status: 400 } });
  }

  const myId = req.user!.id;

  // $addToSet adds my id only if it isn't there yet; $pull removes it
  const update = req.body.muted ? { $addToSet: { mutedBy: myId } } : { $pull: { mutedBy: myId } };

  // Only friends can be muted, and only by someone in the friendship
  const connection = await Connection.findOneAndUpdate(
    {
      _id: req.params.id,
      status: "accepted",
      $or: [{ requester: myId }, { recipient: myId }],
    },
    update,
    { returnDocument: "after" },
  );

  if (!connection) {
    throw new Error("Friend not found", { cause: { status: 404 } });
  }

  res.json({ connectionId: connection._id.toString(), isMuted: req.body.muted });
};

// DELETE /api/connections/:id: decline a request, cancel my own, or remove a friend
export const removeConnection: RequestHandler<IdParams> = async (req, res) => {
  if (!isValidObjectId(req.params.id)) {
    throw new Error("Invalid id", { cause: { status: 400 } });
  }

  const myId = req.user!.id;

  // Either person in the connection can remove it
  const connection = await Connection.findOne({
    _id: req.params.id,
    $or: [{ requester: myId }, { recipient: myId }],
  });

  if (!connection) {
    throw new Error("Connection not found", { cause: { status: 404 } });
  }

  // Deleted, not marked "declined", so no record is kept of who said no
  await connection.deleteOne();

  res.status(204).end();
};
