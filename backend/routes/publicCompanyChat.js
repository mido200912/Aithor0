// routes/publicCompanyChat.js
import express from "express";
import axios from "axios";
import Company from "../models/company.js";

const router = express.Router();

/**
 * 🧠 Chat with AI using specific company API key
 */
router.post("/chat", async (req, res) => {
  try {
    const { companyApiKey, prompt } = req.body;

    if (!companyApiKey || !prompt)
      return res.status(400).json({ success: false, error: "Missing parameters" });

    // ✅ احضار الشركة بناءً على الـ API Key
    const company = await Company.findOne({ apiKey: companyApiKey });
    if (!company)
      return res.status(404).json({ success: false, error: "Invalid company API key" });

    // احضار المنتجات والمشاريع المرتبطة بمالك الشركة
    const Project = (await import("../models/Project.js")).default;
    const projects = await Project.find({ owner: company.owner });

    // ✅ تجميع بيانات المنتجات
    const productsInfo = projects.map(p => {
      return `Project: ${p.name}\nProducts: ${p.products.map(prod => `- ${prod.title} (${prod.price} $)`).join(", ")}`;
    }).join("\n\n");

    // ✨ استخدام extractedKnowledge
    const knowledgeContext = company.extractedKnowledge ||
      "لا توجد معلومات إضافية متاحة حالياً.";

    // 🧠 إنشاء السياق الكامل للذكاء الاصطناعي
    const context = `You are an AI customer service assistant for "${company.name || 'this company'}".

Company Information:
- Industry: ${company.industry || "N/A"}
- Description: ${company.description || "No description"}
- Vision: ${company.vision || "No vision"}
- Mission: ${company.mission || "No mission"}
- Values: ${(company.values || []).join(", ") || "No values"}

Available Products/Services:
${productsInfo || "No specific products listed."}

Knowledge Base (Use this to answer customer questions):
${knowledgeContext}

Custom Instructions (Follow these):
${company.customInstructions || "Respond to customers naturally and professionally using the information above. If you don't know something, say so politely."}

Language: Respond in the same language as the customer's query (Arabic or English).
`;

    // ✅ إرسال الطلب لموديل OpenRouter باستخدام مفتاح AiThor الأساسي فقط
    const response = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model: "google/gemini-2.0-flash-exp",
        messages: [
          { role: "system", content: context },
          { role: "user", content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 400,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    const reply =
      response.data?.choices?.[0]?.message?.content ||
      "لم يتم الحصول على رد من الذكاء الاصطناعي.";

    // 💾 حفظ المحادثة في قاعدة البيانات
    const CompanyChat = (await import("../models/CompanyChat.js")).default;

    // Save user message
    await CompanyChat.create({
      company: company._id,
      user: "Guest/Public",
      text: prompt,
      sender: 'user',
      platform: 'web'
    });

    // Save AI response
    await CompanyChat.create({
      company: company._id,
      user: "Guest/Public",
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
