# 🚀 Aithor Backend API

<div align="center">

![Aithor Logo](https://via.placeholder.com/200x200/4A90E2/FFFFFF?text=Aithor)

**منصة ذكية لإدارة الشركات مع Chatbot مدعوم بالذكاء الاصطناعي**

[![MongoDB](https://img.shields.io/badge/MongoDB-4.4+-green.svg)](https://www.mongodb.com/)
[![Node.js](https://img.shields.io/badge/Node.js-18.x-brightgreen.svg)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.x-blue.svg)](https://expressjs.com/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

[English](#) | [العربية](#)

</div>

---

## 📋 جدول المحتويات

- [نظرة عامة](#-نظرة-عامة)
- [المميزات](#-المميزات)
- [التقنيات المستخدمة](#-التقنيات-المستخدمة)
- [البنية الهيكلية](#-البنية-الهيكلية)
- [التثبيت](#-التثبيت)
- [الإعداد](#-الإعداد)
- [API Documentation](#-api-documentation)
- [قاعدة البيانات](#-قاعدة-البيانات)
- [الأمان](#-الأمان)
- [النشر](#-النشر)
- [المساهمة](#-المساهمة)
- [الترخيص](#-الترخيص)

---

## 🌟 نظرة عامة

**Aithor** هو نظام backend متكامل يوفر:
- 🏢 إدارة شاملة للشركات والمشاريع
- 🤖 Chatbot ذكي مدعوم بـ AI (Mistral 7B)
- 🔗 تكامل مع منصات التواصل الاجتماعي (Facebook, Instagram, WhatsApp)
- 🛒 تكامل مع Shopify
- 🔑 نظام API Key للوصول العام
- 💬 نظام محادثات متطور

---

## ✨ المميزات

### 🔐 Authentication & Authorization
- ✅ تسجيل الدخول والتسجيل مع JWT
- ✅ تشفير كلمات المرور بـ bcrypt
- ✅ نظام أدوار المستخدمين
- ✅ API Keys للوصول العام

### 🏢 إدارة الشركات
- ✅ إنشاء وتحديث بيانات الشركة
- ✅ تخزين الرؤية والرسالة والقيم
- ✅ تتبع طلبات العملاء
- ✅ توليد API Key تلقائي

### 📦 إدارة المشاريع
- ✅ إنشاء وإدارة المشاريع
- ✅ إضافة المنتجات مع الأسعار والـ SKU
- ✅ إدارة الأسئلة الشائعة (FAQs)
- ✅ تخصيص نبرة الردود

### 🤖 AI Chatbot
- ✅ محادثة ذكية بناءً على بيانات الشركة
- ✅ دعم اللغة العربية
- ✅ ردود سياقية (Context-aware)
- ✅ API عام للتضمين في المواقع

### 🔗 التكاملات الخارجية
- ✅ Facebook Messenger
- ✅ Instagram DMs
- ✅ WhatsApp Business
- ✅ Shopify Store
- ✅ معالجة Webhooks

---

## 🛠️ التقنيات المستخدمة

### Backend Framework
```
Node.js v18+
Express.js v4.x
```

### Database
```
MongoDB v4.4+
Mongoose ODM v7.x
```

### Authentication
```
JSON Web Tokens (JWT)
bcryptjs
```

### AI Integration
```
OpenRouter API
Mistral 7B Instruct
```

### External APIs
```
Meta Graph API (Facebook/Instagram)
WhatsApp Business API
Shopify Admin API
```

### Dependencies
```json
{
  "dependencies": {
    "express": "^4.18.2",
    "mongoose": "^7.0.0",
    "dotenv": "^16.0.3",
    "cors": "^2.8.5",
    "jsonwebtoken": "^9.0.0",
    "bcryptjs": "^2.4.3",
    "axios": "^1.4.0"
  }
}
```

---

## 📂 البنية الهيكلية

```
backend/
│
├── 📁 models/                  # نماذج قاعدة البيانات (Mongoose Schemas)
│   ├── User.js                # نموذج المستخدمين
│   ├── company.js             # نموذج الشركات
│   ├── Project.js             # نموذج المشاريع
│   ├── Integration.js         # نموذج التكاملات
│   └── CompanyChat.js         # نموذج المحادثات
│
├── 📁 routes/                  # مسارات الـ API
│   ├── authRoutes.js          # مسارات المصادقة
│   ├── Company.js             # مسارات الشركات
│   ├── projectRoutes.js       # مسارات المشاريع
│   ├── chatRoutes.js          # مسارات الـ Chatbot الخاص
│   ├── publicCompanyChat.js   # مسارات الـ Chatbot العام
│   └── integrationRoutes.js   # مسارات التكاملات
│
├── 📁 controllers/             # معالجات الطلبات
│   ├── integrationController.js
│   └── webhookHandler.js
│
├── 📁 middleware/              # Middleware functions
│   ├── auth.js                # JWT authentication
│   └── verifyApiKey.js        # API key verification
│
├── 📁 api/                     # API entry point
│   └── index.js
│
├── 📄 server.js                # نقطة الدخول الرئيسية
├── 📄 testConnection.js        # اختبار الاتصال بقاعدة البيانات
├── 📄 .env                     # المتغيرات البيئية
├── 📄 package.json             # Dependencies
├── 📄 Dockerfile               # Container configuration
└── 📄 vercel.json              # Vercel deployment config
```

---

## 🚀 التثبيت

### المتطلبات الأساسية
- Node.js v18 أو أحدث
- MongoDB v4.4 أو أحدث
- npm أو yarn

### خطوات التثبيت

1. **استنساخ المشروع**
```bash
git clone https://github.com/yourusername/aithor-backend.git
cd aithor-backend
```

2. **تثبيت الحزم**
```bash
npm install
```

3. **إعداد البيئة**
```bash
cp .env.example .env
# قم بتعديل ملف .env بالقيم المناسبة
```

4. **تشغيل السيرفر**
```bash
# Development
npm run dev

# Production
npm start
```

السيرفر سيعمل على: `http://localhost:5000`

---

## ⚙️ الإعداد

### ملف `.env`

```env
# ========================================
# Database Configuration
# ========================================
MONGO_URI=mongodb://localhost:27017/aithor
# أو استخدم MongoDB Atlas
# MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/aithor

# ========================================
# Server Configuration
# ========================================
PORT=5000
NODE_ENV=development

# ========================================
# Authentication
# ========================================
JWT_SECRET=your_super_secret_jwt_key_min_32_characters
JWT_EXPIRES_IN=7d

# ========================================
# AI Service (OpenRouter)
# ========================================
OPENROUTER_API_KEY=sk-or-v1-xxxxxxxxxxxx

# ========================================
# Meta/Facebook Configuration
# ========================================
META_APP_ID=your_facebook_app_id
META_APP_SECRET=your_facebook_app_secret
META_REDIRECT_URI=http://localhost:5000/api/integrations/facebook/callback

# ========================================
# WhatsApp Business Configuration
# ========================================
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
WHATSAPP_ACCESS_TOKEN=your_whatsapp_access_token

# ========================================
# Shopify Configuration
# ========================================
SHOPIFY_API_KEY=your_shopify_api_key
SHOPIFY_API_SECRET=your_shopify_api_secret
SHOPIFY_REDIRECT_URI=http://localhost:5000/api/integrations/shopify/callback

# ========================================
# CORS Configuration
# ========================================
ALLOWED_ORIGINS=http://localhost:3000,https://yourdomain.com
```

### إعداد MongoDB

#### Local MongoDB
```bash
# تشغيل MongoDB محلياً
mongod --dbpath /path/to/data
```

#### MongoDB Atlas (Cloud)
1. إنشاء حساب على [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. إنشاء Cluster جديد
3. الحصول على Connection String
4. إضافة IP Address للـ Whitelist
5. وضع الـ URI في ملف `.env`

---

## 📚 API Documentation

### Base URL
```
http://localhost:5000/api
```

### Authentication

#### 1. Register (تسجيل مستخدم جديد)
```http
POST /api/auth/register
Content-Type: application/json

{
  "name": "أحمد محمد",
  "email": "ahmed@example.com",
  "password": "Password123!"
}
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "name": "أحمد محمد",
    "email": "ahmed@example.com",
    "role": "owner"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

#### 2. Login (تسجيل الدخول)
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "ahmed@example.com",
  "password": "Password123!"
}
```

**Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "name": "أحمد محمد",
    "email": "ahmed@example.com",
    "role": "owner"
  }
}
```

---

### Company Management

#### 3. Create Company (إنشاء شركة)
```http
POST /api/company
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "name": "شركة التقنية المتقدمة",
  "description": "شركة متخصصة في تطوير البرمجيات",
  "industry": "Technology",
  "size": "10-50",
  "vision": "أن نكون الرواد في مجال البرمجيات",
  "mission": "تقديم حلول تقنية مبتكرة",
  "values": ["الابتكار", "الجودة", "الشفافية"]
}
```

**Response:**
```json
{
  "success": true,
  "company": {
    "_id": "507f191e810c19729de860ea",
    "name": "شركة التقنية المتقدمة",
    "apiKey": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
    "owner": "507f1f77bcf86cd799439011",
    ...
  }
}
```

---

#### 4. Get Company Data (الحصول على بيانات الشركة)
```http
GET /api/company
Authorization: Bearer YOUR_JWT_TOKEN
```

---

### AI Chatbot

#### 5. Private Chat (للمستخدمين المسجلين)
```http
POST /api/chat
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "prompt": "ما هي خدماتكم؟"
}
```

**Response:**
```json
{
  "reply": "نحن في شركة التقنية المتقدمة نقدم حلول برمجية مبتكرة..."
}
```

---

#### 6. Public Chat (للوصول العام)
```http
POST /api/public/chat
Content-Type: application/json

{
  "companyApiKey": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
  "prompt": "كيف يمكنني الاشتراك في خدماتكم؟"
}
```

**Response:**
```json
{
  "success": true,
  "company": "شركة التقنية المتقدمة",
  "reply": "يمكنك الاشتراك عبر موقعنا الإلكتروني..."
}
```

---

### Projects

#### 7. Create Project (إنشاء مشروع)
```http
POST /api/projects
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "name": "متجر إلكتروني",
  "description": "منصة تجارة إلكترونية شاملة",
  "products": [
    {
      "title": "منتج أ",
      "price": 99.99,
      "sku": "PROD-001"
    }
  ],
  "faqs": [
    {
      "q": "كيف يمكنني الشراء؟",
      "a": "يمكنك إضافة المنتجات للسلة والدفع عبر البطاقة"
    }
  ],
  "tone": "friendly"
}
```

---

#### 8. Get All Projects (الحصول على جميع المشاريع)
```http
GET /api/projects
Authorization: Bearer YOUR_JWT_TOKEN
```

---

### Integrations

#### 9. Connect Facebook
```http
POST /api/integrations/facebook
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "accessToken": "your_facebook_access_token",
  "pageId": "your_page_id"
}
```

---

#### 10. Get All Integrations
```http
GET /api/integrations
Authorization: Bearer YOUR_JWT_TOKEN
```

---

### Public Endpoints

#### 11. Get All Companies (للعرض العام)
```http
GET /api/public/companies
```

**Response:**
```json
{
  "success": true,
  "companies": [
    {
      "_id": "...",
      "name": "شركة التقنية المتقدمة",
      "description": "...",
      "industry": "Technology",
      "apiKey": "a1b2c3..."
    }
  ]
}
```

---

## 🗄️ قاعدة البيانات

### ERD (Entity Relationship Diagram)

راجع ملف [`DATABASE_DOCUMENTATION.md`](./DATABASE_DOCUMENTATION.md) للحصول على:
- 📊 مخطط ERD كامل
- 📋 تفاصيل جميع الـ Schemas
- 🔗 العلاقات بين الكيانات
- 📌 الـ Indexes المستخدمة

### Collections Overview

| Collection | Description | Count |
|-----------|-------------|-------|
| `users` | بيانات المستخدمين | - |
| `companies` | بيانات الشركات | - |
| `projects` | المشاريع والمنتجات | - |
| `integrations` | التكاملات الخارجية | - |
| `companychats` | سجل المحادثات | - |

---

## 🔒 الأمان

### Implemented Security Features

#### 1. Authentication
- ✅ JWT-based authentication
- ✅ Password hashing (bcrypt with salt rounds: 12)
- ✅ Token expiration (7 days)

#### 2. Data Protection
- ✅ Environment variables للمعلومات الحساسة
- ✅ Unique constraints على الحقول المهمة
- ✅ Schema validation

#### 3. API Security
- ✅ CORS configuration
- ✅ API Key verification
- ✅ Protected routes middleware

#### 4. Webhook Security
- ✅ HMAC verification (Shopify)
- ✅ Signature verification (Meta)
- ✅ Raw body parsing

### Recommended Additions

```javascript
// 1. Rate Limiting
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // max 100 requests per windowMs
});

app.use('/api/', limiter);

// 2. Input Validation
import { body, validationResult } from 'express-validator';

router.post('/register', [
  body('email').isEmail(),
  body('password').isLength({ min: 8 })
], ...);

// 3. Security Headers
import helmet from 'helmet';
app.use(helmet());

// 4. SQL Injection Prevention
import mongoSanitize from 'express-mongo-sanitize';
app.use(mongoSanitize());
```

---

## 🚢 النشر

### Vercel Deployment

1. **تثبيت Vercel CLI**
```bash
npm i -g vercel
```

2. **تسجيل الدخول**
```bash
vercel login
```

3. **Deploy**
```bash
vercel --prod
```

4. **إضافة Environment Variables**
```bash
vercel env add MONGO_URI
vercel env add JWT_SECRET
# ... جميع المتغيرات الأخرى
```

---

### Docker Deployment

```bash
# Build image
docker build -t aithor-backend .

# Run container
docker run -p 5000:5000 \
  -e MONGO_URI=your_mongo_uri \
  -e JWT_SECRET=your_jwt_secret \
  aithor-backend
```

**Dockerfile:**
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 5000

CMD ["node", "server.js"]
```

---

### Traditional Server (VPS)

```bash
# 1. Clone repository
git clone https://github.com/yourusername/aithor-backend.git
cd aithor-backend

# 2. Install dependencies
npm install

# 3. Setup environment
cp .env.example .env
nano .env  # Edit with your values

# 4. Install PM2
npm install -g pm2

# 5. Start with PM2
pm2 start server.js --name aithor-backend

# 6. Save PM2 config
pm2 save
pm2 startup
```

---

## 🧪 Testing

### Running Tests
```bash
# Unit tests
npm test

# Integration tests
npm run test:integration

# Coverage
npm run test:coverage
```

### Example Test
```javascript
import request from 'supertest';
import app from '../server.js';

describe('POST /api/auth/register', () => {
  it('should create a new user', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Test User',
        email: 'test@example.com',
        password: 'Password123!'
      });
    
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.user.email).toBe('test@example.com');
  });
});
```

---

## 📊 Monitoring

### Health Check
```http
GET /
```

**Response:**
```
AiThor API is running
```

### Database Connection Test
```bash
node testConnection.js
```

---

## 🤝 المساهمة

نرحب بالمساهمات! يرجى اتباع الخطوات التالية:

1. Fork المشروع
2. إنشاء Branch جديد (`git checkout -b feature/AmazingFeature`)
3. Commit التغييرات (`git commit -m 'Add some AmazingFeature'`)
4. Push إلى الـ Branch (`git push origin feature/AmazingFeature`)
5. فتح Pull Request

### Coding Standards
- استخدم ES6+ syntax
- اتبع Airbnb Style Guide
- اكتب unit tests للميزات الجديدة
- وثّق الـ API endpoints

---

## 📝 الترخيص

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 📞 التواصل

**Project Maintainer**: Aithor Team  
**Email**: support@aithor.com  
**Website**: https://aithor.com

---

## 🙏 شكر وتقدير

- [OpenRouter](https://openrouter.ai/) - AI API
- [MongoDB](https://www.mongodb.com/) - Database
- [Express.js](https://expressjs.com/) - Web Framework
- [Meta](https://developers.facebook.com/) - Social Media APIs

---

## 📖 مراجع إضافية

- [DATABASE_DOCUMENTATION.md](./DATABASE_DOCUMENTATION.md) - توثيق كامل لقاعدة البيانات
- [PROJECT_REVIEW.md](./PROJECT_REVIEW.md) - مراجعة شاملة للمشروع
- [API Collection](./postman_collection.json) - Postman Collection

---

<div align="center">

**Built with ❤️ by Aithor Team**

⭐ إذا أعجبك المشروع، لا تنسَ إعطاءه نجمة!

</div>
