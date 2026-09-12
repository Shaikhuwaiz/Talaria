import express from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { OAuth2Client } from "google-auth-library";
import { generateSecret, generateURI, verify as verifyTOTP } from "otplib";
import QRCode from "qrcode";
import Otp from "../models/otp.js";
import generateOtp from "../utils/generateOtp.js";
import { sendOtpEmail } from "../utils/emailService.js";
import User from "../models/user.js";
import { sendLoginEmail } from "../utils/emailService.js";
import { sendPasswordResetSuccessEmail } from "../utils/emailService.js";

const router = express.Router();

// Build an otpauth:// URI Google Authenticator can scan
const totpKeyUri = (email, secret) =>
  generateURI({ issuer: "Talaria", label: email, secret });

// Case-insensitive, whitespace-tolerant email lookup
const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const findUserByEmail = (email) =>
  User.findOne({
    email: new RegExp(`^${escapeRegExp(String(email).trim())}$`, "i"),
  });

// Require a valid JWT in the Authorization header and set req.userId.
const authRequired = (req, res, next) => {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ message: "Not authenticated" });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = payload.id;
    next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

// ✅ Sign in with a Google ID token (Google Identity Services JS flow)
router.post("/google", async (req, res) => {
  try {
    const { credential } = req.body;
    const clientId = process.env.GOOGLE_CLIENT_ID;

    if (!credential || !clientId) {
      return res
        .status(400)
        .json({ message: "Google sign-in is not configured" });
    }

    let payload;
    try {
      const client = new OAuth2Client(clientId);
      const ticket = await client.verifyIdToken({
        idToken: credential,
        audience: clientId,
      });
      payload = ticket.getPayload();
    } catch (err) {
      console.error("GOOGLE TOKEN ERROR:", err);
      return res.status(401).json({ message: "Invalid Google token" });
    }

    if (!payload?.email) {
      return res.status(400).json({ message: "Google account has no email" });
    }

    let user = await User.findOne({ email: payload.email });
    let created = false;
    if (!user) {
      user = new User({
        email: payload.email,
        name: payload.name || "",
        password: crypto.randomBytes(32).toString("hex"),
      });
      await user.save();
      created = true;
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    res.json({ message: "Login successful", token, created, email: user.email, name: user.name || "" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Build which base URL OAuth callbacks should land on. The callback must hit
// this backend directly (not the SPA host), so it uses API_URL / FRONTEND_URL.
const apiBase = () =>
  process.env.API_URL ||
  process.env.FRONTEND_URL ||
  "http://localhost:5173";

// ✅ Google OAuth step 1: bounce the browser to Google (redirect flow, works in incognito)
router.get("/google/redirect", (req, res) => {
  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } = process.env;
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    return res.status(400).send("Google sign-in is not configured");
  }

  const redirectUri = `${apiBase()}/api/auth/callback/google`;
  const url =
    "https://accounts.google.com/o/oauth2/v2/auth" +
    `?client_id=${encodeURIComponent(GOOGLE_CLIENT_ID)}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    "&response_type=code" +
    "&scope=openid%20email%20profile" +
    "&access_type=offline" +
    "&prompt=select_account";
  res.redirect(url);
});

// ✅ Google OAuth step 2: exchange the code, mint our JWT, bounce back to the app
router.get("/callback/google", async (req, res) => {
  try {
    const { code } = req.query;
    const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, FRONTEND_URL } = process.env;
    if (!code) {
      const loginUrl = FRONTEND_URL || "http://localhost:5173";
      return res.redirect(`${loginUrl}/login?error=google_callback_incomplete`);
    }
    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
      return res.status(400).send("Google OAuth is not configured");
    }

    const redirectUri = `${apiBase()}/api/auth/callback/google`;

    // Exchange the authorization code for an access token
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });
    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) {
      return res
        .status(400)
        .send(
          `Google token exchange failed: ${
            tokenData.error_description || tokenData.error || "unknown error"
          }`
        );
    }

    // Fetch the Google profile
    const profileRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const profile = await profileRes.json();
    if (!profile.email) {
      return res.status(400).send("Could not resolve a Google email");
    }

    let user = await User.findOne({ email: profile.email });
    if (!user) {
      user = new User({
        email: profile.email,
        name: profile.name || "",
        password: crypto.randomBytes(32).toString("hex"),
      });
      await user.save();
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    const frontendUrl = FRONTEND_URL || "http://localhost:5173";
    res.redirect(
      `${frontendUrl}/login?google_token=${token}` +
        `&email=${encodeURIComponent(profile.email)}` +
        `&name=${encodeURIComponent(user.name || "")}`
    );
  } catch (err) {
    console.error("GOOGLE OAUTH ERROR:", err);
    res.status(500).send("Google sign-in failed");
  }
});

// ✅ GitHub OAuth step 1: bounce the browser to GitHub
router.get("/github", (req, res) => {
  const clientId = process.env.GITHUB_CLIENT_ID;
  if (!clientId) return res.status(400).send("GitHub sign-in is not configured");

  const redirectUri = `${apiBase()}/api/auth/callback/github`;
  const url =
    "https://github.com/login/oauth/authorize" +
    `?client_id=${encodeURIComponent(clientId)}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    "&scope=read:user%20user:email";
  res.redirect(url);
});

// ✅ GitHub OAuth step 2: exchange the code, mint our JWT, bounce back to the app
router.get("/callback/github", async (req, res) => {
  try {
    const { code } = req.query;
    const clientId = process.env.GITHUB_CLIENT_ID;
    const clientSecret = process.env.GITHUB_CLIENT_SECRET;
    if (!code) {
      const loginUrl = process.env.FRONTEND_URL || "http://localhost:5173";
      return res.redirect(`${loginUrl}/login?error=github_callback_incomplete`);
    }
    if (!clientId || !clientSecret) {
      return res.status(400).send("GitHub OAuth is not configured (missing client secret)");
    }

    const redirectUri = `${apiBase()}/api/auth/callback/github`;

    // Exchange the authorization code for an access token
    const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
      }),
    });
    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) {
      return res
        .status(400)
        .send(
          `GitHub token exchange failed: ${
            tokenData.error_description || tokenData.error || "unknown error"
          }`
        );
    }

    // Fetch the GitHub profile (and a verified primary email if needed)
    const ghRes = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        "User-Agent": "talaria-freight",
        Accept: "application/vnd.github+json",
      },
    });
    const gh = await ghRes.json();

    let email = gh.email;
    if (!email && gh.id) {
      const emailsRes = await fetch("https://api.github.com/user/emails", {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
          "User-Agent": "talaria-freight",
          Accept: "application/vnd.github+json",
        },
      });
      const emails = await emailsRes.json();
      const primary = Array.isArray(emails) && emails.find(
        (e) => e.primary && e.verified
      );
      email = primary?.email || (Array.isArray(emails) ? emails[0]?.email : undefined);
    }
    if (!email) return res.status(400).send("Could not resolve a GitHub email");

    let user = await User.findOne({ email });
    if (!user) {
      user = new User({
        email,
        name: gh.name || gh.login || "",
        password: crypto.randomBytes(32).toString("hex"),
      });
      await user.save();
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    res.redirect(
      `${frontendUrl}/login?github_token=${token}` +
        `&email=${encodeURIComponent(email)}` +
        `&name=${encodeURIComponent(user.name || "")}`
    );
  } catch (err) {
    console.error("GITHUB OAUTH ERROR:", err);
    res.status(500).send("GitHub sign-in failed");
  }
});

