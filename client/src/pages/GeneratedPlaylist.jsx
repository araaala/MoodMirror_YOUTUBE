import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import Header from "../components/Header";
import { moodConfig } from "../utils/moodConfig";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";

export default function GeneratedPlaylist() {
  const { state } = useLocation();

  const rawMood = state?.mood || "happy";
  const confidence = state?.confidence ?? null;
  const source = state?.source || "Mood Selection";
  const safeMood = rawMood.toLowerCase();

  const moodData =
    moodConfig[safeMood] || {
      label: safeMood,
      emoji: "🎵",
      textColor: "text-white",
    };

  const [playlistId, setPlaylistId] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const hasGenerated = useRef(false); // 🔥 prevents double call

  const embedSrc = useMemo(() => {
    if (!playlistId) return "";
    return `https://www.youtube.com/embed/videoseries?list=${playlistId}&autoplay=1`;
  }, [playlistId]);

  async function generatePlaylist() {
    if (loading) return;

    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${API_BASE}/api/playlist/generate`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mood: safeMood }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed");

      setPlaylistId(data.playlistId);
      setItems(data.items || []);
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!hasGenerated.current) {
      hasGenerated.current = true;
      generatePlaylist();
    }
  }, [safeMood]);

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-500 via-cyan-500 to-indigo-500" />

      <div className="relative z-10">
        <Header step="Playlist Result" />
      </div>

      <div className="relative z-10 px-6 max-w-6xl mx-auto">
        <div className="mt-10 flex items-center gap-6">
          <div className="text-7xl">{moodData.emoji}</div>
          <div>
            <h1 className={`text-6xl font-extrabold ${moodData.textColor}`}>
              {moodData.label}
            </h1>
            <p className="mt-2 text-white/70 text-sm">
              Source: {source}
              {confidence !== null && ` · ${(confidence * 100).toFixed(1)}%`}
            </p>
          </div>
        </div>

        {error && (
          <div className="mt-6 bg-black/40 text-white px-4 py-2 rounded-xl">
            ⚠️ {error}
          </div>
        )}

        <div className="mt-8 bg-black/40 rounded-2xl p-4">
          {playlistId ? (
  <div className="flex flex-col items-center gap-6">
    <iframe
      title="YouTube Player"
      src={embedSrc}
      width="100%"
      height="420"
      allow="autoplay; encrypted-media"
      allowFullScreen
      className="rounded-xl"
    />

    {/* 🔴 Open in YouTube Button */}
    <a
      href={`https://www.youtube.com/playlist?list=${playlistId}`}
      target="_blank"
      rel="noopener noreferrer"
      className="px-8 py-3 bg-red-600 hover:bg-red-700 
                 text-white font-bold rounded-full 
                 shadow-lg transition hover:scale-105"
    >
      🔴 Open in YouTube
    </a>
  </div>
          ) : (
            <div className="text-white/70 text-center py-20">
              {loading ? "Creating playlist..." : "No playlist available."}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
