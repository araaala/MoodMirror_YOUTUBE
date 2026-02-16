// server/routes/playlist.js
import express from "express";
import { google } from "googleapis";
import { searchAndRankVideos } from "../utils/rankYoutube.js";

const router = express.Router();

/* ================= CACHE ================= */
const moodCache = {};
const MAX_PLAYLISTS_PER_MOOD = 2;
const playlistStore = {};

/* ================= AUTH ================= */
function requireAuth(req, res, next) {
  if (process.env.DEMO_MODE === "true") return next();
  if (!req.session?.tokens?.access_token) {
    return res.status(401).json({ error: "Not logged in with YouTube" });
  }
  next();
}

function getYoutubeClient(tokens) {
  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
  auth.setCredentials(tokens);
  return google.youtube({ version: "v3", auth });
}

/* ================= GENERATE ================= */
router.post("/generate", requireAuth, async (req, res) => {
  const { mood } = req.body;
  if (!mood) return res.status(400).json({ error: "Missing mood" });

  try {
    let ranked;

    /* ===== CACHE ===== */
    if (moodCache[mood]) {
      ranked = moodCache[mood];
    } else {
      console.log(`🆕 Generating results for mood: ${mood}`);
      ranked = await searchAndRankVideos({
        mood,
        apiKey: process.env.YOUTUBE_API_KEY,
        maxCandidates: 25,
      });

      if (!ranked.length) {
        return res.status(500).json({ error: "No videos found" });
      }

      moodCache[mood] = ranked;
    }

    const chosen = ranked.slice(0, 5);

    /* ===== INIT STORE ===== */
    if (!playlistStore[mood]) {
      playlistStore[mood] = [];
    }

    /* ===== IF ALREADY 2 PLAYLISTS → RETURN RANDOM ONE ===== */
    if (playlistStore[mood].length >= MAX_PLAYLISTS_PER_MOOD) {
      const reused =
        playlistStore[mood][
          Math.floor(Math.random() * playlistStore[mood].length)
        ];

      console.log(`♻️ Returning existing playlist for mood: ${mood}`);

      return res.json({
        playlistId: reused.playlistId,
        items: reused.items,
        reused: true,
      });
    }

    /* ===== CREATE NEW PLAYLIST ===== */
    const youtube = getYoutubeClient(req.session.tokens);

    const playlistRes = await youtube.playlists.insert({
      part: ["snippet", "status"],
      requestBody: {
        snippet: {
          title: `MoodMirror | ${mood.toUpperCase()} (${new Date().toLocaleDateString()})`,
          description: `AI-generated ${mood} playlist created by MoodMirror.`,
        },
        status: { privacyStatus: "unlisted" },
      },
    });

    const playlistId = playlistRes.data.id;

    /* ===== INSERT VIDEOS SAFELY ===== */
    for (const v of chosen) {
      try {
        await youtube.playlistItems.insert({
          part: ["snippet"],
          requestBody: {
            snippet: {
              playlistId,
              resourceId: {
                kind: "youtube#video",
                videoId: v.videoId,
              },
            },
          },
        });
      } catch (insertErr) {
        console.log("⚠️ Skipped video:", v.videoId);
      }
    }

    const formattedItems = chosen.map(v => ({
      videoId: v.videoId,
      title: v.title,
      channel: v.channel,
      thumbnail: v.thumbnail,
    }));

    /* ===== SAVE PLAYLIST ===== */
    playlistStore[mood].push({
      playlistId,
      items: formattedItems,
    });

    console.log(`✅ Created playlist for mood: ${mood}`);

    return res.json({
      playlistId,
      items: formattedItems,
      reused: false,
    });

  } catch (err) {
    console.error("Generate playlist error:", err?.response?.data || err.message);
    return res.status(500).json({ error: "Failed to generate playlist" });
  }
});

export default router;
