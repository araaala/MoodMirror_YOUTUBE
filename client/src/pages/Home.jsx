import { useEffect, useRef, useState } from "react";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";

export default function Home() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const [cameraReady, setCameraReady] = useState(false);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // Start webcam on page load
  useEffect(() => {
    async function startCam() {
      try {
        setErr("");
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setCameraReady(true);
        }
      } catch (e) {
        setErr("Camera permission denied or no webcam found.");
      }
    }
    startCam();

    // stop webcam when leaving page
    return () => {
      const v = videoRef.current;
      if (v?.srcObject) {
        v.srcObject.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  function captureBase64() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return null;

    const w = video.videoWidth;
    const h = video.videoHeight;
    if (!w || !h) return null;

    canvas.width = w;
    canvas.height = h;
    canvas.getContext("2d").drawImage(video, 0, 0, w, h);

    return canvas.toDataURL("image/jpeg", 0.9); // data:image/jpeg;base64,...
  }

  async function detectMoodReal() {
    try {
      setLoading(true);
      setErr("");
      setResult(null);

      const imageBase64 = captureBase64();
      if (!imageBase64) {
        setErr("Camera not ready yet. Wait 1–2 seconds and try again.");
        return;
      }

      const res = await fetch(`${API_BASE}/api/detect-mood-real`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include", // IMPORTANT: sends session cookie
        body: JSON.stringify({ imageBase64 }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Detect failed");

      setResult(data);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: 24 }}>
      <h1>Home</h1>

      <p><b>Face Detection (Real AI)</b></p>

      {err && <p style={{ color: "crimson" }}>{err}</p>}

      <video
        ref={videoRef}
        style={{ width: 420, border: "1px solid #ccc", borderRadius: 8 }}
        playsInline
        muted
      />

      <div style={{ marginTop: 12 }}>
        <button disabled={!cameraReady || loading} onClick={detectMoodReal}>
          {loading ? "Detecting..." : "Detect Mood (Real)"}
        </button>
      </div>

      <canvas ref={canvasRef} style={{ display: "none" }} />

      {result && (
        <pre style={{ marginTop: 16, background: "#f6f6f6", padding: 12 }}>
{JSON.stringify(result, null, 2)}
        </pre>
      )}
    </div>
  );
}
