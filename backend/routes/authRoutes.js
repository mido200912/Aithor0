import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";
import User from "../models/User.js";
import sendEmail from "../utils/sendEmail.js";
import { generateOtpEmail } from "../utils/emailTemplate.js";
import { requireAuth } from "../middleware/auth.js";
import { cacheDelete } from "../utils/cache.js";

const router = express.Router();
router.use(cookieParser());

// توليد التوكنات
const generateTokens = (userId) => {
  const accessToken = jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: "15d",
  });
  const refreshToken = jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: "365d",
  });
  return { accessToken, refreshToken };
};

// إرسال الكوكي
const sendRefreshCookie = (res, token) => {
  res.cookie("refreshToken", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
};

// register
router.post("/register", async (req, res) => {
  try {
    let { name, email, password } = req.body;
    email = email?.trim();
    if (!name || !email || !password)
      return res.status(400).json({ error: "Missing fields" });

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email))
      return res.status(400).json({ error: "Invalid email" });

    if (password.length < 8)
      return res.status(400).json({ error: "Password must be at least 8 chars" });

    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ error: "Email already exists" });

    // ⚡ bcrypt rounds 8 = still secure, 4x faster than rounds 10
    const hash = await bcrypt.hash(password, 8);
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    const user = await User.create({ 
      name, 
      email, 
      password: hash,
      otp,
      otpExpires: Date.now() + 10 * 60 * 1000,
      isVerified: false
    });

    try {
      const message = `Your confirmation OTP is: ${otp}\nIt is valid for 10 minutes.`;
      const html = generateOtpEmail(
        "Welcome to Aithor!",
        "Please use the verification code below to complete your registration.",
        otp
      );
      await sendEmail({
        email: user.email,
        subject: "AiThor - Confirm Your Account",
        message,
        html
      });
      console.log(`✅ OTP sent to ${user.email}`); 
    } catch (err) {
      console.error("❌ Email sending failed.", err.message);
      console.log(`⚠️ (Fallback) The OTP for ${user.email} is: ${otp}`);
    }

    res.json({
      message: "OTP sent to email",
      step: "otp_required",
      email: user.email
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// login
router.post("/login", async (req, res) => {
  try {
    let { email, password } = req.body;
    email = email?.trim();
    if (!email || !password)
      return res.status(400).json({ error: "Missing fields" });

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: "Invalid credentials" });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(400).json({ error: "Invalid credentials" });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.otp = otp;
    user.otpExpires = Date.now() + 10 * 60 * 1000;
    await user.save();

    try {
      const message = `Your login OTP is: ${otp}\nIt is valid for 10 minutes.`;
      const html = generateOtpEmail(
        "Login Verification",
        "Please use the verification code below to login to your account.",
        otp
      );
      await sendEmail({
        email: user.email,
        subject: "AiThor - Login OTP",
        message,
        html
      });
      console.log(`✅ OTP sent to ${user.email}`);
    } catch (err) {
      console.error("❌ Email sending failed. Are SMTP credentials set in .env?", err.message);
      console.log(`⚠️ (Fallback) The OTP for ${user.email} is: ${otp}`);
    }

    res.json({
      message: "OTP sent to email",
      step: "otp_required",
      email: user.email
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// verify-otp
router.post("/verify-otp", async (req, res) => {
  try {
    let { email, otp } = req.body;
    email = email?.trim();
    if (!email || !otp) return res.status(400).json({ error: "Missing email or OTP" });

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: "Invalid request" });

    if (!user.otp || user.otp !== otp) {
      return res.status(400).json({ error: "Invalid OTP" });
    }

    if (user.otpExpires < Date.now()) {
      return res.status(400).json({ error: "OTP has expired. Please login again." });
    }

    user.otp = undefined;
    user.otpExpires = undefined;
    user.isVerified = true;
    await user.save();

    const { accessToken, refreshToken } = generateTokens(user._id);
    sendRefreshCookie(res, refreshToken);

    res.json({
      user: { id: user._id, name: user.name, email: user.email },
      token: accessToken,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// forgot-password
router.post("/forgot-password", async (req, res) => {
  try {
    let { email } = req.body;
    email = email?.trim();
    if (!email) return res.status(400).json({ error: "Missing email" });

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: "Email not found" });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.otp = otp;
    user.otpExpires = Date.now() + 10 * 60 * 1000;
    await user.save();

    try {
      const message = `Your password reset OTP is: ${otp}\nIt is valid for 10 minutes.`;
      const html = generateOtpEmail(
        "Password Reset Request",
        "Please use the verification code below to reset your password.",
        otp
      );
      await sendEmail({
        email: user.email,
        subject: "AiThor - Password Reset OTP",
        message,
        html
      });
      console.log(`✅ Reset OTP sent to ${user.email}`);
    } catch (err) {
      console.error("❌ Email sending failed.", err.message);
      console.log(`⚠️ (Fallback) Reset OTP for ${user.email} is: ${otp}`);
    }

    res.json({ message: "OTP sent", step: "otp_required", email: user.email });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// reset-password
router.post("/reset-password", async (req, res) => {
  try {
    let { email, otp, newPassword } = req.body;
    email = email?.trim();
    if (!email || !otp || !newPassword) return res.status(400).json({ error: "Missing fields" });
    if (newPassword.length < 8) return res.status(400).json({ error: "Password must be at least 8 chars" });

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: "Invalid request" });

    if (!user.otp || user.otp !== otp) return res.status(400).json({ error: "Invalid OTP" });
    if (user.otpExpires < Date.now()) return res.status(400).json({ error: "OTP expired" });

    // ⚡ bcrypt rounds 8
    const hash = await bcrypt.hash(newPassword, 8);
    user.password = hash;
    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save();

    res.json({ message: "Password updated successfully. You can now login." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// change-password (from inside dashboard)
router.post("/change-password", requireAuth, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) return res.status(400).json({ error: "Missing fields" });
    if (newPassword.length < 8) return res.status(400).json({ error: "New password must be at least 8 chars" });

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: "User not found" });

    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) return res.status(400).json({ error: "Incorrect old password" });

    // ⚡ bcrypt rounds 8
    const hash = await bcrypt.hash(newPassword, 8);
    user.password = hash;
    await user.save();

    res.json({ message: "Password changed successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// refresh
router.post("/refresh", (req, res) => {
  try {
    const token = req.cookies.refreshToken;
    if (!token) return res.status(401).json({ error: "No token" });

    jwt.verify(token, process.env.JWT_REFRESH_SECRET, (err, decoded) => {
      if (err) return res.status(403).json({ error: "Invalid refresh token" });

      const { accessToken, refreshToken } = generateTokens(decoded.id);
      sendRefreshCookie(res, refreshToken);
      res.json({ accessToken });
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// logout
router.post("/logout", (req, res) => {
  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  });
  res.json({ message: "Logged out" });
});

// Google Login/Register (Optimized Error Handling)
router.post("/google-login", async (req, res) => {
  try {
    const { idToken } = req.body;
    if (!idToken) return res.status(400).json({ error: "Missing ID Token" });

    // ✅ verify token with google-auth-library
    let email, name, googleId, picture;
    try {
      const { OAuth2Client } = await import('google-auth-library');
      const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
      const ticket = await client.verifyIdToken({
        idToken,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      const payload = ticket.getPayload();
      email = payload.email;
      name = payload.name;
      googleId = payload.sub;
      picture = payload.picture;
    } catch (e) {
      console.error("Google Token Verification Failed:", e.message);
      return res.status(400).json({ error: "Invalid Google token", details: e.message });
    }

    // Try to find or create user - this is where Firestore might fail
    let user;
    try {
      user = await User.findOne({ email });
      let isNew = false;

      if (user) {
        if (!user.googleId) {
          user.googleId = googleId;
          cacheDelete(`user:${user._id}`);
          await user.save();
        }
      } else {
        isNew = true;
        user = await User.create({ name, email, googleId, isVerified: true });
      }

      const { accessToken, refreshToken } = generateTokens(user._id);
      sendRefreshCookie(res, refreshToken);

      return res.json({
        user: { id: user._id, name: user.name, email: user.email, picture },
        token: accessToken,
        isNew
      });

    } catch (dbErr) {
      console.error("Database error during Google login:", dbErr.message);
      return res.status(500).json({ error: "Database error", details: dbErr.message });
    }

  } catch (err) {
    console.error("Unexpected Google login error:", err.message);
    res.status(500).json({ error: "Internal server error", details: err.message });
  }
});

export default router;
