import axios from 'axios';
import crypto from 'crypto';
import Integration from '../models/Integration.js';
import { handleWhatsAppMessage, handleInstagramWebhook } from './webhookHandler.js';

// Helper to get base URL
const BASE_URL = process.env.BASE_URL || 'https://dba7260ec6cd.ngrok-free.app';

// ⚠️ محاكاة لآلية تخزين Nonce
// يجب استخدام Express Session أو Redis في تطبيق حقيقي
const NONCES_STORE = {};

// ----------------------------------------------------------------------
// 🔒 مُساعدات الأمن والتحقق (Security & Validation Helpers)
// ----------------------------------------------------------------------

const generateNonce = (companyId) => {
  const nonce = crypto.randomBytes(16).toString('hex');
  NONCES_STORE[companyId] = nonce;
  return nonce;
};

const verifyNonce = (companyId, receivedState) => {
  const storedNonce = NONCES_STORE[companyId];
  if (storedNonce && storedNonce === receivedState) {
    delete NONCES_STORE[companyId];
    return true;
  }
  return false;
};

/**
 * يتحقق من توقيع Shopify Webhook باستخدام HMAC-SHA256.
 * req.body يجب أن يكون Raw Buffer (مُمكن بواسطة express.raw()).
 */
const verifyShopifyWebhook = (req) => {
  const hmac = req.headers['x-shopify-hmac-sha256'];
  const body = req.body.toString('utf8');

  const hash = crypto
    .createHmac('sha256', process.env.SHOPIFY_API_SECRET)
    .update(body, 'utf8')
    .digest('base64');

  try {
    return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(hmac));
  } catch (e) {
    return false;
  }
};

// ----------------------------------------------------------------------
// 🌐 Meta Integrations (Facebook/Instagram/WhatsApp)
// ----------------------------------------------------------------------

