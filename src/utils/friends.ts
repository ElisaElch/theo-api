import Connection from "../models/Connection.js";

// True if the two users are accepted friends (in either direction)
export async function areFriends(userId: string, otherId: string): Promise<boolean> {
  const connection = await Connection.exists({
    status: "accepted",
    $or: [
      { requester: userId, recipient: otherId },
      { requester: otherId, recipient: userId },
    ],
  });
  return connection !== null;
}

// The ids of all of a user's accepted friends.
// excludeMuted: leave out friends this user has muted (for the feed and map)
export async function getFriendIds(
  userId: string,
  { excludeMuted = false } = {},
): Promise<string[]> {
  const connections = await Connection.find({
    status: "accepted",
    $or: [{ requester: userId }, { recipient: userId }],
  });

  return connections
    .filter(
      (connection) => !excludeMuted || !connection.mutedBy.some((id) => id.toString() === userId),
    )
    .map((connection) =>
      connection.requester.toString() === userId
        ? connection.recipient.toString()
        : connection.requester.toString(),
    );
}
