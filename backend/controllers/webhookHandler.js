import axios from 'axios';
import Integration from '../models/Integration.js';
import Company from '../models/company.js';
import { fetchAiResponse } from '../utils/corexHelper.js';

// تتبع الرسائل المعالجة لمنع التكرار
const processedMessages = new Set();

// ─── Helper: send Telegram message ──────────────────────────────────────────
async function tgSend(botToken, chatId, text, extra = {}) {
    await axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        ...extra
    });
}

// ─── Helper: send Telegram message with inline product buttons ───────────────
async function tgSendProductMenu(botToken, chatId, products, introText = 'اختر المنتج الذي تريده:') {
    const keyboard = products.map(p => ([{
        text: `${p.name}${p.price ? ` - ${p.price}` : ''}`,
        callback_data: `order:${p.name}`
    }]));

    await axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        chat_id: chatId,
        text: introText,
        parse_mode: 'HTML',
        reply_markup: { inline_keyboard: keyboard }
    });
}

// ─── Save chat message to DB ──────────────────────────────────────────────────
async function saveChatMsg(companyId, userId, text, sender, platform = 'telegram') {
    const CompanyChat = (await import('../models/CompanyChat.js')).default;
    await CompanyChat.create({ company: companyId, user: userId, text, sender, platform });
}

/**
 * معالج الرسائل الواردة من WhatsApp
 */
