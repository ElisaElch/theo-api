import { Router } from "express";
import { getFriendVisits, searchUser } from "../controllers/user.controller.js";
import authenticate from "../middleware/authenticate.js";

// Mounted under /api/users in app.ts
const userRoutes = Router();

// Only logged-in users can search for people or see friends' places
userRoutes.use(authenticate);

userRoutes.get("/search", searchUser); // e.g. /api/users/search?username=theotravels
userRoutes.get("/:id/visits", getFriendVisits); // a friend's places

export default userRoutes;
