import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import authRoutes from "./routes/auth.routes.js";
import visitRoutes from "./routes/visit.routes.js";
import uploadRoutes from "./routes/upload.routes.js";
import notFoundHandler from "./middleware/notFoundHandler.js";
import errorHandler from "./middleware/errorHandler.js";

const app = express();

// --- Middleware that runs on every request ---
app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
  }),
);
app.use(express.json()); // reads JSON bodies into req.body
app.use(cookieParser()); // reads cookies into req.cookies

// --- Routes ---
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/auth", authRoutes);
app.use("/api/visits", visitRoutes);
app.use("/api/uploads", uploadRoutes);

// --- Error handling (must come after all routes) ---
app.use(notFoundHandler); // no route matched → 404
app.use(errorHandler); // turns every error into { error: "..." }

export default app;
