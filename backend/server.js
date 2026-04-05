import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
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

dotenv.config();
const app = express();

// ✅ إعداد CORS
const allowedOrigins = [
    "http://localhost:5173",
    "https://aithor-v1.vercel.app",
    "https://aithor0.vercel.app"
];

app.use(cors({
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.indexOf(origin) !== -1 || origin === "*") {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "ngrok-skip-browser-warning"],
    credentials: true,
}));

// 🛑 إعداد Raw Body للـ Webhooks
app.use('/api/webhooks/shopify', express.raw({ type: '*/*' }));
app.use('/api/webhooks/meta', express.raw({ type: '*/*' }));
app.use('/api/integrations/meta/data-deletion', express.raw({ type: '*/*' }));

// ✅ إعداد JSON Body
app.use(express.json());

// ✅ إعداد حماية أكبر للموقع (Security Middlewares)
// 1. Set security HTTP headers
app.use(helmet({
    crossOriginOpenerPolicy: { policy: "unsafe-none" }, // Necessary for Google OAuth popup
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// security plugins are trimmed down since xss-clean and mongoSanitize are fundamentally incompatible with Express 5 req.query.

// 5. Limit requests from same API (apply limit after body parse is fine or before, but trust proxy is needed if deployed)
app.set('trust proxy', 1); // crucial for rate-limit and IP tracking behind proxies
const limiter = rateLimit({
    max: 100, // 100 requests per windowMs
    windowMs: 15 * 60 * 1000, // 15 minutes
    message: "Too many requests from this IP, please try again in 15 minutes!"
});
app.use('/api', limiter);

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
app.use("/api/aithor-chat", aithorChatRoutes);

// ✅ Route افتراضي
app.get("/", (req, res) => {
    res.send("AiThor API is running");
});

// ✅ Serve Widget JS Direct Content (الحل النهائي لمنع 404 على Vercel)
app.get('/widget.js', (req, res) => {
    res.setHeader('Content-Type', 'application/javascript');
    const widgetCode = `
(function() {
    const script = document.currentScript;
    const apiKey = script.getAttribute('data-api-key');
    const baseUrl = script.getAttribute('data-base-url') || 'https://aithor0.vercel.app';
    const primaryColor = script.getAttribute('data-primary-color') || '#000';
    
    if (!apiKey) {
        console.error('Aithor Widget Error: data-api-key is missing.');
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
        #aithor-widget-container { position: fixed; bottom: 20px; right: 20px; z-index: 999999; direction: rtl; }
        #aithor-widget-button { 
            width: 56px; height: 56px; border-radius: 50%; background: \${primaryColor}; 
            color: \${primaryColor === '#c8ff00' ? '#000' : '#fff'};
            box-shadow: 0 4px 12px rgba(0,0,0,0.15); cursor: pointer; display: flex; align-items: center; justify-content: center; border: none; transition: transform 0.2s;
        }
        #aithor-widget-button:hover { transform: scale(1.05); }
        #aithor-widget-window { 
            position: absolute; bottom: 70px; right: 0; width: 380px; height: 520px; 
            max-width: calc(100vw - 40px); max-height: calc(100vh - 100px);
            background: #fff; border-radius: 16px; box-shadow: 0 12px 24px rgba(0,0,0,0.18); 
            display: none; flex-direction: column; border: 1px solid rgba(0,0,0,0.1); overflow: hidden;
            transform-origin: bottom right; transition: transform 0.25s, opacity 0.2s; opacity: 0; transform: scale(0.9) translateY(20px);
        }
        #aithor-widget-window.open { display: flex; opacity: 1; transform: scale(1) translateY(0); }
        #aithor-widget-window iframe { border: none; width: 100%; height: 100%; }
    \`;
    document.head.appendChild(style);

    const container = document.createElement('div');
    container.id = 'aithor-widget-container';
    document.body.appendChild(container);

    const button = document.createElement('button');
    button.id = 'aithor-widget-button';
    button.innerHTML = '<i class="fas fa-message"></i>';
    container.appendChild(button);

    const win = document.createElement('div');
    win.id = 'aithor-widget-window';
    win.innerHTML = '<iframe src="' + baseUrl + '/widget/' + apiKey + '" title="Aithor Chat"></iframe>';
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

// ✅ التعامل مع الأخطاء
app.use((err, req, res, next) => {
    console.error("Error:", err.message);
    res.status(500).json({ success: false, error: err.message });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));

export default app;
