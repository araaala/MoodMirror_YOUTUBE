// server/index.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import axios from "axios";
import SpotifyWebApi from "spotify-web-api-node";

dotenv.config();

const app = express();

// IMPORTANT: webcam images can be big
app.use(express.json({ limit: "10mb" }));
app.use(cookieParser());

const PORT = process.env.PORT || 5000;
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";
const DEMO_MODE = (process.env.DEMO_MODE || "false").toLowerCase() === "true";

app.use(
  cors({
    origin: CLIENT_URL,
    credentials: true,
  })
);

// -------------------------
// Spotify setup (used when DEMO_MODE=false)
// -------------------------
const spotifyApi = new SpotifyWebApi({
  clientId: process.env.SPOTIFY_CLIENT_ID,
  clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
  redirectUri: process.env.SPOTIFY_REDIRECT_URI,
});

const SPOTIFY_SCOPES = [
  "user-read-email",
  "user-read-private",
  "playlist-modify-private",
  "playlist-modify-public",
];

// -------------------------
// In-memory demo storage
// -------------------------
const demoUsers = new Map(); // sessionId -> user
const demoPlaylists = new Map(); // sessionId -> playlists[]

function makeSessionId() {
  return "demo_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function requireAuth(req, res, next) {
  const sessionId = req.cookies.session_id;
  if (!sessionId || !demoUsers.has(sessionId)) {
    return res.status(401).json({ error: "Not logged in" });
  }
  req.sessionId = sessionId;
  req.user = demoUsers.get(sessionId);
  next();
}

function normalizeMood(m) {
  const mood = String(m || "").toLowerCase().trim();
  const allowed = ["happy", "sad", "angry", "surprised", "fearful", "disgusted"];
  return allowed.includes(mood) ? mood : null;
}

function setSpotifyTokenFromCookie(req) {
  const token = req.cookies.spotify_access_token;
  if (!token) return false;
  spotifyApi.setAccessToken(token);
  return true;
}

// -------------------------
// Demo track bank (used when DEMO_MODE=true)
// -------------------------
const moodTrackBank = {
  happy: [
    { title: "Sunrise Bounce", artist: "Neon Daydreams" },
    { title: "Good Vibes Only", artist: "Lemon City" },
    { title: "Float", artist: "Sky Arcade" },
    { title: "Weekend Glow", artist: "Stereo Smile" },
    { title: "Bright Side", artist: "Cassette Kids" },
  ],
  sad: [
    { title: "Grey Skies", artist: "Midnight Letters" },
    { title: "Halfway Home", artist: "Broken Chords" },
    { title: "Rainroom", artist: "Blue Avenue" },
    { title: "Echoes", artist: "Soft Static" },
    { title: "Falling Slow", artist: "Paper Planes" },
  ],
  angry: [
    { title: "No Apologies", artist: "Red Riot" },
    { title: "Pressure", artist: "Voltage Lane" },
    { title: "Break It", artist: "Iron Pulse" },
    { title: "Fireline", artist: "Rage Theory" },
    { title: "Shatter", artist: "Concrete Hearts" },
  ],
  surprised: [
    { title: "Plot Twist", artist: "Spark Avenue" },
    { title: "Sudden Light", artist: "Nova Room" },
    { title: "Wildcard", artist: "Flipbook" },
    { title: "Now You See", artist: "Prism Party" },
    { title: "Unexpected", artist: "Mirrorball" },
  ],
  fearful: [
    { title: "Calm Signal", artist: "Quiet Current" },
    { title: "Breathe In", artist: "Soft Horizon" },
    { title: "Safe Space", artist: "Driftwood" },
    { title: "Night Walk", artist: "Moon Glass" },
    { title: "Still Water", artist: "Low Tide" },
  ],
  disgusted: [
    { title: "Off Taste", artist: "Dark Citrus" },
    { title: "Poisoned Honey", artist: "Violet Ash" },
    { title: "No Thanks", artist: "Static Bloom" },
    { title: "Bitter", artist: "Hollow Pop" },
    { title: "Rot", artist: "Basement Garden" },
  ],
};

// -------------------------
// Routes
// -------------------------
app.get("/health", (req, res) => {
  res.json({ status: "Server is running", demoMode: DEMO_MODE });
});

// Login (DEMO or REAL)
app.get("/auth/login", (req, res) => {
  if (DEMO_MODE) {
    const sessionId = makeSessionId();
    const demoUser = {
      id: "spotify_user_jerome",
      displayName: "Jerome",
      email: "jerome@example.com",
      plan: "Free",
    };
    demoUsers.set(sessionId, demoUser);
    demoPlaylists.set(sessionId, []);
    res.cookie("session_id", sessionId, { httpOnly: true, sameSite: "lax" });
    return res.redirect(`${CLIENT_URL}/home`);
  }

  const url = spotifyApi.createAuthorizeURL(SPOTIFY_SCOPES, "moodmirror_state");
  return res.redirect(url);
});

