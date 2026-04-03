import axios from 'axios';
import Integration from '../models/Integration.js';
import Company from '../models/company.js';
import { fetchAiResponse } from '../utils/corexHelper.js';
import { getChatHistory, formatHistoryForPrompt } from '../utils/chatHistoryHelper.js';
import { getCompanyAIContext } from '../utils/promptHelper.js';

// تتبع الرسائل المعالجة لمنع التكرار
const processedMessages = new Set();

// تتبع حالات الطلب المؤقتة (في الانتاج يفضل Redis)
const orderSessions = {};

// ─── Helper: send Telegram message ──────────────────────────────────────────
async function tgSend(botToken, chatId, text, extra = {}) {
    await axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        ...extra
    });
}

// ─── Helper: send product menu with inline buttons ──────────────────────────
async function tgSendProductMenu(botToken, chatId, products, introText = 'اختر المنتج:') {
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

// ─── Save chat message to DB ────────────────────────────────────────────────
async function saveChatMsg(companyId, userId, text, sender, platform = 'telegram') {
    const CompanyChat = (await import('../models/CompanyChat.js')).default;
    await CompanyChat.create({ company: companyId, user: userId, text, sender, platform });
}

/**
 * WhatsApp Webhook Handler
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

                        const context = await getCompanyAIContext(company);

                        const history = await getChatHistory(company._id, from, 'whatsapp', 5);
                        const historyContext = formatHistoryForPrompt(history);

                        const reply = await fetchAiResponse(`${context}\n\n${historyContext}User Question:\n${messageText}`);

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
 * Telegram Webhook Handler
 * Supports: AI replies, fixed messages, product menus, callback queries, phone validation
 */
export const handleTelegramWebhook = async (req, res) => {
    try {
        const { companyId } = req.params;
        const body = req.body;

        // ══════════════════════════════════════════════════════════════════════
        // ══ CALLBACK QUERY (button click on product) ═════════════════════════
        // ══════════════════════════════════════════════════════════════════════
        if (body.callback_query) {
            const cb = body.callback_query;
            const chatId = cb.message.chat.id;
            const data = cb.data || '';
            const user = cb.from?.username || cb.from?.first_name || 'عميل';
            const userId = chatId.toString();

            if (data.startsWith('order:')) {
                const productName = data.replace('order:', '');

                // Use lean() for reading only - we don't need Mongoose methods here
                const integration = await Integration.findOne({
                    company: companyId,
                    platform: 'telegram',
                    isActive: true
                }).lean();

                if (!integration) return res.sendStatus(200);

                const botToken = integration.credentials.botToken;

                // Answer callback to remove loading spinner
                await axios.post(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
                    callback_query_id: cb.id
                }).catch(() => {});

                // Find the command config that has this product to get successMessage
                const matchedCmd = (integration.settings?.commands || []).find(c =>
                    c.type === 'product_menu' && (c.products || []).some(p => p.name === productName)
                );
                const successMessage = matchedCmd?.successMessage || '';

                // Start Order Session - wait for phone number
                orderSessions[chatId] = {
                    productName,
                    customerName: user,
                    userId,
                    companyId,
                    successMessage,
                    timestamp: Date.now()
                };

                // Ask for phone number
                const requestPhoneMsg = `جميل جداً! أنت اخترت: <b>${productName}</b>.\n\nمن فضلك أرسل <b>رقم الموبايل</b> الخاص بك (11 رقم) لتأكيد طلبك وسنتواصل معك فوراً. 📱`;
                await tgSend(botToken, chatId, requestPhoneMsg);
                await saveChatMsg(companyId, userId, requestPhoneMsg, 'ai');
            }

            return res.sendStatus(200);
        }

        // ══════════════════════════════════════════════════════════════════════
        // ══ REGULAR MESSAGE ═══════════════════════════════════════════════════
        // ══════════════════════════════════════════════════════════════════════
        if (!body.message) return res.sendStatus(200);

        const chatId = body.message.chat.id;
        const text = body.message.text || '';
        const user = body.message.from?.username || body.message.from?.first_name || 'مستخدم تليجرام';
        const userId = chatId.toString();

        // Deduplicate messages
        const messageId = `tg_${body.message.message_id}`;
        if (processedMessages.has(messageId)) return res.sendStatus(200);
        processedMessages.add(messageId);
        if (processedMessages.size > 1000) processedMessages.delete(processedMessages.values().next().value);

        // Get integration data (lean for reading)
        const integration = await Integration.findOne({
            company: companyId,
            platform: 'telegram',
            isActive: true
        }).lean();

        if (!integration) return res.sendStatus(200);

        const botToken = integration.credentials.botToken;

        // ── CHECK: Order Session (Waiting for phone) ────────────────────────
        if (orderSessions[chatId]) {
            const session = orderSessions[chatId];
            const phoneRegex = /^[0-9]{11}$/;
            const isValidPhone = phoneRegex.test(text.trim());

            if (!isValidPhone) {
                const errorMsg = `❌ ده مش رقم صحيح. لازم الرقم يتكون من 11 رقم بالضبط (أرقام فقط).\n\nمن فضلك أرسل الرقم الصحيح لطلب: ${session.productName}`;
                await tgSend(botToken, chatId, errorMsg);
                return res.sendStatus(200);
            }

            // Phone is valid! Complete the order
            const phoneNumber = text.trim();

            // Save order to dashboard (use Company model directly, NOT lean object)
            const companyDoc = await Company.findById(companyId);
            if (companyDoc) {
                companyDoc.requests.push({
                    customerName: `${session.customerName} (${phoneNumber})`,
                    product: session.productName,
                    message: `📦 طلب جديد!\nالمنتج: ${session.productName}\nالعميل: @${session.customerName}\nرقم الموبايل: ${phoneNumber}`,
                    date: new Date()
                });
                await companyDoc.save();
            }

            await saveChatMsg(companyId, userId, `رقم الموبايل: ${phoneNumber}`, 'user');

            // Send Confirmation (Custom or Default)
            let confirmMsg = session.successMessage || `✅ تم بنجاح طلب <b>${session.productName}</b>!\n\nسيتواصل معك فريقنا قريباً على الرقم: ${phoneNumber}\nشكراً لك! 🙏`;
            confirmMsg = confirmMsg.replace('{{product}}', session.productName).replace('{{phone}}', phoneNumber);

            await tgSend(botToken, chatId, confirmMsg);
            await saveChatMsg(companyId, userId, confirmMsg, 'ai');

            delete orderSessions[chatId];
            return res.sendStatus(200);
        }

        // ── Match Command ────────────────────────────────────────────────────
        const cleanText = text.trim().toLowerCase().replace('/', '');
        const commands = integration.settings?.commands || [];
        const commandConfig = commands.find(c =>
            cleanText === c.command || text === `/${c.command}`
        );

        if (commandConfig) {
            console.log(`🎯 Command matched: ${commandConfig.command} | Type: ${commandConfig.type} | Products: ${(commandConfig.products || []).length}`);
            const cmdType = commandConfig.type || 'ai';

            // Save incoming command to chat history
            await saveChatMsg(companyId, userId, text, 'user');

            if (cmdType === 'fixed_message') {
                const replyMsg = commandConfig.message || `مرحباً! أنت في قسم: ${commandConfig.category || commandConfig.description}.`;
                await tgSend(botToken, chatId, replyMsg);
                await saveChatMsg(companyId, userId, replyMsg, 'ai');

                // Save as dashboard request
                const companyDoc = await Company.findById(companyId);
                if (companyDoc) {
                    companyDoc.requests.push({
                        customerName: user,
                        product: commandConfig.category || commandConfig.command,
                        message: text,
                        date: new Date()
                    });
                    await companyDoc.save();
                }

            } else if (cmdType === 'product_menu') {
                const products = commandConfig.products || [];
                if (products.length === 0) {
                    await tgSend(botToken, chatId, `عذراً، لا توجد منتجات متاحة حالياً.`);
                    return res.sendStatus(200);
                }
                const introText = commandConfig.message || `🛍️ اختر المنتج الذي تريده من <b>${commandConfig.category || 'قائمتنا'}</b>:`;
                await tgSendProductMenu(botToken, chatId, products, introText);
                await saveChatMsg(companyId, userId, introText, 'ai');

            } else {
                // AI type
                const companyDoc = await Company.findById(companyId);
                const context = await getCompanyAIContext(companyDoc);
                const history = await getChatHistory(companyId, userId, 'telegram', 5);
                const historyContext = formatHistoryForPrompt(history);
                const reply = await fetchAiResponse(`${context}\n\n${historyContext}User Question:\n${text}`);
                await tgSend(botToken, chatId, reply);
                await saveChatMsg(companyId, userId, reply, 'ai');

                if (companyDoc) {
                    companyDoc.requests.push({
                        customerName: user,
                        product: commandConfig.category || commandConfig.command,
                        message: text,
                        date: new Date()
                    });
                    await companyDoc.save();
                }
            }

            return res.sendStatus(200);
        }

        // ── No command matched → Default AI reply ───────────────────────────
        const companyDoc = await Company.findById(companyId);
        const context = await getCompanyAIContext(companyDoc);

        await saveChatMsg(companyId, userId, text, 'user');
        const history = await getChatHistory(companyId, userId, 'telegram', 5);
        const historyContext = formatHistoryForPrompt(history);
        const reply = await fetchAiResponse(`${context}\n\n${historyContext}User Question:\n${text}`);
        await tgSend(botToken, chatId, reply);
        await saveChatMsg(companyId, userId, reply, 'ai');

        res.sendStatus(200);
    } catch (error) {
        console.error('Error handling Telegram Webhook:', error.message);
        res.sendStatus(500);
    }
};
