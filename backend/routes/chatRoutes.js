import express from "express";
import axios from "axios";
import { requireAuth } from "../middleware/auth.js";
import Company from "../models/company.js";

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
        `You are an AI assistant representing the company "${company.name || 'N/A'}".`,
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
        "Knowledge Base (Important - Use this information to answer questions):",
        knowledgeContext,
        "",
        "Custom Instructions (CRITICAL - Follow these exactly):",
        company.customInstructions || "Respond to customers naturally and professionally, based only on the information provided above.",
        "",
        "Language: Respond in the language of the user's prompt (default to Arabic if applicable)."
      ];

      context = parts.join("\n");
    }

    // إرسال الطلب إلى OpenRouter
    const response = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model: "meta-llama/llama-3.3-70b-instruct", // نموذج مجاني وفعال
        messages: [
          { role: "system", content: context },
          { role: "user", content: prompt },
        ],
      },
      {
        headers: {
          "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    const reply = response.data.choices?.[0]?.message?.content || "لم أتمكن من الرد حالياً.";
    res.json({ reply });

  } catch (error) {
    console.error(error.response?.data || error.message);
    res.status(500).json({ error: "AI service error" });
  }
});

export default router;
