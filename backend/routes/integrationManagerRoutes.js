import express from 'express';
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

export default router;
