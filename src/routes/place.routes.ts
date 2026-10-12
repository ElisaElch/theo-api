import { Router } from "express";
import { searchPlaces } from "../controllers/place.controller.js";
import authenticate from "../middleware/authenticate.js";

// All routes here are mounted under /api/places in app.ts
const placeRoutes = Router();

// Only logged-in users can search Theo's places
placeRoutes.use(authenticate);

placeRoutes.get("/search", searchPlaces);

export default placeRoutes;