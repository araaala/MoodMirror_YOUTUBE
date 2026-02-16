// server/index.js
import dotenv from "dotenv";
dotenv.config(); // 👈 MUST BE FIRST

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

/* ================= Debug ================= */
console.log("YouTube API key loaded:", process.env.YOUTUBE_API_KEY ? "YES" : "NO");
console.log(
  "Google OAuth loaded:",
  process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET ? "YES" : "NO"
);


/* ================= Middleware ================= */
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);


app.use(express.json());
app.use(cookieParser());

// Session for storing OAuth tokens (DEV-friendly)
app.use(
  session({
    name: "moodmirror.sid",
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: false,      // MUST be false on localhost
      sameSite: "lax",    // 🔥 THIS FIXES IT
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
  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log(`🎵 Music platform: YouTube`);
  console.log(`🧠 Python service: ${PY_API_BASE}`);
  console.log(`🌐 Client: ${CLIENT_URL}`);
});
