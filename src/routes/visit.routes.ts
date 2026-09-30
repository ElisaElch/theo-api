import { Router } from "express";
import {
  createVisit,
  deleteVisit,
  getMyVisits,
  getVisit,
  updateVisit,
} from "../controllers/visit.controller.js";
import authenticate from "../middleware/authenticate.js";
import validateBody from "../middleware/validateBody.js";
import { createVisitSchema, updateVisitSchema } from "../schemas/visit.schemas.js";

// All routes here are mounted under /api/visits in app.ts
const visitRoutes = Router();

// Every visit route needs a login, so apply authenticate once for all of them
visitRoutes.use(authenticate);

visitRoutes.route("/").get(getMyVisits).post(validateBody(createVisitSchema), createVisit);

visitRoutes
  .route("/:id")
  .get(getVisit)
  .patch(validateBody(updateVisitSchema), updateVisit)
  .delete(deleteVisit);

export default visitRoutes;
