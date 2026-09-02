import express from "express";
import { requireAuth } from "../middleware/auth.js";
import Company from "../models/CompanyModel.js";
import CompanyChat from "../models/CompanyChat.js";
import Integration from "../models/Integration.js";
import axios from "axios";
import NotificationService from "../services/notificationService.js";
import AILearningService from "../services/aiLearningService.js";

const router = express.Router();

// @route   GET /api/handoff/conversations
// @desc    Get all conversations needing attention (handoff or recent)
router.get("/conversations", requireAuth, async (req, res) => {
  try {
    const company = await Company.findOne({ owner: req.user._id });
    if (!company) return res.status(404).json({ error: "Company not found" });

    const chats = await CompanyChat.Model.find({ company: company._id })
      .sort({ createdAt: -1 })
      .limit(500)
      .lean();

    const conversationMap = {};
    for (const chat of chats) {
      const key = `${chat.user || "unknown"}_${chat.platform || "web"}`;
      if (!conversationMap[key] || new Date(chat.createdAt) > new Date(conversationMap[key].lastMessage)) {
        conversationMap[key] = {
          userId: chat.user,
          platform: chat.platform,
          lastMessage: chat.createdAt,
          lastText: chat.text?.substring(0, 100),
          lastSender: chat.sender,
          status: chat.status,
          aiEnabled: chat.aiEnabled !== false,
          handoffRequested: chat.handoffRequested || false,
          handoffAcceptedBy: chat.handoffAcceptedBy || null,
          messageCount: 1,
          ip: chat.ip || null,
        };
      } else {
        conversationMap[key].messageCount++;
      }
    }

    const conversations = Object.values(conversationMap).sort(
      (a, b) => new Date(b.lastMessage) - new Date(a.lastMessage)
    );

    const handoffConversations = conversations.filter(c => c.handoffRequested);
    const activeConversations = conversations.filter(c => !c.handoffRequested && c.aiEnabled !== false);
    const manualConversations = conversations.filter(c => c.aiEnabled === false || c.handoffAcceptedBy);

    res.json({
      total: conversations.length,
      handoff: handoffConversations,
      active: activeConversations,
      manual: manualConversations,
      all: conversations,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// @route   GET /api/handoff/conversation/:userId/:platform
// @desc    Get full conversation history
router.get("/conversation/:userId/:platform", requireAuth, async (req, res) => {
  try {
    const company = await Company.findOne({ owner: req.user._id });
    if (!company) return res.status(404).json({ error: "Company not found" });

    const messages = await CompanyChat.Model.find({
      company: company._id,
      user: req.params.userId,
      platform: req.params.platform,
    })
      .sort({ createdAt: 1 })
      .limit(200)
      .lean();

    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// @route   POST /api/handoff/reply
// @desc    Business owner replies to a customer conversation
router.post("/reply", requireAuth, async (req, res) => {
  try {
    const company = await Company.findOne({ owner: req.user._id });
    if (!company) return res.status(404).json({ error: "Company not found" });

    const { userId, platform, message, templateName, templateLanguage, templateParams, useTemplate } = req.body;
    if (!userId || !platform || !message) {
      return res.status(400).json({ error: "userId, platform, and message are required" });
    }
    const shouldUseTemplate = !!useTemplate || !!templateName;

    // Save the reply to chat history
    await CompanyChat.create({
      company: company._id,
      user: userId,
      text: message,
      sender: "agent",
      platform,
      status: "active",
      aiEnabled: false,
    });

    // Send reply via the appropriate platform
    let integration = await Integration.findOne({ company: company._id, platform });
    // Fallback: Firestore type mismatch (string vs id) — try broader search
    if (!integration) {
      try {
        const all = await Integration.find({ platform });
        integration = all.find(i => String(i.company) === String(company._id) || String(i.company) === String(company._id?.toString?.())) || null;
      } catch (_) {}
    }

    if (platform === "telegram" && integration?.credentials?.botToken) {
      await axios.post(`https://api.telegram.org/bot${integration.credentials.botToken}/sendMessage`, {
        chat_id: userId,
        text: message,
        parse_mode: "HTML",
      });
    } else if (platform === "whatsapp" && integration?.credentials) {
      const { phoneNumberId, accessToken } = integration.credentials;
      if (phoneNumberId && accessToken) {
        // Helper to send via Template
        const sendTemplate = async (tName, tLang, params) => {
          const payload = {
            messaging_product: "whatsapp",
            to: String(userId).replace(/[^0-9]/g, ''),
            type: "template",
            template: {
              name: tName,
              language: { code: tLang || 'en_US' },
            },
          };
          if (params && Array.isArray(params) && params.length > 0) {
            payload.template.components = [
              {
                type: "body",
                parameters: params.map(p => ({ type: "text", text: String(p).substring(0, 1024) })),
              },
            ];
          }
          return axios.post(
            `https://graph.facebook.com/v20.0/${phoneNumberId}/messages`,
            payload,
            { headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" } }
          );
        };

        const sendText = async () => {
          return axios.post(
            `https://graph.facebook.com/v20.0/${phoneNumberId}/messages`,
            {
              messaging_product: "whatsapp",
              to: String(userId).replace(/[^0-9]/g, ''),
              type: "text",
              text: { body: message },
            },
            { headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" } }
          );
        };

        if (shouldUseTemplate) {
          // Explicit template mode — used for cold numbers / bulk
          const tName = templateName || integration.settings?.bulkTemplateName || 'hello_world';
          const tLang = templateLanguage || integration.settings?.bulkTemplateLang || 'en_US';
          const params = templateParams && Array.isArray(templateParams) ? templateParams : (tName !== 'hello_world' ? [message] : []);
          try {
            await sendTemplate(tName, tLang, params);
            // Update last chat text to indicate template was used
            try {
              const lastAgent = await CompanyChat.Model.findOne({ company: company._id, user: userId, platform }).sort({ createdAt: -1 });
              if (lastAgent) await CompanyChat.Model.updateOne({ _id: lastAgent._id }, { $set: { status: 'delivered', templateUsed: tName } });
            } catch (_) {}
          } catch (waErr) {
            const metaErr = waErr.response?.data?.error || waErr.response?.data || waErr.message;
            console.error("[Handoff Reply] WhatsApp TEMPLATE send failed:", JSON.stringify(metaErr, null, 2));
            try {
              const lastAgent = await CompanyChat.Model.findOne({ company: company._id, user: userId, platform }).sort({ createdAt: -1 });
              if (lastAgent) await CompanyChat.Model.updateOne({ _id: lastAgent._id }, { $set: { status: 'failed', metaError: JSON.stringify(metaErr).substring(0, 500) } });
            } catch (_) {}
            const msg = metaErr?.message || String(metaErr);
            throw new Error(`فشل إرسال القالب "${tName}": ${msg}. تأكد أن القالب موافق عليه في Meta Business Manager وأن اللغة صحيحة.`);
          }
        } else {
          // Normal text mode — try text, fallback to template if outside 24h window
          try {
            await sendText();
          } catch (waErr) {
            const metaErr = waErr.response?.data?.error || waErr.response?.data || waErr.message;
            const code = metaErr?.code;
            const subcode = metaErr?.error_subcode;
            const msg = metaErr?.message || String(metaErr);
            const isOutsideWindow = code === 131047 || subcode === 131047 || msg.includes('24') || msg.toLowerCase().includes('outside') || msg.includes('131047') || msg.toLowerCase().includes('template');
            console.error("[Handoff Reply] WhatsApp send failed:", JSON.stringify(metaErr, null, 2));
            try {
              const lastAgent = await CompanyChat.Model.findOne({ company: company._id, user: userId, platform }).sort({ createdAt: -1 });
              if (lastAgent) await CompanyChat.Model.updateOne({ _id: lastAgent._id }, { $set: { status: 'failed', metaError: JSON.stringify(metaErr).substring(0, 500) } });
            } catch (_) {}

            if (isOutsideWindow) {
              // Try automatic template fallback if a bulk template is configured
              const fallbackTemplate = integration.settings?.bulkTemplateName;
              if (fallbackTemplate) {
                const fallbackLang = integration.settings?.bulkTemplateLang || 'ar';
                console.log(`[Handoff Reply] Attempting template fallback "${fallbackTemplate}" for ${userId}`);
                try {
                  await sendTemplate(fallbackTemplate, fallbackLang, [message]);
                  try {
                    const lastAgent = await CompanyChat.Model.findOne({ company: company._id, user: userId, platform }).sort({ createdAt: -1 });
                    if (lastAgent) await CompanyChat.Model.updateOne({ _id: lastAgent._id }, { $set: { status: 'delivered', templateUsed: fallbackTemplate } });
                  } catch (_) {}
                  return res.json({ success: true, message: "تم الإرسال كقالب (خارج نافذة 24 ساعة)", templateUsed: fallbackTemplate, warning: `أُرسل كقالب "${fallbackTemplate}" لأن الرقم لم يراسلك خلال 24 ساعة` });
                } catch (fallbackErr) {
                  const fMeta = fallbackErr.response?.data?.error || fallbackErr.response?.data || fallbackErr.message;
                  throw new Error(`واتساب رفض الإرسال النصي وخارج نافذة 24 ساعة. حاولنا القالب "${fallbackTemplate}" وفشل: ${fMeta?.message || fMeta}. الحل: أنشئ قالب موافق عليه في Meta Business Manager باسم "${fallbackTemplate}" أو اجعل العميل يراسلك أولاً. التفاصيل: ${msg}`);
                }
              }
              throw new Error(`واتساب رفض الإرسال: الرقم ${userId} خارج نافذة 24 ساعة ولم يراسلك من قبل. واتساب يسمح بالنص الحر فقط خلال 24 ساعة من آخر رسالة للعميل. الحل: 1) استخدم رسالة Template موافق عليها في Meta، أو 2) اطلب من العميل أن يراسلك أولاً، أو 3) فعّل "وضع القالب" في الإرسال الجماعي وحدد اسم قالبك. التفاصيل: ${msg}`);
            }
            throw new Error(`فشل إرسال واتساب: ${msg}`);
          }
        }
      } else {
        console.warn("[Handoff Reply] Missing WhatsApp credentials for company", company._id);
        throw new Error("إعدادات واتساب غير مكتملة (phoneNumberId / accessToken)");
      }
    } else if (platform === "instagram" && integration?.credentials) {
      const { accessToken, igAccountId } = integration.credentials;
      if (accessToken) {
        const recipientId = igAccountId || integration.credentials.pageId;
        if (recipientId) {
          await axios.post(
            `https://graph.facebook.com/v20.0/me/messages`,
            {
              recipient: { id: userId },
              message: { text: message },
            },
            { headers: { Authorization: `Bearer ${accessToken}` } }
          );
        }
      }
    } else if (platform === "widget" || platform === "web" || platform === "website") {
      // Widget chats don't need external API calls
      console.log(`[Agent Reply] Sent to ${userId} via ${platform}: ${message}`);
    }

    // 📝 Learn from this human reply for future AI improvements
    try {
      const lastUserMsg = await CompanyChat.Model.findOne({
        company: company._id,
        user: userId,
        platform,
        sender: "user",
      }).sort({ createdAt: -1 }).lean();
      if (lastUserMsg?.text) {
        AILearningService.learnFromAgentReply(company._id, userId, platform, lastUserMsg.text, message).catch(() => {});
      }
    } catch (e) { /* learning failure is non-critical */ }

    res.json({ success: true, message: "Reply sent" });
  } catch (err) {
    console.error("[Handoff Reply] Error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// @route   POST /api/handoff/toggle-ai
// @desc    Enable or disable AI for a specific conversation
router.post("/toggle-ai", requireAuth, async (req, res) => {
  try {
    const company = await Company.findOne({ owner: req.user._id });
    if (!company) return res.status(404).json({ error: "Company not found" });

    const { userId, platform, aiEnabled } = req.body;
    if (!userId || !platform) {
      return res.status(400).json({ error: "userId and platform are required" });
    }

    // Update the latest chat for this user to set aiEnabled flag
    const latestChat = await CompanyChat.Model.findOne({
      company: company._id,
      user: userId,
      platform,
    }).sort({ createdAt: -1 });

    if (latestChat) {
      await CompanyChat.Model.updateOne(
        { _id: latestChat._id },
        { $set: { aiEnabled: aiEnabled !== false } }
      );
    }

    // Also update integration's human handoff list
    if (aiEnabled === false) {
      if (!company.humanHandoffUsers) company.humanHandoffUsers = [];
      const key = `${platform}:${userId}`;
      if (!company.humanHandoffUsers.includes(key)) {
        company.humanHandoffUsers.push(key);
      }
    } else {
      if (company.humanHandoffUsers) {
        const key = `${platform}:${userId}`;
        company.humanHandoffUsers = company.humanHandoffUsers.filter(u => u !== key && u !== userId && u !== `raw:${userId}`);
      }
    }
    await company.save();

    res.json({
      success: true,
      aiEnabled: aiEnabled !== false,
      message: aiEnabled !== false ? "AI تم تفعيل الرد التلقائي" : "AI تم إيقاف الرد التلقائي",
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// @route   POST /api/handoff/accept
// @desc    Accept a handoff request (business owner takes over)
router.post("/accept", requireAuth, async (req, res) => {
  try {
    const company = await Company.findOne({ owner: req.user._id });
    if (!company) return res.status(404).json({ error: "Company not found" });

    const { userId, platform } = req.body;
    if (!userId || !platform) {
      return res.status(400).json({ error: "userId and platform are required" });
    }

    const latestChat = await CompanyChat.Model.findOne({
      company: company._id,
      user: userId,
      platform,
    }).sort({ createdAt: -1 });

    if (latestChat) {
      await CompanyChat.Model.updateOne(
        { _id: latestChat._id },
        { 
          $set: { 
            handoffRequested: false,
            handoffAcceptedBy: req.user._id.toString(),
            aiEnabled: false
          } 
        }
      );
    }

    if (!company.humanHandoffUsers) company.humanHandoffUsers = [];
    const key = `${platform}:${userId}`;
    if (!company.humanHandoffUsers.includes(key)) {
      company.humanHandoffUsers.push(key);
    }
    await company.save();

    res.json({ success: true, message: "تم قبول المحادثة، يمكنك الرد الآن" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
