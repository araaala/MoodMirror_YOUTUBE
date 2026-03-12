// server/index.js
import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import cookieSession from "cookie-session";

// Routes
import youtubeRoutes from "./routes/youtube.js";
import authRoutes from "./routes/auth.js";
import playlistRoutes from "./routes/playlist.js";

/* ================= App Init ================= */
const app = express();

/* ================= Env ================= */
const PORT = process.env.PORT || 5000;
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";
const PY_API_BASE = process.env.PY_API_BASE || "http://127.0.0.1:8000";
const NODE_ENV = process.env.NODE_ENV || "development";

/* ================= Debug ================= */
console.log("YouTube API key loaded:", process.env.YOUTUBE_API_KEY ? "YES" : "NO");
console.log(
  "Google OAuth loaded:",
  process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET ? "YES" : "NO"
);
console.log("Environment:", NODE_ENV);

/* ================= Trust Proxy (Render fix) ================= */
app.set("trust proxy", 1);

/* ================= Middleware ================= */
app.use(express.json());
app.use(cookieParser());

/* ================= CORS ================= */
app.use(
  cors({
    origin: CLIENT_URL,
    credentials: true,
  })
);

/* ================= Session ================= */
app.use(
  cookieSession({
    name: "moodmirror-session",
    keys: [process.env.SESSION_SECRET],
    maxAge: 24 * 60 * 60 * 1000,
    sameSite: "none",
    secure: true,
  })
);

/* ================= Debug Endpoint ================= */
app.get("/api/debug-session", (req, res) => {
  res.json({
    hasSession: !!req.session,
    hasTokens: !!req.session?.tokens,
  });
});

/* ================= Health ================= */
app.get("/health", (req, res) => {
  res.json({
    status: "Server is running",
    platform: "YouTube",
    loggedIn: !!req.session?.tokens,
  });
});

/* ================= Routes ================= */
app.use("/api/youtube", youtubeRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/playlist", playlistRoutes);

/* ================= Start Server ================= */
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`🎵 Music platform: YouTube`);
  console.log(`🧠 Python service: ${PY_API_BASE}`);
  console.log(`🌐 Client allowed: ${CLIENT_URL}`);
});