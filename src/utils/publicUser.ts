import type User from "../models/User.js";

// The user data we send to the frontend about the logged-in user.
// Never includes the password hash. Used by login, sign-up, /me and profile editing.
export function toPublicUser(user: InstanceType<typeof User>) {
  return {
    id: user._id.toString(),
    firstName: user.firstName,
    lastName: user.lastName,
    name: user.name, // the virtual: first and last name joined
    username: user.username,
    email: user.email,
    role: user.role,
    bio: user.bio,
    location: user.location,
    avatarUrl: user.avatar?.url ?? null, // null means no photo yet
  };
}