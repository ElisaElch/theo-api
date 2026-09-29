import { Router } from "express";
import { login, logout, me, register } from "../controllers/auth.controller.js";
import authenticate from "../middleware/authenticate.js";
import validateBody from "../middleware/validateBody.js";
import { loginSchema, registerSchema } from "../schemas/auth.schemas.js";

// All routes here are mounted under /api/auth in app.ts
const authRoutes = Router();

// Public: anyone can sign up or log in (the body is checked first)
authRoutes.post("/register", validateBody(registerSchema), register);
authRoutes.post("/login", validateBody(loginSchema), login);
authRoutes.post("/logout", logout);

// Protected: only works with a valid login cookie
authRoutes.get("/me", authenticate, me);

export default authRoutes;
