import type { RequestHandler } from "express";
import { z, type ZodObject } from "zod";

// Checks req.body against a Zod schema before the controller runs.
// Usage in a route: validateBody(registerSchema)
const validateBody =
  (zodSchema: ZodObject): RequestHandler =>
  (req, _res, next) => {
    // No body at all, e.g. the frontend forgot to send JSON
    if (!req.body) {
      return next(new Error("Request body is missing", { cause: { status: 400 } }));
    }

    const { data, error, success } = zodSchema.safeParse(req.body);

    // Invalid body: send a readable list of what's wrong
    if (!success) {
      return next(new Error(z.prettifyError(error), { cause: { status: 400 } }));
    }

    // Valid: replace the body with Zod's cleaned-up version.
    // Unknown fields (like a sneaky "role") are removed here.
    req.body = data;
    next();
  };

export default validateBody;
