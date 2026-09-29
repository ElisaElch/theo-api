import type { ErrorRequestHandler } from "express";

// Central error handler: every error thrown in a route or middleware ends up here.
// It turns errors into one consistent JSON response: { error: "..." }
const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  // In development, print the full error in red so it's easy to spot in the terminal
  if (process.env.NODE_ENV !== "production") {
    console.error(`\x1b[31m${err.stack}\x1b[0m`);
  }

  // Defaults for unexpected errors
  let statusCode = 500;
  let message = "Internal server error";

  // Our own errors: thrown as new Error("message", { cause: { status: 400 } })
  if (err instanceof Error) {
    message = err.message;

    if (err.cause && typeof err.cause === "object" && "status" in err.cause) {
      statusCode = (err.cause as { status: number }).status;
    }
  }

  // MongoDB duplicate key error (code 11000), e.g. username or email already taken.
  // keyValue shows which field clashed, e.g. { username: "sophie" }
  if (err?.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue ?? {})[0] ?? "Value";
    message = `${field} is already taken`;
  }

  // In production, hide details of unexpected errors from users.
  // The full error is still visible in the server logs.
  if (statusCode === 500 && process.env.NODE_ENV === "production") {
    message = "Internal server error";
  }

  res.status(statusCode).json({ error: message });
};

export default errorHandler;
