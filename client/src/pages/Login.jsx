import React from "react";

export default function Login() {
  const handleLogin = () => {
    // keep your existing login link here
    window.location.href = "http://localhost:5000/auth/login";
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6
      bg-gradient-to-r from-[#3fd49b] via-[#55b7ff] to-[#6a6aff]">
      
      {/* Glass card */}
      <div className="w-full max-w-4xl rounded-3xl bg-white/15 backdrop-blur-xl
        border border-white/20 shadow-2xl p-10 sm:p-14 text-center">

        {/* Logo placeholder */}
        <div className="mb-6 flex justify-center">
          {/* Replace this with your photo logo later */}
          <img
            src="/src/assets/moodmirror_logo.png"
            alt="MoodMirror logo"
            className="h-40 w-40 object-contain"
          />

        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold text-white drop-shadow">
          Welcome to MoodMirror
        </h1>

        <p className="mt-4 text-white/80 text-base sm:text-lg">
          Detect your mood and get a personalized playlist instantly 🎶
        </p>

        <button
          onClick={handleLogin}
          className="mt-10 px-12 py-4 rounded-full font-bold text-lg
            bg-[#1DB954] hover:bg-[#1ed760] text-black shadow-xl
            transition active:scale-[0.98]"
        >
          LOGIN
        </button>
      </div>
    </div>
  );
}
