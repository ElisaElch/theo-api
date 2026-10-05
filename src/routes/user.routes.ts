import { Router } from "express";
import { searchUser } from "../controllers/user.controller.js";
import authenticate from "../middleware/authenticate.js";

// Mounted under /api/users in app.ts
const userRoutes = Router();

// Only logged-in users can search for people
userRoutes.use(authenticate);

userRoutes.get("/search", searchUser);

export default userRoutes;
