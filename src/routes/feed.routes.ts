import { Router } from "express";
import { getFeed } from "../controllers/feed.controller.js";
import authenticate from "../middleware/authenticate.js";

// Mounted under /api/feed in app.ts
const feedRoutes = Router();

// The feed is personal (your friends), so it needs a login
feedRoutes.get("/", authenticate, getFeed);

export default feedRoutes;
