import { Router } from "express";
import { uploadPhotos } from "../controllers/upload.controller.js";
import authenticate from "../middleware/authenticate.js";
import parsePhotos from "../middleware/parsePhotos.js";

// Mounted under /api/uploads in app.ts
const uploadRoutes = Router();

// Login first (so strangers can't fill your Cloudinary storage),
// then read the files, then upload them
uploadRoutes.post("/", authenticate, parsePhotos, uploadPhotos);

export default uploadRoutes;
