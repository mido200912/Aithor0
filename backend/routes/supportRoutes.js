import express from "express";
import SupportMessage from "../models/SupportMessage.js";

const router = express.Router();

/**
 * 📩 Submit a new support message from landing page
 */
router.post("/submit", async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({ success: false, error: "Missing required fields" });
    }

    const newMessage = await SupportMessage.create({
      name,
      email,
      subject,
      message
    });

    res.status(201).json({ success: true, message: "Message sent successfully", data: newMessage });
  } catch (error) {
    console.error("Support submission error:", error);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

/**
 * 📋 Get all messages (For Admin Dashboard)
 */
router.get("/all", async (req, res) => {
  try {
    const messages = await SupportMessage.findAll();
    res.json({ success: true, data: messages });
  } catch (error) {
    res.status(500).json({ success: false, error: "Server error" });
  }
});

export default router;
