import { Router } from "express";
import {
  acceptRequest,
  listConnections,
  muteFriend,
  removeConnection,
  sendRequest,
} from "../controllers/connection.controller.js";
import authenticate from "../middleware/authenticate.js";
import validateBody from "../middleware/validateBody.js";
import { muteSchema, sendRequestSchema } from "../schemas/connection.schemas.js";

// Mounted under /api/connections in app.ts
const connectionRoutes = Router();

// Every friends route needs a login
connectionRoutes.use(authenticate);

connectionRoutes.route("/").get(listConnections).post(validateBody(sendRequestSchema), sendRequest);

connectionRoutes.patch("/:id/accept", acceptRequest);
connectionRoutes.patch("/:id/mute", validateBody(muteSchema), muteFriend);
connectionRoutes.delete("/:id", removeConnection);

export default connectionRoutes;
