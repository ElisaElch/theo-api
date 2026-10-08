import { Router } from "express";
import { getActivityGroups, getFeed } from "../controllers/feed.controller.js";
import authenticate from "../middleware/authenticate.js";

// Mounted under /api/feed in app.ts
const feedRoutes = Router();

// The feed is personal (your friends), so it needs a login
feedRoutes.use(authenticate);

feedRoutes.get("/", getFeed); // all recent places, one by one
feedRoutes.get("/groups", getActivityGroups); // last 7 days, grouped by friend and day

export default feedRoutes;