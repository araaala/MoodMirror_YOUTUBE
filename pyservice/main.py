# ================= FORCE TENSORFLOW INIT =================
# Prevents DeepFace crash: ModuleNotFoundError: tensorflow.keras

import tensorflow as tf
import tensorflow.keras

print("TensorFlow version:", tf.__version__)

# ================= IMPORTS =================

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import base64
import cv2
import numpy as np
import requests
from deepface import DeepFace

# ================= PRELOAD MODEL =================
# Load DeepFace emotion model once when server starts

print("Loading DeepFace emotion model...")
DeepFace.build_model("Emotion")
print("DeepFace emotion model loaded.")

# ================= FACE DETECTOR =================
face_cascade = cv2.CascadeClassifier(
    cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
)

# ================= APP INIT =================

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ================= MODELS =================

class DetectRequest(BaseModel):
    imageBase64: str


class RecommendRequest(BaseModel):
    mood: str


# ================= HEALTH =================

@app.get("/health")
def health():
    return {"status": "pyservice running"}


# ================= FACE DETECTION =================

@app.post("/detect")
def detect(req: DetectRequest):

    try:
        b64 = req.imageBase64

        # Remove data URL prefix
        if "," in b64:
            b64 = b64.split(",", 1)[1]

        if len(b64) < 100:
            return {
                "detectedMood": "neutral",
                "confidence": 0.4,
                "source": "empty-frame",
            }

        try:
            img_bytes = base64.b64decode(b64)
        except Exception:
            return {
                "detectedMood": "neutral",
                "confidence": 0.4,
                "source": "invalid-base64",
            }

        img_array = np.frombuffer(img_bytes, dtype=np.uint8)
        img_bgr = cv2.imdecode(img_array, cv2.IMREAD_COLOR)

        if img_bgr is None:
            return {
                "detectedMood": "neutral",
                "confidence": 0.4,
                "source": "invalid-image",
            }

        # ================= FACE DETECTION =================

        gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)

        faces = face_cascade.detectMultiScale(
            gray,
            scaleFactor=1.2,
            minNeighbors=5,
            minSize=(60, 60),
        )

        if len(faces) == 0:
            return {
                "detectedMood": "neutral",
                "confidence": 0.4,
                "source": "no-face",
            }

        # Crop first detected face
        x, y, w, h = faces[0]
        face_img = img_bgr[y:y+h, x:x+w]

        face_rgb = cv2.cvtColor(face_img, cv2.COLOR_BGR2RGB)

        # ================= EMOTION DETECTION =================

        result = DeepFace.analyze(
            img_path=face_rgb,
            actions=["emotion"],
            enforce_detection=False,
            detector_backend="opencv",
        )

        if isinstance(result, list):
            result = result[0]

        dominant = result.get("dominant_emotion", "neutral")
        emotions = result.get("emotion", {})

        confidence = float(emotions.get(dominant, 40)) / 100.0

        return {
            "detectedMood": str(dominant),
            "confidence": float(confidence),
            "source": "deepface",
        }

    except Exception as e:
        print("DeepFace error:", str(e))

        return {
            "detectedMood": "neutral",
            "confidence": 0.4,
            "source": "deepface-error",
        }


# ================= YOUTUBE RECOMMEND =================

SERVER_BASE = "http://127.0.0.1:5000"


@app.post("/recommend")
def recommend(req: RecommendRequest):

    queries = {
        "happy": ["happy pop music"],
        "sad": ["sad songs playlist"],
        "angry": ["angry workout music"],
        "calm": ["chill lofi music"],
    }.get(req.mood.lower(), ["top music hits"])

    items = []

    for q in queries:

        r = requests.get(
            f"{SERVER_BASE}/api/youtube/search",
            params={"q": q},
            timeout=10,
        )

        r.raise_for_status()

        items.extend(r.json().get("items", []))

    # Remove duplicates
    seen = set()
    unique = []

    for i in items:
        vid = i.get("videoId")

        if vid and vid not in seen:
            seen.add(vid)
            unique.append(i)

    return {"items": unique[:15]}