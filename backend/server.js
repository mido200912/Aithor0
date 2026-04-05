import 'dotenv/config';
import express from "express";
import cors from "cors";
import compression from "compression";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
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

const app = express();

// ⚡ Security & Performance
app.disable('x-powered-by');
app.use(compression({ level: 6 }));

app.use(cors({
    origin: ["http://localhost:5173", "https://aithor-v1.vercel.app", "https://aithor0.vercel.app"],
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept", "Origin"]
}));

app.use(express.json());
app.use(helmet({
    crossOriginOpenerPolicy: { policy: "unsafe-none" },
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// ✅ Diagnostic Routes (Placed at top for Vercel debugging)
app.get('/api/ping', (req, res) => {
    res.json({ status: "alive", time: new Date().toISOString() });
});

app.get('/api/health', async (req, res) => {
    try {
        const { db, firebaseInitError } = await import('./config/firebase.js');
        res.json({
            status: "ready",
            dbInitialized: !!db,
            firebaseError: firebaseInitError ? firebaseInitError.message : null,
            envKeys: {
                hasProjectId: !!process.env.FIREBASE_PROJECT_ID,
                hasPrivateKey: !!process.env.FIREBASE_PRIVATE_KEY,
                hasEmail: !!process.env.FIREBASE_CLIENT_EMAIL,
                hasGoogleId: !!process.env.GOOGLE_CLIENT_ID
            }
        });
    } catch (err) {
        res.status(500).json({ error: "Health check crash", details: err.message });
    }
});

// ✅ Auth & API Routes
app.use("/api/auth", authRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/company", companyRoutes);
app.use("/api/public", publicCompanyChatRoutes);
app.use("/api/integrations", integrationRoutes);
app.use("/api/ai", uploadRoutes);
app.use("/api/support-chat", chatHistoryRoutes);
app.use("/api/integration-manager", integrationManagerRoutes);
app.use("/api/aithor-chat", aithorChatRoutes);

// ✅ Root Redirect / Status
app.get("/", (req, res) => {
    res.send("AiThor API is running");
});

// ✅ Error Handler
app.use((err, req, res, next) => {
    console.error("🔥 Error:", err.message);
    res.status(err.status || 500).json({ 
        success: false, 
        error: err.message || "Internal Server Error"
    });
});

// ⚡ Standard Start for Local, export for Vercel
const PORT = process.env.PORT || 5000;
if (!process.env.VERCEL) {
    app.listen(PORT, () => console.log(`🚀 Local server running on port ${PORT}`));
}

export default app;
