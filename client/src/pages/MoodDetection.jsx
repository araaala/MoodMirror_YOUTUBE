import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import { moodConfig } from "../utils/moodConfig";

const API_BASE = import.meta.env.VITE_SERVER_BASE;

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

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [authOk, setAuthOk] = useState(false);

  const [showPrivacyModal, setShowPrivacyModal] = useState(false);

  /* ================= AUTH CHECK ================= */
useEffect(() => {
  const checkAuth = async () => {
    try {
      const params = new URLSearchParams(window.location.search);

      // If we just returned from OAuth, trust it once
      if (params.get("auth") === "success") {
        console.log("OAuth redirect confirmed");
        setAuthOk(true);
        setCheckingAuth(false);

        // remove query param so refresh works cleanly
        window.history.replaceState({}, "", "/mood");
        return;
      }

      const res = await fetch(`${API_BASE}/api/auth/status`, {
        credentials: "include",
      });

      const data = await res.json();

      console.log("Auth status:", data);

      if (!data.loggedIn) {
        navigate("/login");
        return;
      }

      setAuthOk(true);
    } catch (err) {
      console.error("Auth check failed:", err);
      navigate("/login");
    } finally {
      setCheckingAuth(false);
    }
  };

  checkAuth();
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
    setShowPrivacyModal(true);
  };

  const acceptPrivacy = () => {
    setShowPrivacyModal(false);
    navigate("/face-detect");
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        Checking session...
      </div>
    );
  }

  if (!authOk) return null;

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
                </svg>
              </div>

              <div className="mt-6 text-white text-xl font-semibold">
                Use webcam to detect mood →
              </div>
            </button>
          </section>

        </main>
      </div>

      {/* ================= DATA PRIVACY MODAL ================= */}
      {showPrivacyModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-6">
          <div className="bg-white max-w-lg rounded-2xl p-8 shadow-2xl">

            <h2 className="text-xl font-bold mb-4 text-gray-800">
              Data Privacy Notice
            </h2>

            <p className="text-sm text-gray-600 leading-relaxed mb-6">
              MoodMirror uses your device camera to analyze facial expressions
              in order to detect emotional states and recommend music playlists.
              <br /><br />
              No facial images are stored or transmitted to external databases.
              The captured image is processed temporarily for emotion detection
              and immediately discarded after analysis.
            </p>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowPrivacyModal(false)}
                className="px-4 py-2 bg-gray-300 rounded-lg"
              >
                Cancel
              </button>

              <button
                onClick={acceptPrivacy}
                className="px-4 py-2 bg-green-500 text-white rounded-lg"
              >
                I Agree
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}