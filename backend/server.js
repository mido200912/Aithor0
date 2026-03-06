import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import chatRoutes from "./routes/chatRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import projectRoutes from "./routes/projectRoutes.js";
import companyRoutes from "./routes/Company.js";
import publicCompanyChatRoutes from "./routes/publicCompanyChat.js";
import integrationRoutes from "./routes/integrationRoutes.js";
import uploadRoutes from "./routes/uploadRoutes.js";
import chatHistoryRoutes from "./routes/chatHistoryRoutes.js";
import integrationManagerRoutes from "./routes/integrationManagerRoutes.js";
import aithorChatRoutes from "./routes/aithorChatRoutes.js";

dotenv.config();
const app = express();

// ✅ إعداد CORS (يجب تحديده في الإنتاج لزيادة الأمان)
app.use(cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "ngrok-skip-browser-warning"],
}));

// 🛑 إعداد Raw Body لنقاط نهاية الـ Webhooks 
// هذا ضروري لتحقق HMAC (Shopify) و Signed Request (Meta Data Deletion)
// يجب أن يكون هذا قبل express.json()
app.use('/api/webhooks/shopify', express.raw({ type: '*/*' }));
app.use('/api/webhooks/meta', express.raw({ type: '*/*' }));
app.use('/api/integrations/meta/data-deletion', express.raw({ type: '*/*' }));

// ✅ إعداد JSON Body لبقية المسارات
app.use(express.json());

// ✅ اتصال قاعدة البيانات
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("✅ MongoDB connected successfully!");
    } catch (err) {
        console.error("❌ MongoDB connection failed:", err.message);
        process.exit(1);
    }
};

connectDB();

// ✅ Routes 
console.log("Mounting Routes...");
app.use("/api/chat", chatRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/company", companyRoutes);
app.use("/api/public", publicCompanyChatRoutes);
app.use("/api/integrations", integrationRoutes);
app.use("/api/ai", uploadRoutes);
app.use("/api/support-chat", chatHistoryRoutes);
app.use("/api/integration-manager", integrationManagerRoutes);
app.use("/api/aithor-chat", aithorChatRoutes);
console.log("Routes Mounted Successfully");

// ✅ Route افتراضي
app.get("/", (req, res) => {
    res.send("AiThor API is running");
});

// ✅ التعامل مع الأخطاء
app.use((err, req, res, next) => {
    console.error("Error:", err.message);
    res.status(500).json({ success: false, error: err.message });
});

const PORT = process.env.PORT || 5000;

// Always start server
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));

export default app;
