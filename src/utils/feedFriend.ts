import type { Types } from "mongoose";

// The user fields loaded with a friend's visit.
// name is the virtual, built from firstName and lastName (so both must be loaded).
export type PopulatedUser = {
  _id: Types.ObjectId;
  firstName: string;
  lastName: string;
  name: string;
  username: string;
  avatar?: { url?: string };
};

export const USER_FIELDS = "firstName lastName username avatar";

// What the browser gets to know about a friend: no email, no dates, nothing else
export function toFeedFriend(friend: PopulatedUser) {
  return {
    id: friend._id.toString(),
    name: friend.name,
    username: friend.username,
    avatarUrl: friend.avatar?.url ?? null,
  };
}