// @desc    Initiate Meta OAuth
const metaLogin = (req, res) => {
  const { companyId } = req.query;
  if (!companyId) return res.status(400).send('Company ID required');

  const appId = process.env.META_APP_ID;
  const redirectUri = `${BASE_URL}/api/integrations/meta/callback`;

  // الحل الأمني: استخدام Nonce
  const nonce = generateNonce(companyId);
  const state = `${companyId}:${nonce}`;

  const scope = 'pages_show_list,pages_messaging,instagram_basic,instagram_manage_messages,whatsapp_business_messaging';

  const authUrl = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${appId}&redirect_uri=${redirectUri}&state=${state}&scope=${scope}`;

  res.redirect(authUrl);
};

// @desc    Handle Meta OAuth Callback
const metaCallback = async (req, res) => {
  const { code, state, error } = req.query;

  if (error) return res.status(400).send(`Meta Auth Error: ${error}`);

  const [companyId, nonce] = state ? state.split(':') : [null, null];

  if (!code || !companyId || !nonce) return res.status(400).send('Missing required parameters.');

  // التحقق من Nonce (CSRF Protection)
  if (!verifyNonce(companyId, nonce)) return res.status(403).send('Invalid state nonce. CSRF suspected.');

  try {
    // 1. Exchange code for short-lived access token
    const tokenUrl = `https://graph.facebook.com/v18.0/oauth/access_token?client_id=${process.env.META_APP_ID}&redirect_uri=${BASE_URL}/api/integrations/meta/callback&client_secret=${process.env.META_APP_SECRET}&code=${code}`;
    const { data: tokenData } = await axios.get(tokenUrl);
    const shortLivedToken = tokenData.access_token;

    // 2. تبادل الرمز قصير الأجل برمز طويل الأجل (60 يومًا)
    const longLivedTokenUrl = `https://graph.facebook.com/v18.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${process.env.META_APP_ID}&client_secret=${process.env.META_APP_SECRET}&fb_exchange_token=${shortLivedToken}`;
    const { data: longLivedData } = await axios.get(longLivedTokenUrl);
    const userAccessToken = longLivedData.access_token;

    // 3. Get User's Pages
    const pagesUrl = `https://graph.facebook.com/v18.0/me/accounts?access_token=${userAccessToken}`;
    const { data: pagesData } = await axios.get(pagesUrl);

    const page = pagesData.data?.[0]; // نأخذ الأولى لتبسيط MVP

    if (!page) return res.status(400).send('No Facebook Pages found for this account.');

    // 4. Save Integrations
    let fbIntegration = await Integration.findOne({ company: companyId, platform: 'facebook' });
    if (!fbIntegration) {
      await Integration.create({
        company: companyId, platform: 'facebook',
        credentials: { accessToken: page.access_token, pageId: page.id, userAccessToken },
        isActive: true
      });
    } else {
      fbIntegration.credentials = { accessToken: page.access_token, pageId: page.id, userAccessToken };
      fbIntegration.isActive = true;
      await fbIntegration.save();
    }

    // 5. Fetch linked Instagram Business Account
    try {
      const igUrl = `https://graph.facebook.com/v18.0/${page.id}?fields=instagram_business_account&access_token=${page.access_token}`;
      const { data: igData } = await axios.get(igUrl);
      if (igData.instagram_business_account) {
        const igAccountId = igData.instagram_business_account.id;
        let igIntegration = await Integration.findOne({ company: companyId, platform: 'instagram' });
        if (!igIntegration) {
          await Integration.create({
            company: companyId, platform: 'instagram',
            credentials: { accessToken: page.access_token, pageId: page.id, igAccountId, userAccessToken },
            isActive: true
          });
        } else {
          igIntegration.credentials = { accessToken: page.access_token, pageId: page.id, igAccountId, userAccessToken };
          igIntegration.isActive = true;
          await igIntegration.save();
        }
      }
    } catch (igError) {
      console.error('Failed to fetch linked Instagram account:', igError?.response?.data || igError.message);
    }

    // 💡 يجب هنا تسجيل الـ Webhooks للصفحة (بواسطة رمز الصفحة)
    // Subscribe to messages and comments
    try {
      await axios.post(`https://graph.facebook.com/v18.0/${page.id}/subscribed_apps`, {
         subscribed_fields: ['messages', 'messaging_postbacks', 'feed', 'instagram_manage_messages', 'instagram_manage_comments']
      }, {
         headers: { Authorization: `Bearer ${page.access_token}` }
      });
    } catch(subErr) {
       console.error('Webhook subscription error:', subErr?.response?.data || subErr.message);
    }

    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/dashboard?status=success&platform=meta`);

  } catch (err) {
    console.error('Meta Auth Error:', err.response?.data || err.message);
    res.redirect('http://localhost:3000/dashboard?status=error&platform=facebook');
  }
};

// @desc    Handle Meta Webhooks (Messenger, Instagram, WhatsApp)
const metaWebhook = async (req, res) => {
  // 1. Verification challenge
  if (req.query['hub.mode'] === 'subscribe' && req.query['hub.verify_token']) {
    if (req.query['hub.verify_token'] === process.env.META_VERIFY_TOKEN) {
      console.log('Meta Webhook verified');
      return res.status(200).send(req.query['hub.challenge']);
    }
    return res.sendStatus(403);
  }

  // 2. Handle incoming messages
  try {
    const body = req.body; // Already parsed by express.json()

    console.log(`Received Meta webhook [${body.object}]:`, JSON.stringify(body, null, 2));

    // Acknowledge Meta immediately to prevent timeout and retries
    res.sendStatus(200);

    // Process asynchronously without blocking the webhook acknowledgment
    Promise.resolve().then(async () => {
        try {
            // Handle WhatsApp messages
            await handleWhatsAppMessage(body);

            // Handle Instagram messages and comments
            await handleInstagramWebhook(body);
        } catch (asyncErr) {
            console.error('Async Webhook Processing Error:', asyncErr);
        }
    });

  } catch (error) {
    console.error(error);
  }
};

// ----------------------------------------------------------------------
// 🛍️ Shopify Integrations
// ----------------------------------------------------------------------

// @desc    Initiate Shopify OAuth
const shopifyLogin = (req, res) => {
  const { shop, companyId } = req.query;
  if (!shop || !companyId) return res.status(400).send('Shop URL and Company ID required');

  const apiKey = process.env.SHOPIFY_API_KEY;
  const scopes = 'read_products,read_orders';
  const redirectUri = `${BASE_URL}/api/integrations/shopify/callback`;

  // الحل الأمني: استخدام Nonce
  const nonce = generateNonce(companyId);
  const state = `${companyId}:${nonce}`;

  // تنظيف رابط المتجر من https:// أو / في النهاية
  const sanitizedShop = shop.replace(/^https?:\/\//, '').replace(/\/$/, '');

  const authUrl = `https://${sanitizedShop}/admin/oauth/authorize?client_id=${apiKey}&scope=${scopes}&redirect_uri=${redirectUri}&state=${state}`;

  res.redirect(authUrl);
};

