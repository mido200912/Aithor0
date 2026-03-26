import express from 'express';
import axios from 'axios';
import { requireAuth } from '../middleware/auth.js';
import Integration from '../models/Integration.js';
import Company from '../models/company.js';

const router = express.Router();

// @route   GET /api/integration-manager
// @desc    Get all integrations for the authenticated user's company
// @access  Private
router.get('/', requireAuth, async (req, res) => {
    try {
        const company = await Company.findOne({ owner: req.user._id });
        if (!company) {
            return res.status(404).json({ error: 'Company not found' });
        }

        const integrations = await Integration.find({ company: company._id });

        // Format the response to include status and basic info
        const formattedIntegrations = integrations.map(int => ({
            id: int._id,
            platform: int.platform,
            isActive: int.isActive,
            createdAt: int.createdAt,
            settings: int.settings,
            // Don't expose sensitive credentials
            hasCredentials: !!(int.credentials && int.credentials.accessToken)
        }));

        res.json(formattedIntegrations);
    } catch (error) {
        console.error('Error fetching integrations:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// @route   DELETE /api/integration-manager/:id
// @desc    Delete/disconnect an integration
// @access  Private
router.delete('/:id', requireAuth, async (req, res) => {
    try {
        const company = await Company.findOne({ owner: req.user._id });
        if (!company) {
            return res.status(404).json({ error: 'Company not found' });
        }

        const integration = await Integration.findOne({
            _id: req.params.id,
            company: company._id
        });

        if (!integration) {
            return res.status(404).json({ error: 'Integration not found' });
        }

        // TODO: Unregister webhooks from the platform if needed

        await Integration.findByIdAndDelete(req.params.id);

        res.json({ message: 'Integration deleted successfully' });
    } catch (error) {
        console.error('Error deleting integration:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// @route   PATCH /api/integration-manager/:id/toggle
// @desc    Toggle integration active status
// @access  Private
router.patch('/:id/toggle', requireAuth, async (req, res) => {
    try {
        const company = await Company.findOne({ owner: req.user._id });
        if (!company) {
            return res.status(404).json({ error: 'Company not found' });
        }

        const integration = await Integration.findOne({
            _id: req.params.id,
            company: company._id
        });

        if (!integration) {
            return res.status(404).json({ error: 'Integration not found' });
        }

        integration.isActive = !integration.isActive;
        await integration.save();

        res.json({
            message: `Integration ${integration.isActive ? 'activated' : 'deactivated'}`,
            isActive: integration.isActive
        });
    } catch (error) {
        console.error('Error toggling integration:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// @route   POST /api/integration-manager/whatsapp
// @desc    Manually configure WhatsApp
// @access  Private
router.post('/whatsapp', requireAuth, async (req, res) => {
    try {
        const { phoneNumberId, accessToken } = req.body;
        
        if (!phoneNumberId || !accessToken) {
            return res.status(400).json({ error: 'Phone Number ID and Access Token are required' });
        }

        const company = await Company.findOne({ owner: req.user._id });
        if (!company) {
            return res.status(404).json({ error: 'Company not found' });
        }

        const integration = await Integration.findOneAndUpdate(
            { company: company._id, platform: 'whatsapp' },
            {
                credentials: {
                    phoneNumberId,
                    accessToken
                },
                isActive: true
            },
            { new: true, upsert: true }
        );

        res.json({ message: 'WhatsApp integrated successfully', integration });
    } catch (error) {
        console.error('WhatsApp integration error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// @route   POST /api/integration-manager/telegram
// @desc    Manually configure Telegram with Bot Token and Custom Commands
// @access  Private
router.post('/telegram', requireAuth, async (req, res) => {
    try {
        const { botToken, commands } = req.body;
        
        if (!botToken) {
            return res.status(400).json({ error: 'Telegram Bot Token is required' });
        }

        const company = await Company.findOne({ owner: req.user._id });
        if (!company) {
            return res.status(404).json({ error: 'Company not found' });
        }

        // Set webhook for the bot
        const baseUrl = process.env.BASE_URL || 'https://aithor0.vercel.app';
        if (!baseUrl) {
            console.error('❌ BASE_URL is missing in environment variables');
            return res.status(500).json({ error: 'Server configuration error (BASE_URL missing)' });
        }
        
        const webhookUrl = `${baseUrl}/api/integrations/webhooks/telegram/${company._id}`;
        
        try {
            console.log('🔗 Setting Telegram Webhook to:', webhookUrl);
            await axios.post(`https://api.telegram.org/bot${botToken}/setWebhook`, {
                url: webhookUrl
            });

            // Set custom commands on Telegram
            if (commands && Array.isArray(commands) && commands.length > 0) {
                const tgCommands = commands
                    .filter(c => c.command) // Ensure command name exists
                    .map(c => ({
                        command: c.command.toLowerCase().replace(/[^a-z0-9_]/g, ''), // Telegram allows only a-z, 0-9 and _
                        description: (c.description || c.category || "فتح " + c.command).substring(0, 255) // Max 256 chars
                    }));

                if (tgCommands.length > 0) {
                    await axios.post(`https://api.telegram.org/bot${botToken}/setMyCommands`, {
                        commands: tgCommands
                    });
                }
            }
        } catch (tgError) {
            console.error('❌ Telegram API error:', tgError.response?.data || tgError.message);
            const tgErrMsg = tgError.response?.data?.description || 'Invalid Bot Token or Telegram error';
            return res.status(400).json({ error: tgErrMsg });
        }

        // Sanitize and fully preserve all command fields
        const sanitizedSettingsCommands = (commands || []).map(c => ({
            command: (c.command || '').toLowerCase().replace(/[^a-z0-9_]/g, ''),
            description: c.description || c.category || '',
            category: c.category || '',
            type: c.type || 'ai',
            message: c.message || '',
            successMessage: c.successMessage || '',
            products: c.products || [] // Keep original products array from frontend
        }));

        // Fix nested array saving by switching to findOne + save()
        let integration = await Integration.findOne({ company: company._id, platform: 'telegram' });
        
        if (!integration) {
            integration = new Integration({ 
                company: company._id, 
                platform: 'telegram' 
            });
        }
        
        integration.credentials = { botToken };
        integration.settings = { commands: sanitizedSettingsCommands };
        
        // Force Mongoose to recognize the nested structure change
        integration.markModified('settings');
        integration.isActive = true;

        await integration.save();

        res.json({ message: 'Telegram configured and Webhook linked successfully!', integration });
    } catch (error) {
        console.error('Telegram integration error:', error);
        res.status(500).json({ error: 'Server error configure Telegram' });
    }
});

export default router;
