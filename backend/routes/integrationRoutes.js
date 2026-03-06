import express from 'express';
import {
    metaLogin,
    metaCallback,
    shopifyLogin,
    shopifyCallback,
    metaWebhook,
    shopifyWebhook,
    getWidgetScript,
    metaDataDeletion,
    tiktokLogin,
    tiktokCallback
} from '../controllers/integrationController.js';

const router = express.Router();

// 🌐 Meta (Facebook/Instagram/WhatsApp) Auth
// @route GET /api/integrations/meta/login
router.get('/meta/login', metaLogin);
// @route GET /api/integrations/meta/callback
router.get('/meta/callback', metaCallback);

// @route POST /api/integrations/meta/data-deletion (الاستلام الفعلي للطلب)
router.post('/meta/data-deletion', metaDataDeletion);
// @route GET /api/integrations/meta/data-deletion (قد يُطلب للتحقق)
router.get('/meta/data-deletion', metaDataDeletion);

// 🛍️ Shopify Auth
// @route GET /api/integrations/shopify/login
router.get('/shopify/login', shopifyLogin);
// @route GET /api/integrations/shopify/callback
router.get('/shopify/callback', shopifyCallback);

// 📱 TikTok Auth
// @route GET /api/integrations/tiktok/login
router.get('/tiktok/login', tiktokLogin);
// @route GET /api/integrations/tiktok/callback
router.get('/tiktok/callback', tiktokCallback);

// 🔔 Webhooks (التحقق من التوقيع والأمان يتم في الـ Controller)
// @route POST /api/integrations/webhooks/meta (استلام البيانات)
router.post('/webhooks/meta', metaWebhook);
// @route GET /api/integrations/webhooks/meta (تحقق Meta)
router.get('/webhooks/meta', metaWebhook);

// @route POST /api/integrations/webhooks/shopify
router.post('/webhooks/shopify', shopifyWebhook);

// 🖥️ No-Code Widget Script
// @route GET /api/integrations/widget/script.js
router.get('/widget/script.js', getWidgetScript);

export default router;