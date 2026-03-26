import express from 'express';
import axios from 'axios';
import { requireAuth } from '../middleware/auth.js';
import Company from '../models/company.js';
import CompanyChat from '../models/CompanyChat.js';
import { extractCorexReply } from '../utils/corexHelper.js';

const router = express.Router();

// @route   GET /api/chat/conversations
// @desc    Get list of all conversations (unique users) for the authenticated company
// @access  Private (Owner only)
router.get('/conversations', requireAuth, async (req, res) => {
    try {
        // Find company owned by the user
        const company = await Company.findOne({ owner: req.user._id });
        if (!company) {
            return res.status(404).json({ error: 'Company not found' });
        }

        // Aggregate to find unique users and their last message
        const conversations = await CompanyChat.aggregate([
            { $match: { company: company._id } },
            { $sort: { createdAt: -1 } },
            {
                $group: {
                    _id: "$user",
                    lastMessage: { $first: "$text" },
                    updatedAt: { $first: "$createdAt" },
                    unreadCount: {
                        $sum: {
                            $cond: [{ $and: [{ $eq: ["$sender", "user"] }, { $eq: ["$read", false] }] }, 1, 0]
                        }
                    },
                    platform: { $first: "$platform" }
                }
            },
            { $sort: { updatedAt: -1 } }
        ]);

        // Map to friendlier format
        // Note: 'read' field isn't in schema yet, unreadCount will be 0 or needs schema update. 
        // For now, let's assume all are read or just ignore unread count logic until we add 'read' field.

        const formattedConversations = conversations.map(c => ({
            id: c._id, // User identifier (phone or name)
            name: c._id,
            lastMessage: c.lastMessage,
            time: c.updatedAt,
            unread: 0, // Placeholder
            platform: c.platform || 'web'
        }));

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

        const messages = await CompanyChat.find({
            company: company._id,
            user: userId
        }).sort({ createdAt: 1 });

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

        // Fetch recent messages
        const messages = await CompanyChat.find({
            company: company._id,
            user: userId
        }).sort({ createdAt: -1 }).limit(20);

        if (messages.length === 0) {
            return res.status(400).json({ error: 'No messages found to train on' });
        }

        const chatContext = messages.reverse().map(m => `${m.sender === 'user' ? 'Customer' : 'AI'}: ${m.text}`).join('\n');

        const prompt = `Here is a conversation between a Customer and an AI assistant for a company:\n\n${chatContext}\n\nBased on this conversation, extract 1 or 2 concise, generalized instructions or facts to add to the AI's system prompt so it can better handle similar customers in the future. Just provide the specific new instructions/knowledge without surrounding text.`;

        const fullQuestion = `System: Extract knowledge from this chat.\n\nUser Question:\n${prompt}`;
        const apiUrl = process.env.COREX_API_URL || "https://dev-c7z.pantheonsite.io/CoreSys/chat.php";
        const apiKey = process.env.COREX_API_KEY || "AITHORV1_6F85B401ED";
        const requestUrl = `${apiUrl}?key=${apiKey}&act=assistant&a=${encodeURIComponent(fullQuestion)}`;

        const response = await axios.get(requestUrl);

        const newInstruction = extractCorexReply(response.data, null);

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
