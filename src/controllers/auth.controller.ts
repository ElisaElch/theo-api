import type { RequestHandler } from "express";
import bcrypt from "bcryptjs";
import User from "../models/User.js";
import type { LoginInput, RegisterInput } from "../schemas/auth.schemas.js";
import type { Role } from "../types/express.js";
import { clearAuthCookie, setAuthCookie, signToken } from "../utils/authToken.js";

// The user data we send to the frontend. Never includes the password hash.
function toPublicUser(user: InstanceType<typeof User>) {
  return {
    id: user._id.toString(),
    name: user.name,
    username: user.username,
    email: user.email,
    role: user.role,
    bio: user.bio,
    location: user.location,
  };
}

// Creates the token and puts it in the login cookie
function logUserIn(res: Parameters<RequestHandler>[1], user: InstanceType<typeof User>) {
  const token = signToken(user._id.toString(), user.role as Role);
  setAuthCookie(res, token);
}

// POST /api/auth/register
export const register: RequestHandler<unknown, unknown, RegisterInput> = async (req, res) => {
  const { name, username, email, password } = req.body;

  // Hash the password. 12 is the "cost": higher means slower to crack, but slower to log in.
  const passwordHash = await bcrypt.hash(password, 12);

  // A taken username or email throws a duplicate key error,
  // which the error handler turns into a 409 response
  const user = await User.create({ name, username, email, passwordHash });

  // Log them in straight away, so they don't have to log in after signing up
  logUserIn(res, user);
  res.status(201).json({ user: toPublicUser(user) });
};

// POST /api/auth/login
export const login: RequestHandler<unknown, unknown, LoginInput> = async (req, res) => {
  const { email, password } = req.body;

  // passwordHash is hidden by default (select: false), so ask for it explicitly
  const user = await User.findOne({ email: email.toLowerCase() }).select("+passwordHash");

  const passwordMatches = user ? await bcrypt.compare(password, user.passwordHash) : false;

  // Same message whether the email or the password is wrong,
  // so nobody can use the login form to find out which emails have accounts
  if (!user || !passwordMatches) {
    throw new Error("Incorrect email or password", { cause: { status: 401 } });
  }

  logUserIn(res, user);
  res.json({ user: toPublicUser(user) });
};

// POST /api/auth/logout
export const logout: RequestHandler = (_req, res) => {
  clearAuthCookie(res);
  res.json({ message: "Logged out" });
};

// GET /api/auth/me — who is logged in? (requires authenticate)
export const me: RequestHandler = async (req, res) => {
  const user = await User.findById(req.user!.id);

  // The token is valid, but the account no longer exists
  if (!user) {
    throw new Error("User not found", { cause: { status: 404 } });
  }

  res.json({ user: toPublicUser(user) });
};
