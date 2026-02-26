import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";

const ALLOWED_MOODS = [
  "happy",
  "sad",
  "angry",
  "fearful",
  "surprised",
  "disgusted",
];


export default function FaceDetection() {
  const navigate = useNavigate();

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const [status, setStatus] = useState("Starting camera...");
  const [apiStatus, setApiStatus] = useState("Checking AI service...");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

 const PY_URL = import.meta.env.VITE_PY_API_BASE;


  useEffect(() => {
    startCamera();
    checkApi();
    return () => stopCamera();
  }, []);

  async function checkApi() {
    try {
      const res = await fetch(`${PY_URL}/health`);
      if (!res.ok) throw new Error();
      setApiStatus("AI service: OK");
    } catch {
      setApiStatus("AI service: NOT REACHABLE");
    }
  }

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      streamRef.current = stream;
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      setStatus("Camera ready");
    } catch {
      setError("Camera permission denied or no webcam found.");
    }
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
  }

  function captureFrame() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !video.videoWidth) return null;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0);
    return canvas.toDataURL("image/jpeg");
  }

  async function handleDetectMood() {
    setLoading(true);
    setError("");

    try {
      const imageBase64 = captureFrame();
      if (!imageBase64) throw new Error("Camera not ready");

      const res = await fetch(`${PY_URL}/detect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64 }),
      });

      if (!res.ok) throw new Error("AI request failed");

      const data = await res.json();
      const rawMood = (data.detectedMood || "").toLowerCase();

      const mood = ALLOWED_MOODS.includes(rawMood)
        ? rawMood
        : "happy"; // fallback to a valid mood


      navigate("/playlist", {
        state: {
          mood,
          confidence: data.confidence ?? null,
          source: "Facial Recognition",
        },
      });
    } catch (e) {
      console.error(e);
      setError("Failed to detect mood. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-500 to-indigo-600">
      <Header step="Face Detection" />

      <div className="flex justify-center mt-4 px-4">
        {/* Dark Focus Panel */}
        <div
          className="w-full max-w-4xl
            bg-black/50 backdrop-blur-md
            rounded-3xl
            p-8 md:p-10
            flex flex-col items-center gap-6
            shadow-2xl"
        >
          {/* Camera */}
          <video
            ref={videoRef}
            className="rounded-2xl w-75px max-w-[750px] bg-black"
            playsInline
            muted
          />
          <canvas ref={canvasRef} className="hidden" />

          {/* CTA */}
          <button
            onClick={handleDetectMood}
            disabled={loading}
            className="px-10 py-4
              bg-green-400 text-black font-bold text-lg
              rounded-full
              hover:scale-105 transition
              disabled:opacity-60"
          >
            {loading ? "Detecting..." : "Detect Mood"}
          </button>

          {/* Status */}
          <div className="text-white/80 text-sm text-center">
            {status} • {apiStatus}
          </div>

          {/* Error */}
          {error && (
            <div className="text-red-300 font-semibold text-sm">
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
