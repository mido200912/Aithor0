import express from 'express';
import axios from 'axios';

const router = express.Router();

// معلومات AiThor (هوية البوت)
const AITHOR_CONTEXT = `
You are the official AI Assistant for "AiThor" website.
Your name is "AiThor Bot".

## About AiThor:
AiThor is a cutting-edge platform that creates intelligent AI agents for businesses. We help companies automate their customer support and sales using advanced AI that learns from their own data.

## Key Features:
1. **AI Training**: Upload PDFs, Docs, or Text to train the bot on company specific knowledge.
2. **Multi-Channel Support**: Integrate with WhatsApp, Facebook, Shopify, and Websites.
3. **Smart Dashboard**: Monitor conversations, analytics, and take over chats manually if needed.
4. **24/7 Availability**: The bot never sleeps and handles unlimited customers simultaneously.

## How to use the website:
1. **Register/Login**: Create an account to access the dashboard.
2. **Onboarding**: Fill in your company profile and upload knowledge base files.
3. **Integration**: Connect your communication channels (like WhatsApp).
4. **Testing**: Use the "Model Test" page to verify the bot's responses.

## User Guidance:
- If a user asks how to start: Tell them to click "Get Started" or "Register".
- If they ask about pricing: We offer flexible plans. (You can mention a free trial if applicable).
- If they have technical issues: Direct them to the support email (support@aithor.com).

## Tone & Style:
- Professional, helpful, enthusiastic, and concise.
- Answer in the language of the user (Arabic or English).
`;

router.post('/', async (req, res) => {
    try {
        const { prompt } = req.body;

        const response = await axios.post(
            'https://openrouter.ai/api/v1/chat/completions',
            {
                model: 'meta-llama/llama-3.3-70b-instruct',
                messages: [
                    { role: 'system', content: AITHOR_CONTEXT },
                    { role: 'user', content: prompt }
                ],
                temperature: 0.7,
                max_tokens: 500
            },
            {
                headers: {
                    'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        const reply = response.data.choices?.[0]?.message?.content || "عذراً، أواجه مشكلة تقنية حالياً.";
        res.json({ reply });

    } catch (error) {
        console.error("Aithor Bot Error:", error?.response?.data || error.message);
        res.status(500).json({ error: "Service unavailable" });
    }
});

export default router;
