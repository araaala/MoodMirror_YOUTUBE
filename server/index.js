// server/index.js
import dotenv from "dotenv";
dotenv.config(); // MUST be first

import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import session from "express-session";

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
const IS_PRODUCTION = NODE_ENV === "production";

/* ================= Debug ================= */
console.log("YouTube API key loaded:", process.env.YOUTUBE_API_KEY ? "YES" : "NO");
console.log(
  "Google OAuth loaded:",
  process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET ? "YES" : "NO"
);
console.log("Environment:", NODE_ENV);

/* ================= Trust Proxy (REQUIRED FOR RENDER) ================= */
app.set("trust proxy", 1);

/* ================= CORS ================= */
app.use(
  cors({
    origin: CLIENT_URL,
    credentials: true,
  })
);

app.use(express.json());
app.use(cookieParser());

/* ================= Session ================= */
app.use(
  session({
    name: "moodmirror.sid",
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    proxy: true,
    cookie: {
      httpOnly: true,
      secure: true,       // Always secure in production (Render is HTTPS)
      sameSite: "none",   // Required for Vercel -> Render cross-site cookies
      maxAge: 1000 * 60 * 60 * 24 * 7,
    },
  })
);

/* ================= Routes ================= */

// Health check
app.get("/health", (req, res) => {
  res.json({
    status: "Server is running",
    platform: "YouTube",
    loggedIn: !!req.session?.tokens,
  });
});

// YouTube search routes (API key)
app.use("/api/youtube", youtubeRoutes);

// OAuth routes
app.use("/api/auth", authRoutes);

// Playlist routes (OAuth required)
app.use("/api/playlist", playlistRoutes);

/* ================= Start Server ================= */
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`🎵 Music platform: YouTube`);
  console.log(`🧠 Python service: ${PY_API_BASE}`);
  console.log(`🌐 Client allowed: ${CLIENT_URL}`);
});