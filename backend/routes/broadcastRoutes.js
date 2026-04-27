import express from "express";
import admin from "firebase-admin";

const router = express.Router();
const db = admin.firestore();

/**
 * 📢 Get current active system broadcast
 */
router.get("/current", async (req, res) => {
  try {
    const broadcastDoc = await db.collection("SystemSettings").doc("broadcast").get();
    
    if (!broadcastDoc.exists) {
      return res.json({ success: true, broadcast: null });
    }

    const broadcast = broadcastDoc.data();
    
    // Check if it's still active (optional: could add expiration logic)
    if (broadcast.active === false) {
      return res.json({ success: true, broadcast: null });
    }

    res.json({ success: true, broadcast });
  } catch (error) {
    console.error("Fetch broadcast error:", error);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

export default router;
