import type { Response } from "express";
import jwt from "jsonwebtoken";
import type { Role } from "../types/express.js";

// Name of the login cookie, and how long a login lasts
export const AUTH_COOKIE = "theo_token";
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

// Reads the secret from .env, and fails loudly if it's missing
function getSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is not set in .env");
  }
  return secret;
}

// Creates a signed token containing the user's id (as "sub") and role
export function signToken(userId: string, role: Role): string {
  return jwt.sign({ role }, getSecret(), { subject: userId, expiresIn: "7d" });
}

// Checks a token's signature and expiry, and returns who it belongs to.
// Throws an error if the token is invalid or expired.
export function verifyToken(token: string): { id: string; role: Role } {
  const payload = jwt.verify(token, getSecret()) as jwt.JwtPayload;
  return { id: payload.sub as string, role: payload.role as Role };
}

// Cookie settings shared by setting and clearing the cookie
const cookieOptions = {
  httpOnly: true, // JavaScript in the browser can't read it
  secure: process.env.NODE_ENV === "production", // HTTPS only on the live site
  sameSite: "lax" as const, // first-party cookie, thanks to the Vercel proxy
};

// Puts the token in the login cookie
export function setAuthCookie(res: Response, token: string): void {
  res.cookie(AUTH_COOKIE, token, { ...cookieOptions, maxAge: SEVEN_DAYS_MS });
}

// Removes the login cookie (used by logout)
export function clearAuthCookie(res: Response): void {
  res.clearCookie(AUTH_COOKIE, cookieOptions);
}
