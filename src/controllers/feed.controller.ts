import type { RequestHandler } from "express";
import type { Types } from "mongoose";
import Visit from "../models/Visit.js";
import { getFriendIds } from "../utils/friends.js";
import { toFriendVisit, type PopulatedPlace, type VisitWithPlace } from "../utils/friendVisit.js";

type PopulatedUser = { _id: Types.ObjectId; name: string; username: string };

const FEED_LIMIT = 30; // most recent 30 places

// GET /api/feed: places your friends have saved recently, newest first.
// Muted friends are left out. No timestamps are sent: the order shows
// what's recent, but nothing says WHEN.
export const getFeed: RequestHandler = async (req, res) => {
  const friendIds = await getFriendIds(req.user!.id, { excludeMuted: true });

  // No friends (or all muted): nothing to show, and no need to query visits
  if (friendIds.length === 0) {
    res.json({ items: [] });
    return;
  }

  const visits = await Visit.find({ user: { $in: friendIds }, status: "visited" })
    .populate<{ place: PopulatedPlace | null }>("place")
    .populate<{ user: PopulatedUser | null }>("user", "name username")
    .sort({ createdAt: -1 }) // newest first (used for the order only, never sent)
    .limit(FEED_LIMIT);

  const items = visits
    // Skip anything whose place or user no longer exists
    .filter((visit) => visit.place !== null && visit.user !== null)
    .map((visit) => {
      const friend = visit.user!;
      return {
        friend: { id: friend._id.toString(), name: friend.name, username: friend.username },
        visit: toFriendVisit(visit as unknown as VisitWithPlace),
      };
    });

  res.json({ items });
};
