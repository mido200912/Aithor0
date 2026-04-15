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

// ─── WA Helper: Send Text ───────────────────────────────────────────────
async function waSend(accessToken, phoneNumberId, to, text) {
    try {
        await axios.post(
            `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
            { messaging_product: "whatsapp", to, text: { body: text } },
            { headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" } }
        );
        console.log(`✅ WhatsApp message sent to ${to}`);
    } catch (error) {
        console.error(`❌ WA Send Error: ${error.response?.data?.error?.message || error.message}`);
        console.log('Error Details:', JSON.stringify(error.response?.data?.error || {}, null, 2));
    }
}

// ─── WA Helper: Send List (Product Menu) ──────────────────────────────────
async function waSendProductMenu(accessToken, phoneNumberId, to, products, introText) {
    try {
        const rows = products.slice(0, 10).map(p => ({
            id: `order:${p.name}`,
            title: p.name.substring(0, 24),
            description: p.price ? p.price.toString().substring(0, 72) : 'منتج مميز'
        }));
        await axios.post(
            `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
            {
                messaging_product: "whatsapp",
                recipient_type: "individual",
                to,
                type: "interactive",
                interactive: {
                    type: "list",
                    header: { type: "text", text: "🛍️ المنتجات المتاحة" },
                    body: { text: introText },
                    footer: { text: "اضغط لاختيار المنتج" },
                    action: {
                        button: "عرض القائمة",
                        sections: [{ title: "قائمة المنتجات", rows }]
                    }
                }
            },
            { headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" } }
        );
        console.log(`✅ WhatsApp Interactive Menu sent to ${to}`);
    } catch (error) {
        console.error(`❌ WA Menu Send Error: ${error.response?.data?.error?.message || error.message}`);
    }
}

/**
 * WhatsApp Webhook Handler (Matches Telegram Logic)
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
                        const phoneNumberId = value.metadata.phone_number_id;

                        if (processedMessages.has(messageId)) continue;
                        processedMessages.add(messageId);
                        if (processedMessages.size > 1000) processedMessages.delete(processedMessages.values().next().value);

                        let messageText = '';
                        if (message.type === 'text') {
                            messageText = message.text?.body || '';
                        } else if (message.type === 'interactive') {
                            if (message.interactive.type === 'button_reply') messageText = message.interactive.button_reply.id;
                            else if (message.interactive.type === 'list_reply') messageText = message.interactive.list_reply.id;
                        } else {
                            console.log(`ℹ️ WhatsApp message type ignored: ${message.type}`);
                            continue;
                        }

                        console.log(`📧 New WhatsApp Msg from ${from}: "${messageText}" (PhoneID: ${phoneNumberId})`);

                        const integration = await Integration.findOne({
                            'credentials.phoneNumberId': phoneNumberId,
                            platform: 'whatsapp',
                            isActive: true
                        });

                        if (!integration) {
                            console.log(`⚠️ No active WhatsApp integration found for PhoneID: ${phoneNumberId}`);
                            continue;
                        }
                        const companyId = integration.company;
                        const accessToken = integration.credentials.accessToken;
                        const company = await Company.findById(companyId);
                        if (!company) continue;

                        const CompanyChat = (await import('../models/CompanyChat.js')).default;

                        // 1. ORDER SESSION CHECK
                        if (orderSessions[`wa_${from}`]) {
                            const session = orderSessions[`wa_${from}`];
                            const phoneRegex = /^[0-9]{11}$/;
                            const isValidPhone = phoneRegex.test(messageText.trim());

                            if (!isValidPhone) {
                                await waSend(accessToken, phoneNumberId, from, `❌ رقم غير صحيح. برجاء كتابة 11 رقم لطلبك: ${session.productName}`);
                                return;
                            }

                            const phoneNumber = messageText.trim();
                            company.requests.push({
                                customerName: `WhatsApp (${phoneNumber})`,
                                product: session.productName,
                                message: `📦 طلب جديد من واتساب!\nالمنتج: ${session.productName}\nالموبايل: ${phoneNumber}`,
                                date: new Date()
                            });
                            await company.save();
                            await CompanyChat.create({ company: companyId, user: from, text: `رقم الموبايل: ${phoneNumber}`, sender: 'user', platform: 'whatsapp' });

                            let confirmMsg = session.successMessage || `✅ تم بنجاح طلب <b>${session.productName}</b>!\n\nسيتواصل معك فريقنا قريباً.`;
                            confirmMsg = confirmMsg.replace('{{product}}', session.productName).replace('{{phone}}', phoneNumber);
                            
                            await waSend(accessToken, phoneNumberId, from, confirmMsg);
                            await CompanyChat.create({ company: companyId, user: from, text: confirmMsg, sender: 'ai', platform: 'whatsapp' });
                            delete orderSessions[`wa_${from}`];
                            return;
                        }

                        // 2. INTERACTIVE LIST REPLY (Order placed)
                        if (messageText.startsWith('order:')) {
                            const productName = messageText.replace('order:', '');
                            const matchedCmd = (integration.settings?.commands || []).find(c => 
                                c.type === 'product_menu' && (c.products || []).some(p => p.name === productName)
                            );
                            const successMessage = matchedCmd?.successMessage || '';
                            
                            orderSessions[`wa_${from}`] = {
                                productName,
                                successMessage,
                                timestamp: Date.now()
                            };

                            const reqPhoneMsg = `جميل! لقد اخترت: ${productName}.\n\nأرسل رقم الموبايل (11 رقم) لتأكيد الطلب 📱`;
                            await waSend(accessToken, phoneNumberId, from, reqPhoneMsg);
                            await CompanyChat.create({ company: companyId, user: from, text: reqPhoneMsg, sender: 'ai', platform: 'whatsapp' });
                            return;
                        }

                        await CompanyChat.create({ company: companyId, user: from, text: messageText, sender: 'user', platform: 'whatsapp' });

                        // 3. COMMAND MATCHING
                        const cleanText = messageText.trim().toLowerCase();
                        const commandConfig = (integration.settings?.commands || []).find(c => 
                            cleanText === c.command || cleanText === `/${c.command}` || (c.keywords && c.keywords.includes(cleanText))
                        );

                        if (commandConfig) {
                            if (commandConfig.type === 'fixed_message') {
                                const replyMsg = commandConfig.message || "الرسالة الافتراضية.";
                                await waSend(accessToken, phoneNumberId, from, replyMsg);
                                await CompanyChat.create({ company: companyId, user: from, text: replyMsg, sender: 'ai', platform: 'whatsapp' });
                            } else if (commandConfig.type === 'product_menu') {
                                const products = commandConfig.products || [];
                                if (products.length > 0) {
                                    const introText = commandConfig.message || "اختر من القائمة المتاحة:";
                                    await waSendProductMenu(accessToken, phoneNumberId, from, products, introText);
                                    await CompanyChat.create({ company: companyId, user: from, text: introText, sender: 'ai', platform: 'whatsapp' });
                                } else {
                                    await waSend(accessToken, phoneNumberId, from, "لا توجد منتجات.");
                                }
                            }
                            return;
                        }

                        // 4. DEFAULT AI REPLY
                        const context = await getCompanyAIContext(company);
                        const history = await getChatHistory(companyId, from, 'whatsapp', 5);
                        const historyContext = formatHistoryForPrompt(history);
                        const reply = await fetchAiResponse(`${context}\n\n${historyContext}User Question:\n${messageText}`);

                        await waSend(accessToken, phoneNumberId, from, reply);
                        await CompanyChat.create({ company: companyId, user: from, text: reply, sender: 'ai', platform: 'whatsapp' });
                    }
                }
            }
        }
    } catch (error) {
        console.error('❌ Error handling WhatsApp message:', error.message);
    }
};

/**
 * Instagram Webhook Handler
 */
export const handleInstagramWebhook = async (body) => {
    try {
        if (body.object !== 'instagram' && body.object !== 'page') return;

        for (const entry of body.entry) {
            if (entry.changes) {
                for (const change of entry.changes) {
                    // Instagram Comments AI Auto-Reply
                    if (change.field === 'comments') {
                        const comment = change.value;
                        if (!comment || !comment.id) continue;
                        
                        // Prevent duplicates
                        const msgId = `ig_c_${comment.id}`;
                        if (processedMessages.has(msgId)) continue;
                        processedMessages.add(msgId);

                        const text = comment.text?.toLowerCase() || '';

                        // Look up IG integration by page ID (meta webhook payload page id)
                        const integration = await Integration.findOne({ platform: 'instagram', isActive: true }); 
                        // Note: In real production, filter by `credentials.pageId: entry.id` or similar
                        
                        if (!integration || !integration.company) continue;

                        // Check IG settings for comment auto-reply rules
                        const autoReplies = integration.settings?.commentRules || [];
                        const matchedRule = autoReplies.find(rule => 
                            rule.triggerWord && text.includes(rule.triggerWord.toLowerCase())
                        );

                        if (matchedRule && matchedRule.replyMessage) {
                            console.log(`💬 Instagram Comment Match! Sending reply via DM for: ${matchedRule.triggerWord}`);
                            // Sends private reply via DM to the commenter
                            const pageAccessToken = integration.credentials.accessToken;
                            await axios.post(
                                `https://graph.facebook.com/v18.0/${entry.id}/messages`,
                                {
                                    recipient: { comment_id: comment.id },
                                    message: { text: matchedRule.replyMessage }
                                },
                                { headers: { Authorization: `Bearer ${pageAccessToken}` } }
                            ).catch(e => console.error("IG DM Error", e.message));
                        }
                    }
                }
            }
        }
    } catch (e) {
        console.error("IG Webhook Error: ", e.message);
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
                });

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
        });

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
