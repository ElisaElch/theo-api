import { Router } from "express";
import {
  getFriendVisit,
  getFriendVisits,
  removeAvatar,
  searchUser,
  updateAvatar,
  updateProfile,
} from "../controllers/user.controller.js";
import authenticate from "../middleware/authenticate.js";
import parsePhotos from "../middleware/parsePhotos.js";
import validateBody from "../middleware/validateBody.js";
import { updateProfileSchema } from "../schemas/user.schemas.js";

// Mounted under /api/users in app.ts
const userRoutes = Router();

// Every route here needs a logged-in user
userRoutes.use(authenticate);

userRoutes.get("/search", searchUser); // e.g. /api/users/search?username=theotravels

// Your own profile
userRoutes.patch("/me", validateBody(updateProfileSchema), updateProfile); // name, city, bio
userRoutes.put("/me/avatar", parsePhotos, updateAvatar); // upload or replace my profile photo
userRoutes.delete("/me/avatar", removeAvatar); // remove my profile photo

// Friends' places
userRoutes.get("/:id/visits", getFriendVisits); // all of a friend's places
userRoutes.get("/:id/visits/:visitId", getFriendVisit); // one of a friend's places

export default userRoutes;