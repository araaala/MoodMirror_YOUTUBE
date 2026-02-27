import dotenv from "dotenv";
dotenv.config();

import express from "express";
import { google } from "googleapis";

const router = express.Router();

const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";

// ✅ IMPORTANT: Use an exact, stable redirect URI in production
// This MUST match Google Cloud Console exactly.
const PROD_REDIRECT_URI =
  "https://moodmirror-youtube-backend.onrender.com/api/auth/callback";

const DEV_REDIRECT_URI = "http://localhost:5000/api/auth/callback";

const REDIRECT_URI =
  process.env.NODE_ENV === "production" ? PROD_REDIRECT_URI : DEV_REDIRECT_URI;

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  REDIRECT_URI
);

// Minimum scope for creating YouTube playlists etc.
// (Keep it as-is; scopes don't cause invalid_grant.)
const SCOPES = ["https://www.googleapis.com/auth/youtube"];

router.get("/login", (req, res) => {
  const url = oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: SCOPES,
  });

  return res.redirect(url);
});

router.get("/callback", async (req, res) => {
  try {
    const code = req.query.code;

    if (!code) {
      console.error("❌ OAuth callback missing code:", req.query);
      return res.redirect(`${CLIENT_URL}/login?error=missing_code`);
    }

    const { tokens } = await oauth2Client.getToken(code);

    // Store tokens in session
    req.session.tokens = tokens;

    // ✅ CRITICAL: Ensure session is saved BEFORE redirect
    return req.session.save((err) => {
      if (err) {
        console.error("❌ Session save failed:", err);
        return res.redirect(`${CLIENT_URL}/login?error=session_save_failed`);
      }
      return res.redirect(`${CLIENT_URL}/mood`);
    });
  } catch (err) {
    // Log the full useful error (not just message)
    console.error(
      "❌ OAuth callback error:",
      err?.response?.data || err?.message || err
    );
    return res.redirect(`${CLIENT_URL}/login?error=oauth_failed`);
  }
});

router.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.json({ ok: true });
  });
});

router.get("/status", (req, res) => {
  res.json({ loggedIn: !!req.session?.tokens });
});

export default router;