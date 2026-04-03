import express from "express";
import axios from "axios";
import { requireAuth } from "../middleware/auth.js";
import Company from "../models/company.js";
import { extractCorexReply, fetchAiResponse } from "../utils/corexHelper.js";
import { getChatHistory, formatHistoryForPrompt } from "../utils/chatHistoryHelper.js";
import { getCompanyAIContext } from "../utils/promptHelper.js";
import CompanyChat from "../models/CompanyChat.js";

const router = express.Router();

router.post("/", requireAuth, async (req, res) => {
  try {
    const { prompt } = req.body;

    // جلب بيانات الشركة الخاصة بالمستخدم
    const company = await Company.findOne({ owner: req.user._id });
    
    // 🧠 استخدام المساعد الموحد لإنشاء السياق
    const context = await getCompanyAIContext(company);

    // Save user message to history

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
