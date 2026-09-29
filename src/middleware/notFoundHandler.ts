import type { RequestHandler } from "express";

// Runs when no route matched the request.
// Passes a 404 error on to the error handler, so every error
// response has the same shape: { error: "..." }
const notFoundHandler: RequestHandler = (_req, _res, next) => {
  next(new Error("Not found", { cause: { status: 404 } }));
};

export default notFoundHandler;
