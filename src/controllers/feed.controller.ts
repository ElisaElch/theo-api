import type { RequestHandler } from "express";
import type { Types } from "mongoose";
import Visit from "../models/Visit.js";
import { getFriendIds } from "../utils/friends.js";
import {
  toFriendVisit,
  type PopulatedPlace,
  type VisitWithPlace,
} from "../utils/friendVisit.js";

// The user fields loaded with each visit.
// name is the virtual, built from firstName and lastName (so both must be loaded).
type PopulatedUser = {
  _id: Types.ObjectId;
  firstName: string;
  lastName: string;
  name: string;
  username: string;
  avatar?: { url?: string };
};

const USER_FIELDS = "firstName lastName username avatar";
const FEED_LIMIT = 30; // most recent 30 places
const WEEK_MS = 7 * 24 * 60 * 60 * 1000; // one week in milliseconds
const MAX_GROUPS = 6; // the dashboard shows the newest few

// What the browser gets to know about the friend who saved a place
function toFeedFriend(friend: PopulatedUser) {
  return {
    id: friend._id.toString(),
    name: friend.name,
    username: friend.username,
    avatarUrl: friend.avatar?.url ?? null,
  };
}

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
    .populate<{ user: PopulatedUser | null }>("user", USER_FIELDS)
    .sort({ createdAt: -1 }) // newest first (used for the order only, never sent)
    .limit(FEED_LIMIT);

  const items = visits
    // Skip anything whose place or user no longer exists
    .filter((visit) => visit.place !== null && visit.user !== null)
    .map((visit) => ({
      friend: toFeedFriend(visit.user!),
      visit: toFriendVisit(visit as unknown as VisitWithPlace),
    }));

  res.json({ items });
};

// GET /api/feed/groups: friends' places from the last 7 days, grouped by friend and day.
// e.g. "Tom added 3 places" when Tom saved three places on the same day.
// Groups come newest first, but no dates are sent: the grouping happens here on the server,
// so the browser never learns WHEN anything was saved.
export const getActivityGroups: RequestHandler = async (req, res) => {
  const friendIds = await getFriendIds(req.user!.id, { excludeMuted: true });

  if (friendIds.length === 0) {
    res.json({ groups: [] });
    return;
  }

  const oneWeekAgo = new Date(Date.now() - WEEK_MS);

  const visits = await Visit.find({
    user: { $in: friendIds },
    status: "visited",
    createdAt: { $gte: oneWeekAgo }, // $gte = "on or after"
  })
    .populate<{ place: PopulatedPlace | null }>("place")
    .populate<{ user: PopulatedUser | null }>("user", USER_FIELDS)
    .sort({ createdAt: -1 }) // newest first
    .limit(100); // a safety limit; a week of friends' places is rarely more

  // A Map keeps the order things were added in. Because the visits are sorted newest first,
  // the first group created is the newest one, and so on.
  const groups = new Map<
    string,
    { friend: ReturnType<typeof toFeedFriend>; visits: ReturnType<typeof toFriendVisit>[] }
  >();

  for (const visit of visits) {
    // Skip anything whose place or user no longer exists
    if (!visit.place || !visit.user) continue;

    // One group per friend per day, e.g. "64ab12...-2026-10-08"
    const day = visit.createdAt.toISOString().slice(0, 10);
    const key = `${visit.user._id.toString()}-${day}`;

    let group = groups.get(key);
    if (!group) {
      group = { friend: toFeedFriend(visit.user), visits: [] };
      groups.set(key, group);
    }
    group.visits.push(toFriendVisit(visit as unknown as VisitWithPlace));
  }

  // Only the newest few groups; the day keys are dropped, so no dates leave the server
  res.json({ groups: [...groups.values()].slice(0, MAX_GROUPS) });
};