// @desc    Handle Shopify OAuth Callback
const shopifyCallback = async (req, res) => {
  const { shop, code, state } = req.query;

  const [companyId, nonce] = state ? state.split(':') : [null, null];

  if (!shop || !code || !companyId || !nonce) return res.status(400).send('Missing required parameters.');

  // التحقق من Nonce (CSRF Protection)
  if (!verifyNonce(companyId, nonce)) return res.status(403).send('Invalid state nonce. CSRF suspected.');

  try {
    // Exchange code for Permanent Access Token
    const tokenUrl = `https://${shop}/admin/oauth/access_token`;
    const { data } = await axios.post(tokenUrl, {
      client_id: process.env.SHOPIFY_API_KEY,
      client_secret: process.env.SHOPIFY_API_SECRET,
      code
    });

    const { access_token } = data; // 🔑 رمز وصول دائم

    // Save Integration
    let shopifyIntegration = await Integration.findOne({ company: companyId, platform: 'shopify' });
    if (!shopifyIntegration) {
      await Integration.create({
        company: companyId, platform: 'shopify',
        credentials: { shopUrl: shop, accessToken: access_token },
        isActive: true
      });
    } else {
      shopifyIntegration.credentials = { shopUrl: shop, accessToken: access_token };
      shopifyIntegration.isActive = true;
      await shopifyIntegration.save();
    }

    // 💡 يجب هنا تسجيل Webhooks اللازمة (orders/create, products/update, إلخ)

    res.redirect('http://localhost:3000/dashboard?status=success&platform=shopify');

  } catch (err) {
    console.error('Shopify Auth Error:', err.response?.data || err.message);
    res.redirect('http://localhost:3000/dashboard?status=error&platform=shopify');
  }
};

// @desc    Handle Shopify Webhooks
const shopifyWebhook = async (req, res) => {
  try {
    // الحل الأمني: التحقق من HMAC لضمان أمان الـ Webhook
    if (!verifyShopifyWebhook(req)) {
      console.warn('Shopify Webhook verification failed (HMAC mismatch).');
      return res.sendStatus(403);
    }

    const shopUrl = req.headers['x-shopify-shop-domain'];
    const topic = req.headers['x-shopify-topic'];
    const body = JSON.parse(req.body.toString('utf8')); // التحويل من Raw Buffer إلى JSON

    // يجب استخدام shopUrl لاسترجاع Integration ومعرفة إلى أي شركة ينتمي.

    console.log(`Received Shopify webhook [${topic}] from ${shopUrl}:`, body);

    res.sendStatus(200);
  } catch (error) {
    console.error('Shopify Webhook Error:', error);
    res.sendStatus(500);
  }
};

// ----------------------------------------------------------------------
// 🎵 TikTok Integrations
// ----------------------------------------------------------------------

