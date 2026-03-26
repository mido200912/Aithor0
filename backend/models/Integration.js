import mongoose from 'mongoose';

const integrationSchema = mongoose.Schema({
    company: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Company',
        required: true
    },
    platform: {
        type: String,
        enum: ['facebook', 'instagram', 'whatsapp', 'shopify', 'telegram'],
        required: true
    },
    credentials: {
        accessToken: String,
        refreshToken: String,
        pageId: String,
        adAccountId: String,
        userAccessToken: String, // For Meta
        phoneNumberId: String, // For WhatsApp
        shopUrl: String, // For Shopify
        botToken: String, // For Telegram
        webhookSecret: String,
        expiresAt: Date
    },
    isActive: {
        type: Boolean,
        default: true
    },
    settings: {
        autoReply: {
            type: Boolean,
            default: true
        },
        syncProducts: {
            type: Boolean,
            default: false
        },
        commands: [{
            command: String,      // e.g. "shopping"
            description: String,  // shown in bot menu
            category: String,     // dashboard category label
            type: {
                type: String,
                enum: ['ai', 'fixed_message', 'product_menu'],
                default: 'ai'
            },
            // For fixed_message: send this text to the user
            message: String,
            // For success: message after phone number
            successMessage: String,
            // For product_menu: show these as inline buttons
            products: [{
                name: String,
                price: String,
                description: String
            }]
        }]
    }
}, {
    timestamps: true
});

// Ensure one integration per platform per company
integrationSchema.index({ company: 1, platform: 1 }, { unique: true });

const Integration = mongoose.model('Integration', integrationSchema);

export default Integration;
