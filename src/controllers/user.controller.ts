import type { RequestHandler } from "express";
import Connection from "../models/Connection.js";
import User from "../models/User.js";

// "Daisy Smith" → "Daisy"
function firstNameOf(name: string): string {
  return name.trim().split(/\s+/)[0];
}

// GET /api/users/search?username=elegantswan
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
