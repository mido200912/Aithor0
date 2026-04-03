// routes/publicCompanyChat.js
import express from "express";
import axios from "axios";
import Company from "../models/company.js";
import { extractCorexReply, fetchAiResponse } from "../utils/corexHelper.js";
import { getChatHistory, formatHistoryForPrompt } from "../utils/chatHistoryHelper.js";
import { getCompanyAIContext } from "../utils/promptHelper.js";

const router = express.Router();

/**
 * 🧠 Chat with AI using specific company API key
 */
router.post("/chat", async (req, res) => {
  try {
    const { companyApiKey, apiKey, prompt: bodyPrompt, message } = req.body;
    const finalApiKey = companyApiKey || apiKey;
    const prompt = bodyPrompt || message;

    if (!finalApiKey || !prompt)
      return res.status(400).json({ success: false, error: "Missing parameters" });

    // ✅ احضار الشركة بناءً على الـ API Key
    const company = await Company.findOne({ apiKey: finalApiKey });
    if (!company)
      return res.status(404).json({ success: false, error: "Invalid company API key" });

    // 🧠 السياق الموحد
    const context = await getCompanyAIContext(company);

    // 🕒 الحصول على الذاكرة (Memory)
    const userId = req.body.userId || req.body.sessionId || "Guest/Public";
    const history = await getChatHistory(company._id, userId, 'web', 5);
    const historyContext = formatHistoryForPrompt(history);

    // ✅ إرسال الطلب لموديل AI واستخدام الذاكرة والسياق الموحد
    const fullQuestion = `${context}\n\n${historyContext}User Question:\n${prompt}`;
    
    // استخدام الدالة الموحدة المدمج بها Fallback
    const reply = await fetchAiResponse(fullQuestion, "لم يتم الحصول على رد من الذكاء الاصطناعي.");
    // 💾 حفظ المحادثة في قاعدة البيانات
    const CompanyChat = (await import("../models/CompanyChat.js")).default;

    // Save user message
    await CompanyChat.create({
      company: company._id,
      user: userId,
      text: prompt,
      sender: 'user',
      platform: 'web'
    });

    // Save AI response
    await CompanyChat.create({
      company: company._id,
      user: userId,
      text: reply,
      sender: 'ai',
      platform: 'web'
    });

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
 * 🏢 Fetch all companies for showcase
 */
router.get("/companies", async (req, res) => {
  try {
    const companies = await Company.find({}, "name description industry apiKey");
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

export default router;