// @desc    Initiate TikTok OAuth
const tiktokLogin = (req, res) => {
  const { companyId } = req.query;
  if (!companyId) return res.status(400).send('Company ID required');

  const clientKey = process.env.TIKTOK_CLIENT_KEY;
  if (!clientKey) return res.status(400).send('TikTok Client Key is missing in environment variables. Please add TIKTOK_CLIENT_KEY.');

  const redirectUri = `${BASE_URL}/api/integrations/tiktok/callback`;

  // CSRF state token
  const nonce = generateNonce(companyId);
  const state = Object.keys(NONCES_STORE).find(key => NONCES_STORE[key] === nonce) ? `${companyId}:${nonce}` : `${companyId}:${nonce}`;

  const scope = 'user.info.basic'; // You can add more scopes like message.send

  const authUrl = `https://www.tiktok.com/v2/auth/authorize/?client_key=${clientKey}&scope=${scope}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`;

  res.redirect(authUrl);
};

// @desc    Handle TikTok OAuth Callback
const tiktokCallback = async (req, res) => {
  const { code, state, error } = req.query;

  if (error) return res.status(400).send(`TikTok Auth Error: ${error}`);

  const [companyId, nonce] = state ? state.split(':') : [null, null];

  if (!code || !companyId || !nonce) return res.status(400).send('Missing required parameters.');

  if (!verifyNonce(companyId, nonce)) return res.status(403).send('Invalid state nonce. CSRF suspected.');

  try {
    const tokenUrl = 'https://open.tiktokapis.com/v2/oauth/token/';

    const params = new URLSearchParams();
    params.append('client_key', process.env.TIKTOK_CLIENT_KEY);
    params.append('client_secret', process.env.TIKTOK_CLIENT_SECRET);
    params.append('code', code);
    params.append('grant_type', 'authorization_code');
    params.append('redirect_uri', `${BASE_URL}/api/integrations/tiktok/callback`);

    // Exchange code for token
    const { data } = await axios.post(tokenUrl, params.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    const { access_token, refresh_token, open_id } = data;

    // Save Integration
    let tiktokIntegration = await Integration.findOne({ company: companyId, platform: 'tiktok' });
    if (!tiktokIntegration) {
      await Integration.create({
        company: companyId, platform: 'tiktok',
        credentials: { accessToken: access_token, refreshToken: refresh_token, openId: open_id },
        isActive: true
      });
    } else {
      tiktokIntegration.credentials = { accessToken: access_token, refreshToken: refresh_token, openId: open_id };
      tiktokIntegration.isActive = true;
      await tiktokIntegration.save();
    }

    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/dashboard?status=success&platform=tiktok`);

  } catch (err) {
    console.error('TikTok Auth Error:', err.response?.data || err.message);
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/dashboard?status=error&platform=tiktok`);
  }
};

// ----------------------------------------------------------------------
// 🗑️ Data Deletion & Widget
// ----------------------------------------------------------------------

// @desc    Handle Meta Data Deletion Callback
const metaDataDeletion = (req, res) => {
  try {
    // ⚠️ يجب هنا فك تشفير signed_request (من req.body) والتحقق من user_id وحذف بياناته

    const confirmationCode = 'del_' + Date.now();

    const response = {
      url: `${BASE_URL}/data-deletion-status?code=${confirmationCode}`,
      confirmation_code: confirmationCode,
    };

    res.json(response);
  } catch (error) {
    console.error('Data Deletion Error:', error);
    res.status(500).send('Error processing data deletion request');
  }
};

