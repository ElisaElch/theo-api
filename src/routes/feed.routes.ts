import { Router } from "express";
import {
  getActivityGroups,
  getFeed,
  getFriendsMapPlaces,
} from "../controllers/feed.controller.js";
import authenticate from "../middleware/authenticate.js";

// Mounted under /api/feed in app.ts
const feedRoutes = Router();

// Everything here is about your friends, so it needs a login
feedRoutes.use(authenticate);

feedRoutes.get("/", getFeed); // all recent places, one by one
feedRoutes.get("/groups", getActivityGroups); // last 7 days, grouped by friend and day
feedRoutes.get("/map", getFriendsMapPlaces); // all friends' places, for the Map page

export default feedRoutes;