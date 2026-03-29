import express from "express";
import axios from "axios";
import { requireAuth } from "../middleware/auth.js";
import Company from "../models/company.js";
import { extractCorexReply, fetchAiResponse } from "../utils/corexHelper.js";
import { getChatHistory, formatHistoryForPrompt } from "../utils/chatHistoryHelper.js";
import CompanyChat from "../models/CompanyChat.js";

const router = express.Router();

router.post("/", requireAuth, async (req, res) => {
  try {
    const { prompt } = req.body;

    // جلب بيانات الشركة الخاصة بالمستخدم
    const company = await Company.findOne({ owner: req.user._id });
    const Project = (await import("../models/Project.js")).default; // Dynamic import to avoid circular dependency if any
    const projects = await Project.find({ companyId: company._id });

    // تجميع بيانات المنتجات
    const productsInfo = projects.map(p => {
      return `Project: ${p.name}\nProducts: ${p.products.map(prod => `- ${prod.title} (${prod.price} $)`).join(", ")}`;
    }).join("\n\n");

    // ✨ استخدام extractedKnowledge بدلاً من معالجة الملفات
    const knowledgeContext = company.extractedKnowledge ||
      "لا توجد معلومات إضافية متاحة حالياً.";

    // توليد النص المرسل للذكاء الاصطناعي
    // توليد النص المرسل للذكاء الاصطناعي
    let context = "You are a general business assistant.";

    if (company) {
      const parts = [
        `You are a specialized AI assistant representing the company "${company.name || 'N/A'}".`,
        "",
        "🔴 CRITICAL INSTRUCTIONS:",
        "1. DO NOT ANSWER any questions outside your company scope. You are only programmed to help with this company's products, services, and information.",
        "2. If a user asks you for general tasks (e.g., 'make me a website', 'write a general code', 'tell me a joke') or anything unrelated to this company, YOU MUST REFUSE.",
        "3. REFUSAL MESSAGE (in Arabic or English, matching user language): 'عذراً، لا يمكنني القيام بذلك. أنا مبرمج للإجابة فقط على الاستفسارات المتعلقة بخدمات ومنتجات هذه الشركة ومساعدة عملائها.'",
        "4. DO NOT explain why or give general advice. Just refuse politely as per instruction #3.",
        "",
        "Company Information:",
        `- Industry: ${company.industry || "N/A"}`,
        `- Description: ${company.description || "No description"}`,
        `- Vision: ${company.vision || "No vision"}`,
        `- Mission: ${company.mission || "No mission"}`,
        `- Values: ${(company.values || []).join(", ") || "No values"}`,
        "",
        "Available Products/Services:",
        productsInfo || "No specific products listed.",
        "",
        "Knowledge Base (Use only this for factual answers):",
        knowledgeContext,
        "",
        "Custom Instructions (Follow these exactly):",
        company.customInstructions || "Respond to customers naturally and professionally.",
        "",
        "Language: Respond in the user's language (Arabic/English)."
      ];

      context = parts.join("\n");
    }

    // Save user message to history
    if (company) {
        await CompanyChat.create({
            company: company._id,
            user: req.user._id.toString(),
            text: prompt,
            sender: 'user',
            platform: 'web'
        });
    }

    const history = await getChatHistory(company?._id, req.user._id.toString(), 'web', 5);
    const historyContext = formatHistoryForPrompt(history);

    const fullQuestion = `${context}\n\n${historyContext}User Question:\n${prompt}`;
    
    // استخدام الدالة الموحدة المدمج بها Fallback
    const reply = await fetchAiResponse(fullQuestion, "حدث خطأ أثناء الاتصال بالذكاء الاصطناعي.");

    // Save AI reply to history
    if (company) {
        await CompanyChat.create({
            company: company._id,
            user: req.user._id.toString(),
            text: reply,
            sender: 'ai',
            platform: 'web'
        });
    }

    res.json({ reply });

  } catch (error) {
    console.error(error.response?.data || error.message);
    res.status(500).json({ error: "AI service error" });
  }
});

export default router;
