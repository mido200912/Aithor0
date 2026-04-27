import express from "express";
import Company from "../models/company.js";
import { requireAuth } from "../middleware/auth.js";
import { fetchDesignerAiResponse } from "../utils/corexHelper.js";
import { getChatbotTemplate } from "../utils/chatbotTemplates.js";

const router = express.Router();

/*-------------------------------
  Get current chatbot code (for editor)
-------------------------------*/
router.get("/current", requireAuth, async (req, res) => {
  try {
    const company = await Company.findOne({ owner: req.user._id });
    if (!company) return res.status(404).json({ error: "Company not found" });

    const htmlContent = company.websiteConfig?.htmlContent || getChatbotTemplate('default', company);

    res.json({
      htmlContent,
      slug: company.slug,
      name: company.name,
      logo: company.logo || ''
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/*-------------------------------
  AI-powered chatbot editor
-------------------------------*/
router.post("/edit", requireAuth, async (req, res) => {
  try {
    const { userRequest, history } = req.body;
    if (!userRequest) return res.status(400).json({ error: "Request is required" });

    const company = await Company.findOne({ owner: req.user._id });
    if (!company) return res.status(404).json({ error: "Company not found" });

    const currentHtml = company.websiteConfig?.htmlContent || getChatbotTemplate('default', company);

    // Format chat history for context
    const historyContext = (history || [])
      .slice(-6) // Keep last 6 messages
      .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
      .join('\n');

    const systemPrompt = `You are "VOXIO Designer Pro", a world-class UI/UX Designer and Lead Frontend Engineer.
You specialize in creating "stunning", "premium", and "state-of-the-art" web interfaces.
You speak all languages fluently. Always reply in the same language the user uses.

The user owns a company called "${company.name}". You are editing their public chatbot page.

GOAL: Modify the provided HTML code to fulfill the user's request while maintaining a high-end, premium aesthetic.

STYLE GUIDELINES for "Premium" Design:
1. COLORS: Use sophisticated palettes. Avoid flat colors. Use gradients, deep shadows, and glows.
2. GLASSMORPHISM: Use backdrop-filter: blur(), subtle borders (1px solid rgba(255,255,255,0.1)), and semi-transparent backgrounds.
3. TYPOGRAPHY: Use 'Cairo' for Arabic and 'Inter' or 'Poppins' for English. Ensure hierarchy with font-weights and sizes.
4. ANIMATIONS: Add smooth transitions, hover effects, and subtle entry animations (fade-in, slide-up).
5. RESPONSIVENESS: Ensure the design looks perfect on all screen sizes.

CRITICAL TECHNICAL RULES:
- RESPOND WITH ONLY RAW JSON (NO EXPLANATION, NO MARKDOWN):
  {"message": "Concise description of changes in the user's language", "code": "The FULL updated HTML file"}
- PRESERVE FUNCTIONALITY: Never remove or break the IDs: chat-box, user-input, send-btn.
- PRESERVE LOGIC: Keep the <script> section that handles fetching and sending messages. You can style the elements, but don't break the 'async function send()' or 'append()' logic.
- COMPLETE CODE: Always return the full HTML starting from <!DOCTYPE html>.
- CREATIVITY: If the user says "make it better", use your designer expertise to add professional touches like gradients, shadows, or refined spacing.`;

    const userPrompt = `Existing code:
${currentHtml}

Conversation history for context:
${historyContext}

Current User Request: ${userRequest}

Remember: Modify the code to fulfill the current request while respecting the context of previous changes.`;

    console.log("🤖 Chatbot Editor: Sending to AI...");
    const aiResult = await fetchDesignerAiResponse(systemPrompt, userPrompt, "Failed to process request.");
    
    // Parse AI response JSON
    let parsed;
    try {
      let cleaned = aiResult;
      cleaned = cleaned.replace(/```json\s*/gi, '').replace(/```html\s*/gi, '').replace(/```\s*/gi, '');

      const startIdx = cleaned.indexOf('{');
      const endIdx = cleaned.lastIndexOf('}');
      if (startIdx !== -1 && endIdx !== -1) {
        parsed = JSON.parse(cleaned.substring(startIdx, endIdx + 1));
      } else {
        throw new Error("No JSON found in AI response");
      }
    } catch (e) {
      console.error("🤖 AI Parse Error:", aiResult.substring(0, 500));
      return res.status(500).json({ error: "فشل التعديل، حاول تاني", details: aiResult.substring(0, 300) });
    }

    if (!parsed.message || !parsed.code) {
      return res.status(500).json({ error: "فشل التعديل، حاول تاني" });
    }

    // Save updated HTML using the instance method
    company.websiteConfig = {
      ...company.websiteConfig,
      htmlContent: parsed.code
    };
    await company.save();

    res.json({ message: parsed.message, code: parsed.code });
  } catch (err) {
    console.error("🤖 Chatbot Editor Edit Error:", err);
    res.status(500).json({ error: "فشل التعديل، حاول تاني", details: err.message });
  }
});

/*-------------------------------
  Reset chatbot to default template
-------------------------------*/
router.post("/reset", requireAuth, async (req, res) => {
  try {
    const company = await Company.findOne({ owner: req.user._id });
    if (!company) return res.status(404).json({ error: "Company not found" });

    const { templateId } = req.body;
    const defaultHtml = getChatbotTemplate(templateId || 'default', company);
    company.websiteConfig = {
      ...company.websiteConfig,
      htmlContent: defaultHtml
    };
    await company.save();

    res.json({ message: "تم إعادة التصميم للقالب الأصلي بنجاح ✅", code: defaultHtml });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/*-------------------------------
  Public chatbot page data
-------------------------------*/
router.get("/page/:slug", async (req, res) => {
  try {
    const { slug } = req.params;
    const company = await Company.findOne({ slug });
    if (!company) return res.status(404).json({ error: "Company not found" });

    const htmlContent = company.websiteConfig?.htmlContent || getChatbotTemplate('default', company);

    res.json({
      htmlContent,
      name: company.name,
      logo: company.logo || '',
      slug: company.slug
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/*-------------------------------
  Manual Save code
-------------------------------*/
router.post("/save", requireAuth, async (req, res) => {
  try {
    const { htmlContent } = req.body;
    const company = await Company.findOne({ owner: req.user._id });
    if (!company) return res.status(404).json({ error: "Company not found" });

    company.websiteConfig = {
      ...(company.websiteConfig || {}),
      htmlContent: htmlContent
    };
    await company.save();

    res.json({ message: "تم حفظ الكود بنجاح ✅" });
  } catch (err) {
    console.error("🤖 Chatbot Editor Save Error:", err);
    res.status(500).json({ error: err.message });
  }
});

/*-------------------------------
  Get available templates
-------------------------------*/
router.get("/templates", requireAuth, async (req, res) => {
  res.json({
    templates: [
      { id: 'default', name: 'الافتراضي (Classic Night)', thumbnail: '/image.png' },
      { id: 'glassmorphism', name: 'الزجاجي (Glass Bloom)', thumbnail: '/image copy.png' },
      { id: 'luxury', name: 'الملكي (Royal Gold)', thumbnail: '/image copy 2.png' },
      { id: 'cyberpunk', name: 'المستقبلي (Cyber Neon)', thumbnail: '/image copy 3.png' }
    ]
  });
});

export default router;
