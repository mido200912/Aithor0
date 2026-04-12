// routes/publicCompanyChat.js
import express from "express";
import axios from "axios";
import Company from "../models/company.js";
import { extractCorexReply, fetchAiResponse } from "../utils/corexHelper.js";
import { getChatHistory, formatHistoryForPrompt } from "../utils/chatHistoryHelper.js";
import { getCompanyAIContext } from "../utils/promptHelper.js";
import Integration from "../models/Integration.js";

const router = express.Router();
const webOrderSessions = {}; // Stores sessions while waiting for phone number

// Helper to verify domain
const verifyDomain = (req, company) => {
  const origin = req.headers.origin || req.headers.referer || "";
  const allowedDomains = company.allowedDomains || [];
  const websiteUrl = company.websiteUrl || "";

  const allAllowed = [...allowedDomains];
  if (websiteUrl) {
    try {
      const url = new URL(websiteUrl);
      allAllowed.push(url.origin, url.hostname);
    } catch (e) {
      allAllowed.push(websiteUrl);
    }
  }

  if (allAllowed.length === 0) return true; // Allow if none specified (for now)
  
  const isAllowed = allAllowed.some(domain => origin.includes(domain)) || origin.includes("localhost") || origin.includes("127.0.0.1");
  return isAllowed;
};

/**
 * 🧠 Chat with AI using specific company API key
 */
router.post("/chat", async (req, res) => {
  try {
    const { companyApiKey, apiKey, slug, prompt: bodyPrompt, message } = req.body;
    const finalApiKey = companyApiKey || apiKey;
    const prompt = bodyPrompt || message;

    if ((!finalApiKey && !slug) || !prompt)
      return res.status(400).json({ success: false, error: "Missing parameters" });

    // ✅ احضار الشركة بناءً على الـ chatToken أو السبيكة (Slug)
    let company;
    if (slug) {
      company = await Company.findOne({ slug });
    } else {
      company = await Company.findOne({ chatToken: finalApiKey });
    }

    if (!company)
      return res.status(404).json({ success: false, error: "Invalid company" });

    // 🛡️ Security Check
    if (!verifyDomain(req, company)) {
      console.warn(`🛑 Unauthorized chat attempt from domain: ${req.headers.origin || req.headers.referer} for ${company.name}`);
      return res.status(403).json({ success: false, error: "Unauthorized domain" });
    }

    const CompanyChat = (await import("../models/CompanyChat.js")).default;
    
    // Identify customer by sessionId (Persistent LocalStorage ID) as primary
    // clientIp remains for security logs but is NOT the primary identifier anymore
    const clientIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown';
    const { sessionId, sid } = req.body;
    
    // Priority: sessionId -> sid -> fallback to IP based ID
    const userId = sessionId || sid || `web_${clientIp.replace(/:/g, '_')}`;
    const cleanPrompt = prompt.trim().toLowerCase();

    const baseChatData = { company: company._id, user: userId, ip: clientIp, platform: 'web' };

    // ── CHECK ORDER SESSION (Waiting for Name or Phone) ──
    if (webOrderSessions[userId]) {
      const session = webOrderSessions[userId];

      if (session.step === 'awaiting_name') {
        session.customerName = prompt.trim();
        session.step = 'awaiting_phone';
        const requestPhoneMsg = `أهلاً بك يا ${session.customerName} 👋\n\nمن فضلك أرسل <b>رقم الموبايل</b> الخاص بك (11 رقم) لتأكيد طلبك وتواصلنا معك:`;
        await CompanyChat.create({ ...baseChatData, text: prompt, sender: 'user' });
        await CompanyChat.create({ ...baseChatData, text: requestPhoneMsg, sender: 'ai' });
        return res.json({ success: true, company: company.name, reply: requestPhoneMsg });
      }

      if (session.step === 'awaiting_phone') {
        const phoneRegex = /^[0-9]{11}$/;
        if (!phoneRegex.test(cleanPrompt)) {
          const errorMsg = `❌ عذراً، يجب أن يكون الرقم مكوناً من 11 رقم، يرجى المحاولة مرة أخرى:`;
          return res.json({ success: true, company: company.name, reply: errorMsg });
        }

        const phone = prompt.trim();
        // Valid phone, save order!
        company.requests.push({
          customerName: `${session.customerName} (${phone})`,
          product: session.productName,
          message: `📦 طلب ويب جديد!\nالمنتج: ${session.productName}\nالعميل: ${session.customerName}\nالهاتف: ${phone}`,
          source: 'web',
          date: new Date()
        });
        await company.save();

        let orderSummary = `✅ تم استلام طلبك بنجاح:\n📦 المنتج: ${session.productName}\n👤 الاسم: ${session.customerName}\n📱 الموبايل: ${phone}`;
        let confirmMsg = session.successMessage ? `${orderSummary}\n\n${session.successMessage}` : orderSummary;
        
        delete webOrderSessions[userId];

        await CompanyChat.create({ ...baseChatData, text: prompt, sender: 'user' });
        await CompanyChat.create({ ...baseChatData, text: confirmMsg, sender: 'ai' });

        return res.json({ success: true, company: company.name, reply: confirmMsg });
      }
    }

    // ── COMMAND CHECK (`/` or product menus) ──
    const integration = await Integration.findOne({ company: company._id, platform: 'website' });
    const commands = integration?.settings?.commands || [];
    
    const matchedCmd = commands.find(c => cleanPrompt === c.command || cleanPrompt === `/${c.command}`);

    if (matchedCmd) {
      await CompanyChat.create({ ...baseChatData, text: prompt, sender: 'user' });
      
      if (matchedCmd.type === 'fixed_message') {
         const replyMsg = matchedCmd.message || `مرحباً بك في القسم.`;
         await CompanyChat.create({ ...baseChatData, text: replyMsg, sender: 'ai' });
         
         // Register as a regular request as well for tracking
         company.requests.push({ customerName: 'عميل ويب', product: matchedCmd.command, message: prompt, source: 'web', date: new Date() });
         await company.save();
         
         return res.json({ success: true, company: company.name, reply: replyMsg });

      } else if (matchedCmd.type === 'product_menu') {
         const products = matchedCmd.products || [];
         const btnList = products.map(p => p.name);
         const replyMsg = matchedCmd.message || `🛍️ اختر المنتج الذي ترغب به:`;
         await CompanyChat.create({ company: company._id, user: userId, text: replyMsg, sender: 'ai', platform: 'web' });
         return res.json({ success: true, company: company.name, reply: replyMsg, buttons: btnList });
      }
    }

    // Check if the user's prompt exactly matches a product name (i.e. they clicked a button)
    let selectedProductCmd = null;
    let selectedProductName = null;
    for (const cmd of commands) {
       if (cmd.type === 'product_menu') {
          const p = (cmd.products || []).find(pr => pr.name.toLowerCase() === cleanPrompt);
          if (p) {
             selectedProductCmd = cmd;
             selectedProductName = p.name;
             break;
          }
       }
    }

    if (selectedProductName) {
       webOrderSessions[userId] = {
          step: 'awaiting_name',
          productName: selectedProductName,
          successMessage: selectedProductCmd.successMessage || ''
       };
       const requestNameMsg = `اختيار رائع! أنت اخترت: <b>${selectedProductName}</b>.\n\nلتأكيد الطلب، برجاء كتابة <b>اسمك الكريم</b> أولاً:`;
       await CompanyChat.create({ ...baseChatData, text: prompt, sender: 'user' });
       await CompanyChat.create({ ...baseChatData, text: requestNameMsg, sender: 'ai' });
       return res.json({ success: true, company: company.name, reply: requestNameMsg });
    }

    // Save User Question
    await CompanyChat.create({ ...baseChatData, text: prompt, sender: 'user' });

    // 🧠 Context
    const context = await getCompanyAIContext(company);

    // 🕒 Memory
    const history = await getChatHistory(company._id, userId, 'web', 5);
    const historyContext = formatHistoryForPrompt(history);

    // AI Response
    const fullQuestion = `${context}\n\n${historyContext}User Question:\n${prompt}`;
    const reply = await fetchAiResponse(fullQuestion, "لم يتم الحصول على رد من الذكاء الاصطناعي.");

    // Save AI Response
    await CompanyChat.create({ ...baseChatData, text: reply, sender: 'ai' });

    res.json({
      success: true,
      company: company.name,
      reply,
    });
  } catch (err) {
    console.error("🔥 AI Chat Error:", {
      message: err.message,
      response: err.response?.data,
    });
    res.status(500).json({
      success: false,
      error: "AI service error",
      details: err.response?.data || err.message,
    });
  }
});

