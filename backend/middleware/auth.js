import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { cacheGet, cacheSet } from "../utils/cache.js";

export const requireAuth = async (req, res, next) => {
  try {
    const auth = req.headers.authorization;
    if (!auth?.startsWith("Bearer ")) return res.status(401).json({ error: "No token" });
    const token = auth.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // ⚡ Check user cache first — avoids Firestore on every request
    const cacheKey = `user:${decoded.id}`;
    let user = cacheGet(cacheKey);

    if (!user) {
      user = await User.findById(decoded.id);
      if (!user) return res.status(401).json({ error: "Invalid token" });
      // Cache for 5 minutes
      cacheSet(cacheKey, user, 5 * 60 * 1000);
    }

    req.user = user;
    next();
  } catch (err) {
    res.status(401).json({ error: "Unauthorized" });
  }
};
