import express from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import Otp from "../models/otp.js";
import generateOtp from "../utils/generateOtp.js";
import { sendOtpEmail } from "../utils/emailService.js";
import User from "../models/user.js";
import { sendLoginEmail } from "../utils/emailService.js";

const router = express.Router();

router.post("/register", async (req, res) => {
  try {
    const { email, password } = req.body;
    const userExists = await User.findOne({ email });
    if (userExists) return res.status(400).json({ message: "User already exists" });

    const newUser = new User({ email, password });
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

    res.json({ message: "Password reset successful" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});
router.post("/login", async (req, res) => {
  try {
    console.log("LOGIN ATTEMPT for:", req.body.email);

    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: "Invalid credentials" });

    const isMatch = await user.comparePassword(password);
    if (!isMatch) return res.status(401).json({ message: "Invalid credentials" });

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
