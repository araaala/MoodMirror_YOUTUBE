import axios from "axios";

// Parse ISO 8601 duration (PT3M12S) -> seconds
export function isoDurationToSeconds(iso) {
  if (!iso) return 0;
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  const h = parseInt(match[1] || "0", 10);
  const m = parseInt(match[2] || "0", 10);
  const s = parseInt(match[3] || "0", 10);
  return h * 3600 + m * 60 + s;
}

export function moodQueries(mood) {
  const map = {
    happy: ["feel good pop", "happy hits", "good vibes music", "uplifting songs"],
    sad: ["sad songs", "emotional ballads", "heartbreak songs", "sad pop"],
    angry: ["rage music", "hard rock", "angry rap", "workout rage"],
    fearful: ["dark ambient", "suspense music", "anxiety playlist", "cinematic tension"],
    surprised: ["viral hits", "wow songs", "unexpected drops", "surprise playlist"],
    disgusted: ["heavy metal", "industrial", "dark rock", "intense alternative"],
  };
  return map[mood] || ["music playlist"];
}

export async function searchAndRankVideos({ mood, apiKey, maxCandidates = 25 }) {
  const queries = moodQueries(mood);
  const q = queries[Math.floor(Math.random() * queries.length)];

  // 1) search
  const searchRes = await axios.get("https://www.googleapis.com/youtube/v3/search", {
    params: {
      part: "snippet",
      q,
      type: "video",
      maxResults: maxCandidates,
      safeSearch: "strict",
      key: apiKey,
    },
  });

  const candidates = (searchRes.data.items || [])
    .filter((it) => it?.id?.videoId)
    .map((it) => ({
      videoId: it.id.videoId,
      title: it.snippet.title,
      channel: it.snippet.channelTitle,
      thumbnail:
        it.snippet.thumbnails?.medium?.url || it.snippet.thumbnails?.high?.url,
    }));

  const ids = candidates.map((c) => c.videoId);
  if (ids.length === 0) return [];

  // 2) fetch stats + duration
  const videosRes = await axios.get("https://www.googleapis.com/youtube/v3/videos", {
    params: {
      part: "contentDetails,statistics",
      id: ids.join(","),
      key: apiKey,
    },
  });

  const statsById = new Map();
  for (const v of videosRes.data.items || []) {
    const dur = isoDurationToSeconds(v?.contentDetails?.duration);
    const viewCount = parseInt(v?.statistics?.viewCount || "0", 10);
    const likeCount = parseInt(v?.statistics?.likeCount || "0", 10);
    statsById.set(v.id, { dur, viewCount, likeCount });
  }

  // 3) score
  const moodWords = new Set(
    moodQueries(mood)
      .join(" ")
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean)
  );

  const scored = candidates.map((c) => {
    const st = statsById.get(c.videoId) || { dur: 0, viewCount: 0, likeCount: 0 };

    // Prefer normal song-length videos (2–6 min). Penalize very long / very short.
    const durScore =
      st.dur >= 120 && st.dur <= 360 ? 1.0 : st.dur >= 60 && st.dur <= 600 ? 0.6 : 0.2;

    // Basic title match score
    const title = (c.title || "").toLowerCase();
    let matchScore = 0;
    for (const w of moodWords) {
      if (w.length >= 4 && title.includes(w)) matchScore += 1;
    }

    // Popularity score (log scale)
    const popScore = Math.log10(1 + st.viewCount) + 0.3 * Math.log10(1 + st.likeCount);

    const total = 2.0 * durScore + 0.7 * matchScore + popScore;

    return { ...c, ...st, score: total };
  });

  scored.sort((a, b) => b.score - a.score);

  // Return top N unique
  const top = [];
  const seen = new Set();
  for (const s of scored) {
    if (seen.has(s.videoId)) continue;
    seen.add(s.videoId);
    top.push(s);
    if (top.length >= 15) break;
  }

  return top;
}
