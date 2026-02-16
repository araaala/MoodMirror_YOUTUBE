import { Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Login from "./pages/Login";
import MoodDetection from "./pages/MoodDetection";
import GeneratedPlaylist from "./pages/GeneratedPlaylist";
import FaceDetection from "./pages/FaceDetection";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/mood" element={<MoodDetection />} />
      <Route path="/face-detect" element={<FaceDetection />} />
      <Route path="/playlist" element={<GeneratedPlaylist />} />
    </Routes>
  );
}

export default App;
