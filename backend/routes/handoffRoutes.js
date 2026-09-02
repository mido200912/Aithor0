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

    const { userId, platform, message } = req.body;
    if (!userId || !platform || !message) {
      return res.status(400).json({ error: "userId, platform, and message are required" });
    }

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
        try {
          await axios.post(
            `https://graph.facebook.com/v20.0/${phoneNumberId}/messages`,
            {
              messaging_product: "whatsapp",
              to: String(userId).replace(/[^0-9]/g, ''),
              type: "text",
              text: { body: message },
            },
            {
              headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
              },
            }
          );
        } catch (waErr) {
          const metaErr = waErr.response?.data?.error || waErr.response?.data || waErr.message;
          console.error("[Handoff Reply] WhatsApp send failed:", JSON.stringify(metaErr, null, 2));
          // Mark last agent message as failed but don't throw away the chat — frontend will see detailed error
          try {
            const lastAgent = await CompanyChat.Model.findOne({ company: company._id, user: userId, platform }).sort({ createdAt: -1 });
            if (lastAgent) await CompanyChat.Model.updateOne({ _id: lastAgent._id }, { $set: { status: 'failed', metaError: JSON.stringify(metaErr).substring(0, 500) } });
          } catch (_) {}
          // If Meta says outside 24h window, give actionable message
          const msg = metaErr?.message || String(metaErr);
          if (msg.includes('24') || msg.includes('131047') || msg.includes('template')) {
            throw new Error(`واتساب رفض الإرسال: الرقم خارج نافذة 24 ساعة. يجب أن يراسلك العميل أولاً أو استخدم رسالة Template. التفاصيل: ${msg}`);
          }
          throw new Error(`فشل إرسال واتساب: ${msg}`);
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