// ✅ Two-factor: request the enable-2FA OTP (emailed to the user)
router.post("/2fa/request", authRequired, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ message: "User not found" });
    if (user.twoFactorEnabled) {
      return res
        .status(400)
        .json({ message: "Two-factor authentication is already enabled" });
    }

    await Otp.deleteMany({ email: user.email, purpose: "ENABLE_2FA" });
    const otp = generateOtp();
    await Otp.create({
      email: user.email,
      otp,
      purpose: "ENABLE_2FA",
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    });
    await sendOtpEmail(user.email, otp, {
      subject: "Verify Two-Factor Authentication – Talaria",
      heading: "Talaria Two-Factor Setup",
    });

    res.json({ sent: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// ✅ Two-factor: confirm the enable OTP and turn 2FA on
router.post("/2fa/enable", authRequired, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const { otp } = req.body;
    const record = await Otp.findOne({
      email: user.email,
      otp,
      purpose: "ENABLE_2FA",
    });
    if (!record) {
      return res.status(400).json({ message: "Invalid or expired code" });
    }

    user.twoFactorEnabled = true;
    user.twoFactorMethod = "email";
    user.totpSecret = "";
    await user.save();
    await Otp.deleteMany({ email: user.email, purpose: "ENABLE_2FA" });

    res.json({ twoFactorEnabled: true, twoFactorMethod: "email" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// ✅ Two-factor (Google Authenticator / TOTP): generate a secret + QR
router.post("/2fa/totp/setup", authRequired, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ message: "User not found" });
    if (user.twoFactorEnabled) {
      return res
        .status(400)
        .json({ message: "Two-factor authentication is already enabled" });
    }

    const secret = generateSecret();
    user.totpSecret = secret;
    await user.save({ validateModifiedOnly: true });

    const otpauthUrl = totpKeyUri(user.email, secret);
    const qrCodeUrl = await QRCode.toDataURL(otpauthUrl);

    res.json({ secret, otpauthUrl, qrCodeUrl });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// ✅ Two-factor (TOTP): confirm a code from the authenticator app
router.post("/2fa/totp/verify", authRequired, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ message: "User not found" });
    if (user.twoFactorEnabled) {
      return res
        .status(400)
        .json({ message: "Two-factor authentication is already enabled" });
    }

    const { code } = req.body;
    const codeStr = String(code || "").replace(/\s/g, "");
    if (!user.totpSecret) {
      return res.status(400).json({ message: "Start TOTP setup first" });
    }
    const valid = (
      await verifyTOTP({
        token: codeStr,
        secret: user.totpSecret,
        epochTolerance: 30,
      })
    ).valid;
    if (!valid) {
      return res.status(400).json({ message: "Invalid code" });
    }

    user.twoFactorEnabled = true;
    user.twoFactorMethod = "totp";
    await user.save({ validateModifiedOnly: true });

    res.json({ twoFactorEnabled: true, twoFactorMethod: "totp" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// ✅ Two-factor: turn 2FA off
router.post("/2fa/disable", authRequired, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.twoFactorEnabled = false;
    user.twoFactorMethod = "";
    user.totpSecret = "";
    await user.save({ validateModifiedOnly: true });
    await Otp.deleteMany({ email: user.email, purpose: "LOGIN_2FA" });
    await Otp.deleteMany({ email: user.email, purpose: "ENABLE_2FA" });

    res.json({ twoFactorEnabled: false });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// ✅ Login via code: send/resend the email 2FA code (login page's method picker)
router.post("/2fa/send-code", async (req, res) => {
  try {
    const { email } = req.body;
    const user = await findUserByEmail(email);
    if (!user || !user.twoFactorEnabled) {
      return res
        .status(400)
        .json({ message: "Two-factor authentication is not enabled for this account" });
    }

    await Otp.deleteMany({ email: user.email, purpose: "LOGIN_2FA" });
    const otp = generateOtp();
    await Otp.create({
      email: user.email,
      otp,
      purpose: "LOGIN_2FA",
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    });
    await sendOtpEmail(user.email, otp, {
      subject: "Your Talaria login code",
      heading: "Talaria Sign-in Code",
    });

    res.json({ message: "Code sent" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// ✅ Login step 2: verify the 2FA code (email OTP or Google Authenticator) and return the JWT
router.post("/login-2fa", async (req, res) => {
  try {
    const { email, otp, method } = req.body;

    const user = await findUserByEmail(email);
    if (!user) return res.status(401).json({ message: "User not found" });

    let valid = false;
    if (user.totpSecret && method !== "email") {
      // TOTP (Google Authenticator) mode
      valid = (
        await verifyTOTP({
          token: String(otp || "").replace(/\s/g, ""),
          secret: user.totpSecret,
          epochTolerance: 30,
        })
      ).valid;
    } else {
      // Email OTP mode (lookup keyed by the stored email)
      const record = await Otp.findOne({
        email: user.email,
        otp,
        purpose: "LOGIN_2FA",
      });
      valid = !!record;
      if (valid) await Otp.deleteMany({ email: user.email, purpose: "LOGIN_2FA" });
    }

    if (!valid) {
      return res.status(400).json({ message: "Invalid or expired code" });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });
    res.json({ message: "Login successful", token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// ✅ Profile: get the current user
router.get("/me", authRequired, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({
      name: user.name || "",
      email: user.email,
      joined: user.createdAt || user._id.getTimestamp(),
      twoFactorEnabled: user.twoFactorEnabled || false,
      twoFactorMethod: user.twoFactorEnabled ? user.twoFactorMethod || "email" : "",
    });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// ✅ Profile: update name/email and optionally change the password
router.put("/me", authRequired, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const { name, email, currentPassword, newPassword } = req.body;

    if (newPassword) {
      const ok = await user.comparePassword(currentPassword || "");
      if (!ok) {
        return res.status(400).json({ message: "Current password is incorrect" });
      }
      if (String(newPassword).length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters" });
      }
    }

    if (typeof name === "string" && name.trim()) user.name = name.trim();
    if (typeof email === "string" && email.trim()) {
      const exists = await User.findOne({
        email: email.trim().toLowerCase(),
        _id: { $ne: user._id },
      });
      if (exists) return res.status(400).json({ message: "Email already in use" });
      user.email = email.trim().toLowerCase();
    }
    if (newPassword) user.password = newPassword; // hashed by the model pre-save

    await user.save();
    res.json({
      name: user.name || "",
      email: user.email,
      joined: user.createdAt || user._id.getTimestamp(),
      twoFactorEnabled: user.twoFactorEnabled || false,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/register", async (req, res) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = String(email).trim().toLowerCase();
    const userExists = await findUserByEmail(normalizedEmail);
    if (userExists) return res.status(400).json({ message: "User already exists" });

    const newUser = new User({ email: normalizedEmail, password });
    await newUser.save();
    res.status(201).json({ message: "User registered successfully" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user)
      return res.status(404).json({ message: "User not found" });

    // remove old OTPs
    await Otp.deleteMany({ email, purpose: "FORGOT_PASSWORD" });

    const otp = generateOtp();

    await Otp.create({
      email,
      otp,
      purpose: "FORGOT_PASSWORD",
      expiresAt: new Date(Date.now() + 5 * 60 * 1000)
    });

    await sendOtpEmail(email, otp);

    res.json({ message: "OTP sent to email" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});
router.post("/verify-otp", async (req, res) => {
  try {
    const { email, otp } = req.body;

    const record = await Otp.findOne({
      email,
      otp,
      purpose: "FORGOT_PASSWORD"
    });

    if (!record)
      return res.status(400).json({ message: "Invalid or expired OTP" });

    res.json({ verified: true });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});
router.post("/reset-password", async (req, res) => {
  try {
    const { email, newPassword } = req.body;

    const user = await User.findOne({ email });
    if (!user)
      return res.status(404).json({ message: "User not found" });

    user.password = newPassword; // bcrypt handled in model
    await user.save();

    await Otp.deleteMany({ email, purpose: "FORGOT_PASSWORD" });

 await sendPasswordResetSuccessEmail(email);

    res.json({ message: "Password reset successful" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});
router.post("/login", async (req, res) => {
  try {
    console.log("LOGIN ATTEMPT for:", req.body.email);

    const { email, password } = req.body;

    const user = await findUserByEmail(email);
    if (!user) return res.status(401).json({ message: "Invalid credentials" });

    const isMatch = await user.comparePassword(password);
    if (!isMatch) return res.status(401).json({ message: "Invalid credentials" });

    // Two-factor enabled → require a code (authenticator app if a TOTP secret
    // exists, otherwise email OTP). Keeps /login in sync with /login-2fa.
    if (user.twoFactorEnabled) {
      const method = user.totpSecret ? "totp" : "email";
      if (method === "email") {
        await Otp.deleteMany({ email: user.email, purpose: "LOGIN_2FA" });
        const otp = generateOtp();
        await Otp.create({
          email: user.email,
          otp,
          purpose: "LOGIN_2FA",
          expiresAt: new Date(Date.now() + 5 * 60 * 1000),
        });
        await sendOtpEmail(user.email, otp, {
          subject: "Your Talaria login code",
          heading: "Talaria Sign-in Code",
        });
      }
      return res.status(200).json({
        message:
          method === "totp"
            ? "Enter the code from your authenticator app"
            : "Verification code sent to your email",
        twoFactorRequired: true,
        twoFactorMethod: method,
      });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    sendLoginEmail(email);

    res.status(200).json({ message: "Login successful", token });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
