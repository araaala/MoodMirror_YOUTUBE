// server/routes/auth.js
import dotenv from "dotenv";
dotenv.config();

import express from "express";
import { google } from "googleapis";

const router = express.Router();

const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";

const PROD_REDIRECT_URI =
  "https://moodmirror-youtube-backend.onrender.com/api/auth/callback";
const DEV_REDIRECT_URI = "http://localhost:5000/api/auth/callback";

const REDIRECT_URI =
  process.env.NODE_ENV === "production" ? PROD_REDIRECT_URI : DEV_REDIRECT_URI;

const SCOPES = ["https://www.googleapis.com/auth/youtube"];

function createOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    REDIRECT_URI
  );
}

/* ================= LOGIN ================= */
router.get("/login", (req, res) => {
  // ✅ Force session cookie to be issued before leaving to Google
  req.session.oauthStart = Date.now();

  req.session.save((saveErr) => {
    if (saveErr) {
      console.error("❌ Session pre-save failed:", saveErr);
      return res.redirect(`${CLIENT_URL}/login?error=session_presave_failed`);
    }

    const oauth2Client = createOAuthClient();

    const url = oauth2Client.generateAuthUrl({
      access_type: "offline",
      prompt: "consent",
      scope: SCOPES,
    });

    return res.redirect(url);
  });
});

/* ================= CALLBACK ================= */
router.get("/callback", async (req, res) => {
  try {
    const code = req.query.code;

    if (!code) {
      console.error("❌ OAuth callback missing code:", req.query);
      return res.redirect(`${CLIENT_URL}/login?error=missing_code`);
    }

    const oauth2Client = createOAuthClient();
    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens) {
      console.error("❌ No tokens returned from Google.");
      return res.redirect(`${CLIENT_URL}/login?error=no_tokens`);
    }

    // ✅ Store tokens in session
    req.session.tokens = tokens;

    // ✅ Ensure session is saved before redirect
    req.session.save((err) => {
      if (err) {
        console.error("❌ Session save failed:", err);
        return res.redirect(`${CLIENT_URL}/login?error=session_save_failed`);
      }
      return res.redirect(`${CLIENT_URL}/mood`);
    });
  } catch (err) {
    console.error("❌ OAuth callback error:", err?.response?.data || err?.message || err);
    return res.redirect(`${CLIENT_URL}/login?error=oauth_failed`);
  }
});

/* ================= LOGOUT ================= */
router.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.json({ ok: true });
  });
});

/* ================= STATUS ================= */
router.get("/status", (req, res) => {
  res.json({ loggedIn: !!req.session?.tokens });
});

export default router;