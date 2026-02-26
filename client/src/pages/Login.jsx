export default function Login() {
 const API_BASE = import.meta.env.VITE_SERVER_BASE;

  const handleLogin = () => {
    window.location.href = `${API_BASE}/api/auth/login`;
  };

  return (
    <div className="min-h-screen flex items-center justify-center
      bg-gradient-to-br from-emerald-400 via-cyan-500 to-indigo-500">

      <div className="text-center max-w-xl px-6">
        <img
          src="/moodmirror-logo.png"
          alt="MoodMirror logo"
          className="mx-auto h-60 mb-8 drop-shadow-lg"
        />

        <p className="text-white/80 text-lg mb-10">
          Login with YouTube to generate a playlist that matches your mood.
        </p>

        <button
          onClick={handleLogin}
          className="
            group px-12 py-4 rounded-full text-lg font-bold
            bg-white text-black
            shadow-xl transition-all duration-200
            hover:bg-[#FF0000] hover:text-white
            hover:shadow-[0_20px_40px_rgba(255,0,0,0.45)]
            hover:scale-105
            active:scale-95
          "
        >
          <span className="flex items-center justify-center gap-3">
            {/* YouTube play icon */}
            <svg
              className="w-6 h-6 fill-black group-hover:fill-white transition"
              viewBox="0 0 24 24"
            >
              <path d="M23.498 6.186a3.01 3.01 0 0 0-2.118-2.13C19.505 3.5 12 3.5 12 3.5s-7.505 0-9.38.556A3.01 3.01 0 0 0 .502 6.186 31.35 31.35 0 0 0 0 12a31.35 31.35 0 0 0 .502 5.814 3.01 3.01 0 0 0 2.118 2.13C4.495 20.5 12 20.5 12 20.5s7.505 0 9.38-.556a3.01 3.01 0 0 0 2.118-2.13A31.35 31.35 0 0 0 24 12a31.35 31.35 0 0 0-.502-5.814ZM9.75 15.5v-7l6 3.5-6 3.5Z" />
            </svg>

            Login with YouTube
          </span>
        </button>
      </div>
    </div>
  );
}