export const handleWhatsAppMessage = async (body) => {
    try {
        if (body.object !== 'whatsapp_business_account') return;

        for (const entry of body.entry) {
            for (const change of entry.changes) {
                if (change.field === 'messages') {
                    const value = change.value;
                    if (value.statuses) continue;

                    if (value.messages && value.messages.length > 0) {
                        const message = value.messages[0];
                        const messageId = message.id;
                        const from = message.from;
                        const messageText = message.text?.body;
                        const phoneNumberId = value.metadata.phone_number_id;

                        if (processedMessages.has(messageId)) continue;
                        processedMessages.add(messageId);
                        if (processedMessages.size > 1000) processedMessages.delete(processedMessages.values().next().value);

                        const integration = await Integration.findOne({
                            'credentials.phoneNumberId': phoneNumberId,
                            platform: 'whatsapp',
                            isActive: true
                        }).populate('company');

                        if (!integration || !integration.company) continue;

                        const company = integration.company;
                        const accessToken = integration.credentials.accessToken;

                        const context = `
أنت مساعد ذكي تمثل شركة "${company.name}".
المجال: ${company.industry || "غير محدد"}.
وصف الشركة: ${company.description || "لا يوجد وصف"}.
الرؤية: ${company.vision || "غير محددة"}.
الرسالة: ${company.mission || "غير محددة"}.
تحدث بالعربية وكأنك ممثل حقيقي للشركة. كن مفيداً ومهذباً.
                        `.trim();

                        const reply = await fetchAiResponse(`${context}\n\nUser Question:\n${messageText}`);

                        const CompanyChat = (await import('../models/CompanyChat.js')).default;
                        await CompanyChat.create({ company: company._id, user: from, text: messageText, sender: 'user', platform: 'whatsapp' });

                        try {
                            await axios.post(
                                `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
                                { messaging_product: "whatsapp", to: from, text: { body: reply } },
                                { headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" } }
                            );
                            await CompanyChat.create({ company: company._id, user: from, text: reply, sender: 'ai', platform: 'whatsapp' });
                        } catch (sendError) {
                            console.error(`❌ Failed to send WA reply:`, sendError.response?.data || sendError.message);
                        }
                    }
                }
            }
        }
    } catch (error) {
        console.error('❌ Error handling WhatsApp message:', error.message);
        throw error;
    }
};

/**
 * معالج الرسائل الواردة من Telegram
 * يدعم:
 *  - أوامر AI (الرد التلقائي بالذكاء الاصطناعي)
 *  - أوامر fixed_message (رسالة ثابتة من الشركة)
 *  - أوامر product_menu (قائمة منتجات بأزرار)
 *  - callback_query (لما العميل يضغط على زر منتج)
 *  - رسائل عادية (AI)
 */
export const handleTelegramWebhook = async (req, res) => {
    try {
        const { companyId } = req.params;
        const body = req.body;

        // ── Handle Callback Query (button click) ──────────────────────────────
        if (body.callback_query) {
            const cb = body.callback_query;
            const chatId = cb.message.chat.id;
            const data = cb.data || '';
            const user = cb.from?.username || cb.from?.first_name || 'عميل';
            const userId = chatId.toString();

            // Answer callback to remove loading spinner
            // We'll move the answerCallbackQuery down where we have the botToken context
            // or we'll fetch it here if needed.
            // For now, let's just make sure we don't use the placeholder.

            if (data.startsWith('order:')) {
                const productName = data.replace('order:', '');

                const integration = await Integration.findOne({
                    company: companyId,
                    platform: 'telegram',
                    isActive: true
                }).populate('company');

                if (!integration) return res.sendStatus(200);

                const botToken = integration.credentials.botToken;

                // Answer callback to remove loading spinner using the correct token
                await axios.post(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
                    callback_query_id: cb.id
                }).catch(() => {});

                // Save order as a company request
                company.requests.push({
                    customerName: user,
                    product: productName,
                    message: `طلب منتج: ${productName} - من العميل: @${user} (Chat ID: ${chatId})`,
                    date: new Date()
                });
                await company.save();

                // Save to chat history
                await saveChatMsg(company._id, userId, `طلب منتج: ${productName}`, 'user');

                // Reply to user
                const confirmMsg = `✅ تم استلام طلبك بنجاح!\n\n🛍️ المنتج: <b>${productName}</b>\n👤 الاسم: @${user}\n\nسيتواصل معك فريقنا قريباً!`;
                await tgSend(botToken, chatId, confirmMsg);
                await saveChatMsg(company._id, userId, confirmMsg, 'ai');
            }

            return res.sendStatus(200);
        }

        // ── Handle Regular Message ────────────────────────────────────────────
        if (!body.message) return res.sendStatus(200);

        const chatId = body.message.chat.id;
        const text = body.message.text || '';
        const user = body.message.from?.username || body.message.from?.first_name || 'مستخدم تليجرام';
        const userId = chatId.toString();

        const messageId = `tg_${body.message.message_id}`;
        if (processedMessages.has(messageId)) return res.sendStatus(200);
        processedMessages.add(messageId);
        if (processedMessages.size > 1000) processedMessages.delete(processedMessages.values().next().value);

        const integration = await Integration.findOne({
            company: companyId,
            platform: 'telegram',
            isActive: true
        }).populate('company');

        if (!integration || !integration.company) return res.sendStatus(200);

        const company = integration.company;
        const botToken = integration.credentials.botToken;

        // ── Match Command ────────────────────────────────────────────────────
        const commandConfig = (integration.settings?.commands || []).find(c =>
            text === `/${c.command}` || text.startsWith(`/${c.command} `) || text === c.command
        );

        if (commandConfig) {
            const cmdType = commandConfig.type || 'ai';

            // Save incoming command to chat history
            await saveChatMsg(company._id, userId, text, 'user');

            if (cmdType === 'fixed_message') {
                // Send the preset message the company configured
                const replyMsg = commandConfig.message || `مرحباً! أنت في قسم: ${commandConfig.category || commandConfig.description}.`;
                await tgSend(botToken, chatId, replyMsg);
                await saveChatMsg(company._id, userId, replyMsg, 'ai');

                // Save as dashboard request
                company.requests.push({
                    customerName: user,
                    product: commandConfig.category || commandConfig.command,
                    message: text,
                    date: new Date()
                });
                await company.save();

            } else if (cmdType === 'product_menu') {
                // Show inline product buttons
                const products = commandConfig.products || [];
                if (products.length === 0) {
                    await tgSend(botToken, chatId, 'عذراً، لا توجد منتجات متاحة حالياً.');
                } else {
                    const introText = commandConfig.message || `🛍️ اختر المنتج الذي تريده من <b>${commandConfig.category || 'قائمتنا'}</b>:`;
                    await tgSendProductMenu(botToken, chatId, products, introText);
                    await saveChatMsg(company._id, userId, introText, 'ai');
                }

            } else {
                // ai type - let AI answer
                const context = `
أنت مساعد ذكي تمثل شركة "${company.name}".
المجال: ${company.industry || "غير محدد"}.
${company.description || ""}
تحدث بالعربية.
                `.trim();
                const reply = await fetchAiResponse(`${context}\n\nUser Question:\n${text}`);
                await tgSend(botToken, chatId, reply);
                await saveChatMsg(company._id, userId, reply, 'ai');

                // Save as request
                company.requests.push({
                    customerName: user,
                    product: commandConfig.category || commandConfig.command,
                    message: text,
                    date: new Date()
                });
                await company.save();
            }

            return res.sendStatus(200);
        }

        // ── No command matched → AI reply ─────────────────────────────────────
        const context = `
أنت مساعد ذكي تمثل شركة "${company.name}".
المجال: ${company.industry || "غير محدد"}.
وصف الشركة: ${company.description || "لا يوجد وصف"}.
تحدث بالعربية بأسلوب مهذب ومفيد عبر تليجرام.
        `.trim();

        // Save user message
        await saveChatMsg(company._id, userId, text, 'user');

        const reply = await fetchAiResponse(`${context}\n\nUser Question:\n${text}`);

        // Reply via Telegram
        await tgSend(botToken, chatId, reply);

        // Save AI reply
        await saveChatMsg(company._id, userId, reply, 'ai');

        res.sendStatus(200);
    } catch (error) {
        console.error('Error handling Telegram Webhook:', error.message);
        res.sendStatus(500);
    }
};
