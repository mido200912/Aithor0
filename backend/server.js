import 'dotenv/config';
import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import helmet from "helmet";
import hpp from "hpp";
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
import voxioChatRoutes from "./routes/VOXIOChatRoutes.js";
import chatbotEditorRoutes from "./routes/chatbotEditorRoutes.js";

const app = express();

// 🛑 XSS Clean Middleware
const sanitize = (text) => {
    if (typeof text !== 'string') return text;
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;');
};

const xssClean = (req, res, next) => {
    if (req.body) Object.keys(req.body).forEach(k => req.body[k] = sanitize(req.body[k]));
    if (req.query) Object.keys(req.query).forEach(k => req.query[k] = sanitize(req.query[k]));
    next();
};

// ✅ إعداد CORS
const allowedOrigins = [
    "http://localhost:5173",
    "https://voxio-v1.vercel.app",
    "https://voxio0.vercel.app",
    "https://aithor1.vercel.app",
    "https://aithor2.vercel.app"
];

app.use(cors({
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.includes(origin) || origin.endsWith(".vercel.app") || origin.includes("localhost")) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept", "Origin", "ngrok-skip-browser-warning"],
    credentials: true
}));

// 🛑 إعداد Raw Body للـ Webhooks
app.use('/api/webhooks/shopify', express.raw({ type: '*/*' }));
app.use('/api/webhooks/meta', express.raw({ type: '*/*' }));
app.use('/api/integrations/meta/data-deletion', express.raw({ type: '*/*' }));

// ✅ إعداد JSON Body
app.use(express.json({ limit: '10kb' }));
app.use(hpp());
app.use(xssClean);

// ✅ إعداد حماية أكبر للموقع (Security Middlewares)
app.use(helmet({
    crossOriginOpenerPolicy: { policy: "unsafe-none" },
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));

app.set('trust proxy', 1);
const limiter = rateLimit({
    max: 100,
    windowMs: 15 * 60 * 1000,
    message: "Too many requests, please try again in 15 minutes."
});
app.use('/api', limiter);

const authLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 20,
    message: "Too many login attempts, please try again in an hour."
});
app.use("/api/auth/login", authLimiter);

// ✅ تم إزالة اتصال MongoDB لأنه تم التحويل إلى Firebase

// ✅ Routes 
app.use("/api/chat", chatRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/company", companyRoutes);
app.use("/api/public", publicCompanyChatRoutes);
app.use("/api/integrations", integrationRoutes);
app.use("/api/ai", uploadRoutes);
app.use("/api/support-chat", chatHistoryRoutes);
app.use("/api/integration-manager", integrationManagerRoutes);
app.use("/api/voxio-chat", voxioChatRoutes);
app.use("/api/chatbot-editor", chatbotEditorRoutes);

// ✅ Route افتراضي
app.get("/", (req, res) => {
    res.send("VOXIO API is running");
});

// ✅ Serve Widget JS Direct Content (الحل النهائي لمنع 404 على Vercel)
app.get('/widget.js', (req, res) => {
    res.setHeader('Content-Type', 'application/javascript');
    const widgetCode = `
(function() {
    const script = document.currentScript;
    const apiKey = script.getAttribute('data-api-key');
    const baseUrl = script.getAttribute('data-base-url') || 'https://aithor1.vercel.app';
    const primaryColor = script.getAttribute('data-primary-color') || '#000';
    
    if (!apiKey) {
        console.error('VOXIO Widget Error: data-api-key is missing.');
        return;
    }

    // إضافة FontAwesome للأيقونات
    const fa = document.createElement('link');
    fa.rel = 'stylesheet';
    fa.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css';
    document.head.appendChild(fa);

    // ستايلات الودجت
    const style = document.createElement('style');
    style.innerHTML = \`
        #voxio-widget-container { position: fixed; bottom: 20px; right: 20px; z-index: 999999; direction: rtl; }
        #voxio-widget-button { 
            width: 56px; height: 56px; border-radius: 50%; background: \${primaryColor}; 
            color: \${primaryColor === '#c8ff00' ? '#000' : '#fff'};
            box-shadow: 0 4px 12px rgba(0,0,0,0.15); cursor: pointer; display: flex; align-items: center; justify-content: center; border: none; transition: transform 0.2s;
        }
        #voxio-widget-button:hover { transform: scale(1.05); }
        #voxio-widget-window { 
            position: absolute; bottom: 70px; right: 0; width: 380px; height: 520px; 
            max-width: calc(100vw - 40px); max-height: calc(100vh - 100px);
            background: #fff; border-radius: 16px; box-shadow: 0 12px 24px rgba(0,0,0,0.18); 
            display: none; flex-direction: column; border: 1px solid rgba(0,0,0,0.1); overflow: hidden;
            transform-origin: bottom right; transition: transform 0.25s, opacity 0.2s; opacity: 0; transform: scale(0.9) translateY(20px);
        }
        #voxio-widget-window.open { display: flex; opacity: 1; transform: scale(1) translateY(0); }
        #voxio-widget-window iframe { border: none; width: 100%; height: 100%; }
    \`;
    document.head.appendChild(style);

    const container = document.createElement('div');
    container.id = 'voxio-widget-container';
    document.body.appendChild(container);

    const button = document.createElement('button');
    button.id = 'voxio-widget-button';
    button.innerHTML = '<i class="fas fa-message"></i>';
    container.appendChild(button);

    const win = document.createElement('div');
    win.id = 'voxio-widget-window';
    win.innerHTML = '<iframe src="' + baseUrl + '/widget/' + apiKey + '" title="VOXIO Chat"></iframe>';
    container.appendChild(win);

    let isOpen = false;
    button.onclick = () => {
        isOpen = !isOpen;
        if (isOpen) {
            win.classList.add('open');
            button.innerHTML = '<i class="fas fa-xmark"></i>';
        } else {
            win.classList.remove('open');
            button.innerHTML = '<i class="fas fa-message"></i>';
        }
    };
})();`;
    res.send(widgetCode);
});

app.get('/api/ping', (req, res) => {
    res.json({ message: "pong" });
});

// 🩺 Health check endpoint to diagnose Vercel Environment Variables
app.get('/api/health', async (req, res) => {
    try {
        const { db, firebaseInitError } = await import('./config/firebase.js');
        res.json({
            status: "ok",
            dbInitialized: !!db,
            firebaseError: firebaseInitError ? firebaseInitError.message || firebaseInitError.toString() : null,
            envKeys: {
                hasProjectId: !!process.env.FIREBASE_PROJECT_ID,
                hasEmail: !!process.env.FIREBASE_CLIENT_EMAIL,
                hasPrivateKey: !!process.env.FIREBASE_PRIVATE_KEY,
                privateKeyLength: process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.length : 0,
                privateKeyStartsWith: process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.substring(0, 30) : null
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message, stack: err.stack });
    }
});

// ✅ التعامل مع الأخطاء
app.use((err, req, res, next) => {
    console.error("Error:", err.message);
    res.status(500).json({ success: false, error: err.message });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));

// ضروي جداً للرفع على Vercel
export default app;
