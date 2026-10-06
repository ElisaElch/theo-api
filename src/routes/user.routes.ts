import { Router } from "express";
import {
  getFriendVisit,
  getFriendVisits,
  searchUser,
  updateAvatar,
} from "../controllers/user.controller.js";
import authenticate from "../middleware/authenticate.js";
import parsePhotos from "../middleware/parsePhotos.js";

// Mounted under /api/users in app.ts
const userRoutes = Router();

// Every route here needs a logged-in user
userRoutes.use(authenticate);

userRoutes.get("/search", searchUser); // e.g. /api/users/search?username=theotravels
userRoutes.put("/me/avatar", parsePhotos, updateAvatar); // upload or replace my profile photo
userRoutes.get("/:id/visits", getFriendVisits); // all of a friend's places
userRoutes.get("/:id/visits/:visitId", getFriendVisit); // one of a friend's places

export default userRoutes;