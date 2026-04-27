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
import widgetEditorRoutes from "./routes/widgetEditorRoutes.js";

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
app.use(express.json({ limit: '2mb' }));
app.use(hpp());
app.use(xssClean);

// ✅ إعداد حماية أكبر للموقع (Security Middlewares)
app.use(helmet({
    crossOriginOpenerPolicy: { policy: "unsafe-none" },
    crossOriginResourcePolicy: { policy: "cross-origin" },
    frameguard: false, // Allow iframes
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "*.fontawesome.com", "*.vercel.app"],
            styleSrc: ["'self'", "'unsafe-inline'", "fonts.googleapis.com", "cdnjs.cloudflare.com", "*.fontawesome.com"],
            fontSrc: ["'self'", "fonts.gstatic.com", "cdnjs.cloudflare.com", "*.fontawesome.com"],
            imgSrc: ["'self'", "data:", "blob:", "*.vercel.app"],
            connectSrc: ["'self'", "*.vercel.app", "http://localhost:5000", "https://aithor1.vercel.app"],
            frameAncestors: ["'self'", "http://localhost:5173", "https://voxio-v1.vercel.app", "*.vercel.app"],
        },
    }
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
app.use("/api/widget-editor", widgetEditorRoutes);

// ✅ Route افتراضي
app.get("/", (req, res) => {
    res.send("VOXIO API is running");
});

// ✅ Serve Widget JS Direct Content (Premium Redesigned Version)
app.get('/widget.js', (req, res) => {
    res.setHeader('Content-Type', 'application/javascript');
    const baseUrl = process.env.FRONTEND_URL || 'https://voxio-v1.vercel.app';
    const widgetCode = `
(function() {
    const script = document.currentScript;
    const apiKey = script.getAttribute('data-api-key');
    const primaryColor = script.getAttribute('data-primary-color') || '#6C63FF';
    
    if (!apiKey) {
        console.error('VOXIO Widget Error: data-api-key is missing.');
        return;
    }

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css';
    document.head.appendChild(link);

    const style = document.createElement('style');
    style.innerHTML = \`
        :root { --vx-primary: \${primaryColor}; }
        #voxio-w-container {
            position: fixed;
            bottom: 24px;
            right: 24px;
            z-index: 2147483647;
            font-family: 'Inter', 'Cairo', sans-serif;
            direction: rtl;
        }
        #voxio-w-btn {
            width: 60px;
            height: 60px;
            border-radius: 50%;
            background: var(--vx-primary);
            color: #fff;
            box-shadow: 0 8px 24px rgba(0,0,0,0.2), 0 0 0 1px rgba(255,255,255,0.1);
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            border: none;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            position: relative;
        }
        #voxio-w-btn:hover { transform: scale(1.05) rotate(5deg); }
        #voxio-w-btn i { font-size: 24px; transition: all 0.3s; }
        #voxio-w-window {
            position: absolute;
            bottom: 80px;
            right: 0;
            width: 400px;
            height: 600px;
            max-width: calc(100vw - 48px);
            max-height: calc(100vh - 120px);
            background: rgba(255, 255, 255, 0.98);
            backdrop-filter: blur(10px);
            border-radius: 24px;
            box-shadow: 0 20px 50px rgba(0,0,0,0.2);
            display: none;
            flex-direction: column;
            border: 1px solid rgba(255, 255, 255, 0.2);
            overflow: hidden;
            transform-origin: bottom right;
            transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            opacity: 0;
            transform: scale(0.8) translateY(40px);
        }
        #voxio-w-window.vx-open {
            display: flex;
            opacity: 1;
            transform: scale(1) translateY(0);
        }
        #voxio-w-window iframe {
            border: none;
            width: 100%;
            height: 100%;
            background: transparent;
        }
    \`;
    document.head.appendChild(style);

    const container = document.createElement('div');
    container.id = 'voxio-w-container';
    document.body.appendChild(container);

    const button = document.createElement('button');
    button.id = 'voxio-w-btn';
    button.innerHTML = '<i class="fas fa-comment-dots"></i>';
    container.appendChild(button);

    const win = document.createElement('div');
    win.id = 'voxio-w-window';
    win.innerHTML = '<iframe src="' + baseUrl + '/widget/' + apiKey + '" title="VOXIO Chat"></iframe>';
    container.appendChild(win);

    let isOpen = false;
    button.onclick = () => {
        isOpen = !isOpen;
        if (isOpen) {
            win.style.display = 'flex';
            setTimeout(() => win.classList.add('vx-open'), 10);
            button.innerHTML = '<i class="fas fa-times"></i>';
        } else {
            win.classList.remove('vx-open');
            button.innerHTML = '<i class="fas fa-comment-dots"></i>';
            setTimeout(() => { if(!isOpen) win.style.display = 'none'; }, 400);
        }
    };
})();`;
    res.send(widgetCode);
});

// ✅ Route to handle iframe redirect
app.get('/widget/:apiKey', (req, res) => {
    const frontendUrl = process.env.FRONTEND_URL || 'https://voxio-v1.vercel.app';
    res.redirect(`${frontendUrl}/widget/${req.params.apiKey}`);
});

app.get('/api/ping', (req, res) => {
    res.json({ message: "pong" });
});

// 🩺 Health check
app.get('/api/health', async (req, res) => {
    try {
        const { db } = await import('./config/firebase.js');
        res.json({ status: "ok", dbInitialized: !!db });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ✅ التعامل مع الأخطاء
app.use((err, req, res, next) => {
    console.error("Error:", err.message);
    res.status(500).json({ success: false, error: err.message });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});

export default app;
