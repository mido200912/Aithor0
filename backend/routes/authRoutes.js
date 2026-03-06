import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";
import User from "../models/User.js";

const router = express.Router();
router.use(cookieParser()); // ✅ ضروري لقراءة الكوكيز

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
    const { name, email, password } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ error: "Missing fields" });

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email))
      return res.status(400).json({ error: "Invalid email" });

    if (password.length < 8)
      return res.status(400).json({ error: "Password must be at least 8 chars" });

    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ error: "Email already exists" });

    const hash = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, password: hash });

    const { accessToken, refreshToken } = generateTokens(user._id);
    sendRefreshCookie(res, refreshToken);

    res.json({
      user: { id: user._id, name: user.name, email: user.email },
      token: accessToken, // ✅ مش accessToken أو أي اسم تاني
    });


  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: "Missing fields" });

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: "Invalid credentials" });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(400).json({ error: "Invalid credentials" });

    const { accessToken, refreshToken } = generateTokens(user._id);
    sendRefreshCookie(res, refreshToken);

    res.json({
      user: { id: user._id, name: user.name, email: user.email },
      token: accessToken, // ✅ مش accessToken أو أي اسم تاني
    });


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

export default router;