// @desc    Serve the No-Code Widget Script
const getWidgetScript = async (req, res) => {
  const { companyId } = req.query;
  const APP_URL = process.env.BASE_URL || 'http://localhost:3000';

  const script = `
    (function() {
      const companyId = "${companyId}";
      const baseUrl = "${APP_URL}";
      if (!companyId) return;

      // Inject CSS for animations
      const style = document.createElement('style');
      style.textContent = \`
        @keyframes voxio-fadeIn {
          from { opacity: 0; transform: scale(0.8) translateY(20px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes voxio-pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
        .voxio-chat-bubble {
          animation: voxio-pulse 2s infinite ease-in-out;
        }
        .voxio-chat-bubble:hover {
          transform: scale(1.1) !important;
          animation: none;
        }
        .voxio-chat-window {
          animation: voxio-fadeIn 0.3s ease-out;
        }
      \`;
      document.head.appendChild(style);

      // Create Chat Bubble with gradient
      const bubble = document.createElement('div');
      bubble.className = 'voxio-chat-bubble';
      bubble.style.cssText = \`
        position: fixed;
        bottom: 24px;
        right: 24px;
        width: 64px;
        height: 64px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border-radius: 50%;
        cursor: pointer;
        box-shadow: 0 8px 24px rgba(102, 126, 234, 0.4);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 999999;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      \`;
      bubble.innerHTML = \`
        <svg width="32" height="32" viewBox="0 0 24 24" fill="white">
          <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/>
        </svg>
      \`;
      
      // Create Chat Window
      const chatWindow = document.createElement('div');
      chatWindow.className = 'voxio-chat-window';
      chatWindow.style.cssText = \`
        position: fixed;
        bottom: 100px;
        right: 24px;
        width: 380px;
        height: 600px;
        background: white;
        border-radius: 16px;
        box-shadow: 0 12px 48px rgba(0, 0, 0, 0.15);
        display: none;
        flex-direction: column;
        z-index: 999998;
        overflow: hidden;
      \`;
      
      // Header with gradient
      const header = document.createElement('div');
      header.style.cssText = \`
        padding: 20px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        display: flex;
        justify-content: space-between;
        align-items: center;
      \`;
      header.innerHTML = \`
        <div>
          <div style="font-weight: 600; font-size: 18px;">VOXIO Support</div>
          <div style="font-size: 12px; opacity: 0.9; margin-top: 4px;">We're here to help!</div>
        </div>
        <button id="voxio-close-btn" style="background: rgba(255,255,255,0.2); border: none; color: white; width: 32px; height: 32px; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: background 0.2s;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
          </svg>
        </button>
      \`;
      chatWindow.appendChild(header);

      // Chat iframe
      const iframe = document.createElement('iframe');
      iframe.style.cssText = \`
        flex: 1;
        border: none;
        width: 100%;
        height: 100%;
      \`;
      iframe.src = \`\${APP_URL}/company-chat/\${companyId}\`;
      chatWindow.appendChild(iframe);

      // Powered by footer
      const footer = document.createElement('div');
      footer.style.cssText = \`
        padding: 12px;
        text-align: center;
        font-size: 11px;
        color: #999;
        border-top: 1px solid #eee;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      \`;
      footer.innerHTML = 'Powered by <strong style="color: #667eea;">VOXIO</strong>';
      chatWindow.appendChild(footer);

      document.body.appendChild(bubble);
      document.body.appendChild(chatWindow);

      // Toggle chat window
      bubble.addEventListener('click', () => {
        if (chatWindow.style.display === 'none') {
          chatWindow.style.display = 'flex';
          bubble.style.transform = 'scale(0.9)';
        } else {
          chatWindow.style.display = 'none';
          bubble.style.transform = 'scale(1)';
        }
      });

      // Close button
      document.getElementById('voxio-close-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        chatWindow.style.display = 'none';
        bubble.style.transform = 'scale(1)';
      });

      // Close button hover effect
      document.getElementById('voxio-close-btn').addEventListener('mouseenter', function() {
        this.style.background = 'rgba(255,255,255,0.3)';
      });
      document.getElementById('voxio-close-btn').addEventListener('mouseleave', function() {
        this.style.background = 'rgba(255,255,255,0.2)';
      });
    })();
  `;

  res.setHeader('Content-Type', 'application/javascript');
  res.send(script);
};

export {
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
};