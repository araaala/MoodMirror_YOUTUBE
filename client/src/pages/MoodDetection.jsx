import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import { moodConfig } from "../utils/moodConfig";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";

/* ================= Mood Button ================= */
function MoodButton({ moodKey, onClick }) {
  const mood = moodConfig[moodKey];

  return (
    <button
      onClick={() => onClick(moodKey)}
      className={[
        "w-full rounded-2xl border-2 border-black",
        "px-6 py-5 md:py-6 flex items-center gap-5",
        "shadow-[0_10px_0_rgba(0,0,0,0.25)]",
        "transition active:translate-y-1 active:shadow-[0_6px_0_rgba(0,0,0,0.25)]",
        mood.color,
      ].join(" ")}
    >
      <span className="text-4xl md:text-5xl">{mood.emoji}</span>
      <span className="text-white text-3xl md:text-4xl font-extrabold drop-shadow">
        {mood.label}
      </span>
    </button>
  );
}

export default function MoodDetection() {
  const navigate = useNavigate();

  /* 🔒 AUTH GUARD — ONLY ADDITION */
  useEffect(() => {
    fetch(`${API_BASE}/api/auth/status`, {
      credentials: "include",
    })
      .then((res) => res.json())
      .then((data) => {
        if (!data.loggedIn) {
          navigate("/login");
        }
      })
      .catch(() => {
        navigate("/login");
      });
  }, [navigate]);

  const handleManualMood = (mood) => {
    navigate("/playlist", {
      state: {
        mood,
        source: "Manual Selection",
      },
    });
  };

  const goFaceDetection = () => {
    navigate("/face-detect");
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-400 via-cyan-500 to-indigo-500" />

      <div className="relative z-10 max-w-8xl mx-auto px-6 py-6">
        <Header step="Mood Detection" />

        <main className="mt-12 grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
          {/* ================= MANUAL ================= */}
          <section>
            <h2 className="text-center text-white/80 text-3xl font-bold mb-6">
              Manual Selection
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-7">
              {Object.keys(moodConfig).map((moodKey) => (
                <MoodButton
                  key={moodKey}
                  moodKey={moodKey}
                  onClick={handleManualMood}
                />
              ))}
            </div>
          </section>

          {/* ================= FACE DETECTION ================= */}
          <section className="flex flex-col items-center">
            <h2 className="text-center text-white/80 text-3xl font-bold mb-8">
              Facial Recognition
            </h2>

            <button
              onClick={goFaceDetection}
              className="group relative w-full max-w-md rounded-3xl
                border-2 border-white/30 bg-white/10 backdrop-blur-md p-10
                hover:bg-white/15 transition shadow-[0_20px_60px_rgba(0,0,0,0.25)]"
            >
              <div className="mx-auto w-56 h-56 flex items-center justify-center">
                <svg viewBox="0 0 256 256" className="w-full h-full">
                  <path
                    d="M56 88V56h32M200 88V56h-32M56 168v32h32M200 168v32h-32"
                    stroke="white"
                    strokeWidth="14"
                    strokeLinecap="round"
                    fill="none"
                  />
                  <path
                    d="M128 84c-24 0-44 20-44 44v16c0 24 20 44 44 44s44-20 44-44v-16c0-24-20-44-44-44Z"
                    fill="white"
                    opacity="0.20"
                  />
                </svg>
              </div>

              <div className="mt-6 text-white text-xl font-semibold">
                Use webcam to detect mood →
              </div>
            </button>
          </section>
        </main>
      </div>
    </div>
  );
}
