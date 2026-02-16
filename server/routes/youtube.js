import express from "express";
import axios from "axios";

const router = express.Router();

/**
 * GET /api/youtube/search?q=happy
 */
router.get("/search", async (req, res) => {
  const q = req.query.q;

  if (!q) {
    return res.status(400).json({ error: "Missing query parameter q" });
  }

  try {
    const response = await axios.get(
      "https://www.googleapis.com/youtube/v3/search",
      {
        params: {
          part: "snippet",
          q: q,
          type: "video",
          maxResults: 10,
          key: process.env.YOUTUBE_API_KEY,
        },
      }
    );

    // Defensive check
    if (!response.data?.items) {
      console.error("YouTube API returned no items:", response.data);
      return res.status(500).json({ error: "Invalid YouTube API response" });
    }

    const items = response.data.items
      .filter((item) => item.id?.videoId)
      .map((item) => ({
        videoId: item.id.videoId,
        title: item.snippet.title,
        channel: item.snippet.channelTitle,
        thumbnail: item.snippet.thumbnails?.medium?.url
          || item.snippet.thumbnails?.high?.url,
      }));

    res.json({ items });

  } catch (error) {
    // 🔥 THIS IS THE IMPORTANT PART
    console.error(
      "YouTube search error:",
      error.response?.data || error.message
    );

    res.status(500).json({
      error: "YouTube search failed",
    });
  }
});

export default router;
