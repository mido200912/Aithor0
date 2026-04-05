import express from 'express';
import axios from 'axios';
import { requireAuth } from '../middleware/auth.js';
import Company from '../models/company.js';
import CompanyChat from '../models/CompanyChat.js';
import { extractCorexReply, fetchAiResponse } from '../utils/corexHelper.js';

const router = express.Router();

// @route   GET /api/chat/conversations
// @desc    Get list of all conversations (unique users) for the authenticated company
// @access  Private (Owner only)
router.get('/conversations', requireAuth, async (req, res) => {
    try {
        const company = await Company.findOne({ owner: req.user._id });
        if (!company) {
            return res.status(404).json({ error: 'Company not found' });
        }

        // Fetch all messages for this company
        const allMessages = await CompanyChat.find({ company: company._id });

        // Group by user using plain JS (no aggregate needed)
        const userMap = {};
        for (const msg of allMessages) {
            const uid = msg.user;
            if (!userMap[uid]) {
                userMap[uid] = { lastMessage: msg.text, updatedAt: msg.createdAt, platform: msg.platform };
            } else {
                const existing = new Date(userMap[uid].updatedAt).getTime();
                const current = new Date(msg.createdAt).getTime();
                if (current > existing) {
                    userMap[uid] = { lastMessage: msg.text, updatedAt: msg.createdAt, platform: msg.platform };
                }
            }
        }

        const formattedConversations = Object.entries(userMap)
            .map(([uid, data]) => ({
                id: uid,
                name: uid,
                lastMessage: data.lastMessage,
                time: data.updatedAt,
                unread: 0,
                platform: data.platform || 'web'
            }))
            .sort((a, b) => new Date(b.time) - new Date(a.time));

        res.json(formattedConversations);
    } catch (error) {
        console.error('Error fetching conversations:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// @route   GET /api/chat/history/:userId
// @desc    Get chat history with a specific user
// @access  Private (Owner only)
router.get('/history/:userId', requireAuth, async (req, res) => {
    try {
        const { userId } = req.params;
        const company = await Company.findOne({ owner: req.user._id });
        if (!company) {
            return res.status(404).json({ error: 'Company not found' });
        }

        const messages = await CompanyChat.find({ company: company._id, user: userId });
        // Sort by createdAt ascending (oldest first)
        messages.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

        res.json(messages);
    } catch (error) {
        console.error('Error fetching chat history:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// @route   POST /api/chat/send
// @desc    Send a message to a user (Manual reply from dashboard)
// @access  Private
router.post('/send', requireAuth, async (req, res) => {
    try {
        const { userId, text } = req.body; // userId is the customer identifier
        const company = await Company.findOne({ owner: req.user._id });

        if (!company) return res.status(404).json({ error: 'Company not found' });

        // Save message to DB
        const newMessage = await CompanyChat.create({
            company: company._id,
            user: userId,
            text: text,
            sender: 'ai', // OR 'agent' - but let's use 'ai' or maybe 'agent' if we add it to enum
            platform: 'web' // Default for now, or fetch from conversation context
        });

        // TODO: If it's WhatsApp/Meta, we need to actually SEND it via their API.
        // For now, we just save it to DB so it appears in the UI (MVP).
        // Real implementation would look up the platform and call the respective API.

        res.json(newMessage);
    } catch (error) {
        console.error('Error sending message:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// @route   POST /api/support-chat/train
// @desc    Extract instructions from a chat to improve the model
// @access  Private
router.post('/train', requireAuth, async (req, res) => {
    try {
        const { userId } = req.body;
        const company = await Company.findOne({ owner: req.user._id });

        if (!company) return res.status(404).json({ error: 'Company not found' });

        // Fetch messages using plain JS sort and slice
        let messages = await CompanyChat.find({ company: company._id, user: userId });
        messages.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        messages = messages.slice(0, 20);

        if (messages.length === 0) {
            return res.status(400).json({ error: 'No messages found to train on' });
        }

        const chatContext = messages.reverse().map(m => `${m.sender === 'user' ? 'Customer' : 'AI'}: ${m.text}`).join('\n');

        const prompt = `Here is a conversation between a Customer and an AI assistant for a company:\n\n${chatContext}\n\nBased on this conversation, extract 1 or 2 concise, generalized instructions or facts to add to the AI's system prompt so it can better handle similar customers in the future. Just provide the specific new instructions/knowledge without surrounding text.`;

        const fullQuestion = `System: Extract knowledge from this chat.\n\nUser Question:\n${prompt}`;

        // استخدام الدالة الموحدة المدمج بها Fallback
        const newInstruction = await fetchAiResponse(fullQuestion, null);

        if (!newInstruction) {
            return res.status(500).json({ error: 'Failed to extract instructions' });
        }

        // Append to extractedKnowledge
        company.extractedKnowledge = (company.extractedKnowledge || '') + '\n' + newInstruction;
        await company.save();

        res.json({ success: true, message: 'تم تدريب النموذج بنجاح!', addedInstruction: newInstruction });
    } catch (error) {
        console.error('Error training from chat:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

export default router;
