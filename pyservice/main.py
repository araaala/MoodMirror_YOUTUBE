from fastapi import FastAPI
from pydantic import BaseModel
import base64
import cv2
import numpy as np

app = FastAPI()

class DetectRequest(BaseModel):
    imageBase64: str

@app.get("/health")
def health():
    return {"status": "pyservice running"}

@app.post("/detect")
def detect(req: DetectRequest):
    # Remove data URL header if present
    b64 = req.imageBase64
    if "," in b64:
        b64 = b64.split(",", 1)[1]

    img_bytes = base64.b64decode(b64)
    img_array = np.frombuffer(img_bytes, dtype=np.uint8)
    img = cv2.imdecode(img_array, cv2.IMREAD_COLOR)

    if img is None:
        return {"error": "Invalid image"}

    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    face_cascade = cv2.CascadeClassifier(
        cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
    )

    faces = face_cascade.detectMultiScale(gray, 1.2, 5)

    if len(faces) == 0:
        return {
            "detectedMood": "neutral",
            "confidence": 0.40,
            "source": "opencv-no-face"
        }

    return {
        "detectedMood": "surprised",
        "confidence": 0.80,
        "source": "opencv-face-detected"
    }
