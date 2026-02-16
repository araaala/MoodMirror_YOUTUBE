import dotenv from "dotenv";
dotenv.config();

import express from "express";
import { google } from "googleapis";

const router = express.Router();

const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";
const SERVER_BASE = process.env.SERVER_BASE || "http://localhost:5000";

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  `${SERVER_BASE}/api/auth/callback`
);

const SCOPES = ["https://www.googleapis.com/auth/youtube"];

router.get("/login", (req, res) => {
  const url = oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: SCOPES,
  });

  res.redirect(url);
});

router.get("/callback", async (req, res) => {
  try {
    const code = req.query.code;
    const { tokens } = await oauth2Client.getToken(code);

    req.session.tokens = tokens;

    // ✅ Redirect to mood detection AFTER login
    res.redirect(`${CLIENT_URL}/mood`);
  } catch (err) {
    console.error("OAuth callback error:", err.message);
    res.redirect(`${CLIENT_URL}/login?error=oauth_failed`);
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
