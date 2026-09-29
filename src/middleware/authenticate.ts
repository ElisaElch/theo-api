import type { RequestHandler } from "express";
import jwt from "jsonwebtoken";
import { AUTH_COOKIE, verifyToken } from "../utils/authToken.js";

// Protects routes: only lets the request through if there's a valid login cookie.
// On success, req.user = { id, role } is available in the controller.
const authenticate: RequestHandler = (req, _res, next) => {
  const token = req.cookies?.[AUTH_COOKIE];

  // No cookie means not logged in
  if (!token) {
    return next(new Error("Please log in", { cause: { status: 401 } }));
  }

  try {
    req.user = verifyToken(token);
    next();
  } catch (err) {
    // Token was valid once, but the 7 days are up
    if (err instanceof jwt.TokenExpiredError) {
      return next(
        new Error("Your session has expired, please log in again", { cause: { status: 401 } }),
      );
    }

    // Token was tampered with, or signed with a different secret
    if (err instanceof jwt.JsonWebTokenError) {
      return next(new Error("Invalid login, please log in again", { cause: { status: 401 } }));
    }

    // Anything else is unexpected, so let the error handler deal with it
    next(err);
  }
};

export default authenticate;