// Spotify callback (REAL)
app.get("/auth/callback", async (req, res) => {
  if (DEMO_MODE) return res.redirect(`${CLIENT_URL}/home`);

  const code = req.query.code;
  try {
    const data = await spotifyApi.authorizationCodeGrant(code);
    const { access_token, refresh_token, expires_in } = data.body;

    res.cookie("spotify_access_token", access_token, { httpOnly: true, sameSite: "lax" });
    res.cookie("spotify_refresh_token", refresh_token, { httpOnly: true, sameSite: "lax" });
    res.cookie("spotify_expires_in", String(expires_in), { httpOnly: true, sameSite: "lax" });

    return res.redirect(`${CLIENT_URL}/home`);
  } catch (e) {
    console.error(e);
    return res.status(500).send("Spotify auth failed");
  }
});

// Logout (DEMO + clears Spotify cookies too)
app.post("/auth/logout", (req, res) => {
  const sessionId = req.cookies.session_id;
  if (sessionId) {
    demoUsers.delete(sessionId);
    demoPlaylists.delete(sessionId);
  }
  res.clearCookie("session_id");
  res.clearCookie("spotify_access_token");
  res.clearCookie("spotify_refresh_token");
  res.clearCookie("spotify_expires_in");
  res.json({ ok: true });
});

// DEMO profile endpoint
app.get("/api/me", requireAuth, (req, res) => {
  res.json({ user: req.user });
});

// -------------------------
// Playlist creation
// -------------------------

// DEMO playlist creation
app.post("/api/create-playlist", requireAuth, (req, res) => {
  const mood = normalizeMood(req.body.mood);
  if (!mood) return res.status(400).json({ error: "Invalid mood" });

  const tracks = moodTrackBank[mood] || [];
  const playlistId = "demo_pl_" + Math.random().toString(36).slice(2, 10);

  const playlist = {
    id: playlistId,
    name: `MoodMirror - ${mood}`,
    mood,
    createdAt: new Date().toISOString(),
    durationMins: 45,
    tracks,
    playlistUrl: `https://open.spotify.com/playlist/${playlistId}`,
    source: "demo",
  };

  const list = demoPlaylists.get(req.sessionId) || [];
  list.unshift(playlist);
  demoPlaylists.set(req.sessionId, list);

  res.json(playlist);
});

// REAL Spotify playlist creation
app.post("/api/create-playlist-real", async (req, res) => {
  if (DEMO_MODE) {
    return res.status(400).json({ error: "DEMO_MODE is ON. Use /api/create-playlist." });
  }

  const mood = normalizeMood(req.body.mood);
  if (!mood) return res.status(400).json({ error: "Invalid mood" });

  if (!setSpotifyTokenFromCookie(req)) {
    return res.status(401).json({ error: "Not logged in to Spotify" });
  }

  const moodQuery = {
    happy: "happy upbeat",
    sad: "sad emotional",
    angry: "angry intense",
    surprised: "energetic pop",
    fearful: "calm relaxing",
    disgusted: "dark alternative",
  };

  try {
    const me = await spotifyApi.getMe();
    const userId = me.body.id;

    const q = moodQuery[mood] || "mood";
    const search = await spotifyApi.searchTracks(q, { limit: 20 });
    const uris = search.body.tracks.items.slice(0, 15).map((t) => t.uri);

    const playlist = await spotifyApi.createPlaylist(userId, {
      name: `MoodMirror - ${mood}`,
      description: `Generated by MoodMirror based on mood: ${mood}`,
      public: false,
    });

    await spotifyApi.addTracksToPlaylist(playlist.body.id, uris);

    return res.json({
      id: playlist.body.id,
      name: playlist.body.name,
      mood,
      playlistUrl: playlist.body.external_urls.spotify,
      tracksAdded: uris.length,
      source: "spotify",
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Spotify playlist creation failed" });
  }
});

// Demo playlist history
app.get("/api/playlists", requireAuth, (req, res) => {
  res.json({ playlists: demoPlaylists.get(req.sessionId) || [] });
});

// -------------------------
// AI mood detection
// -------------------------

// DEMO AI detect (random)
app.get("/api/detect-mood", requireAuth, (req, res) => {
  const moods = ["happy", "sad", "angry", "surprised", "fearful", "disgusted"];
  const detected = moods[Math.floor(Math.random() * moods.length)];
  res.json({ detectedMood: detected, confidence: 0.87, source: "demo-ai" });
});

// REAL AI detect (Node -> Python), fallback to demo-ai if Python down
app.post("/api/detect-mood-real", requireAuth, async (req, res) => {
  try {
    const { imageBase64 } = req.body;
    if (!imageBase64) return res.status(400).json({ error: "imageBase64 is required" });

    const py = await axios.post(
      "http://127.0.0.1:8000/detect",
      { imageBase64 },
      { timeout: 8000 }
    );

    return res.json(py.data);
  } catch (err) {
    console.error("Python detect failed, falling back:", err.message);

    const moods = ["happy", "sad", "angry", "surprised", "fearful", "disgusted"];
    const detected = moods[Math.floor(Math.random() * moods.length)];

    return res.json({
      detectedMood: detected,
      confidence: 0.60,
      source: "fallback-demo-ai",
      note: "Python service unreachable",
    });
  }
});

// -------------------------
// Start server
// -------------------------
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log(`✅ DEMO_MODE=${DEMO_MODE}`);
});