/**
 * 🕒 Fetch chat history for the widget (returning visitors)
 */
router.get("/history", async (req, res) => {
  try {
    const { apiKey, sessionId } = req.query; // Key name 'apiKey' kept for backward compatibility in URL params, but values must be chatToken
    const company = await Company.findOne({ chatToken: apiKey });
    if (!company) return res.status(404).json({ success: false });

    if (!verifyDomain(req, company)) return res.status(403).json({ success: false });

    const clientIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown';
    // Use the same logic as POST /chat to identify the same persistent user
    // We strictly prefer sessionId if provided by the client (widget)
    const userId = sessionId || `web_${clientIp.replace(/:/g, '_')}`;

    const CompanyChat = (await import("../models/CompanyChat.js")).default;
    const history = await CompanyChat.find({ company: company._id, user: userId });
    history.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    res.json({ 
        success: true, 
        history: history.map(m => ({ 
            sender: m.sender, 
            text: m.text, 
            createdAt: m.createdAt 
        })) 
    });
  } catch (err) {
    console.error("Fetch history error:", err);
    res.status(500).json({ success: false });
  }
});

/**
 * 📝 Fetch commands for a specific company (for autocomplete UI)
 */
router.get("/commands/:apiKey", async (req, res) => {
  try {
    const { apiKey } = req.params;
    const company = await Company.findOne({ chatToken: apiKey });
    if (!company) return res.status(404).json({ success: false });

    if (!verifyDomain(req, company)) return res.status(403).json({ success: false });

    const integration = await Integration.findOne({ company: company._id, platform: 'website' });
    const commands = integration?.settings?.commands || [];
    res.json({ success: true, commands: commands.map(c => ({ command: c.command, description: c.description || '', type: c.type })) });
  } catch (err) {
    console.error("Fetch commands error:", err);
    res.status(500).json({ success: false });
  }
});

/**
 * 🏢 Fetch all companies for showcase
 */
router.get("/companies", async (req, res) => {
  try {
    const companies = await Company.find({}, "name description industry apiKey slug");
    res.json({ success: true, companies });
  } catch (err) {
    console.error("Fetch companies error:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

/**
 * 🏢 Fetch company info by API key
 */
router.get("/company/:apiKey", async (req, res) => {
  try {
    const { apiKey } = req.params;
    const company = await Company.findOne({ apiKey });

    if (!company) return res.status(404).json({ success: false });
    res.json({ success: true, company });
  } catch (err) {
    console.error("Fetch company error:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

/**
 * 🏢 Fetch company info by Slug
 */
router.get("/company/slug/:slug", async (req, res) => {
  try {
    const { slug } = req.params;
    const company = await Company.findOne({ slug });

    if (!company) return res.status(404).json({ success: false });
    res.json({ success: true, company });
  } catch (err) {
    console.error("Fetch company by slug error:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

export default router;
