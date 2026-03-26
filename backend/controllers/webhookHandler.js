import axios from 'axios';
import Integration from '../models/Integration.js';
import Company from '../models/company.js';
import { extractCorexReply } from '../utils/corexHelper.js';

// تتبع الرسائل المعالجة لمنع التكرار
// ⚠️ ملاحظة للإنتاج: في بيئة العمل الحقيقية (Production)، يفضل استخدام Redis لتخزين processedMessages
// بدلاً من الذاكرة (In-Memory Set) لضمان عدم تكرار الرسائل عند إعادة تشغيل السيرفر أو تعدد الخوادم.
const processedMessages = new Set();

/**
 * معالج الرسائل الواردة من WhatsApp
 * يتعرف على الشركة المستهدفة ويرد تلقائياً بالذكاء الاصطناعي
 */
export const handleWhatsAppMessage = async (body) => {
    try {
        if (body.object !== 'whatsapp_business_account') {
            console.log('⏭️ Not a WhatsApp webhook, skipping');
            return;
        }

        for (const entry of body.entry) {
            for (const change of entry.changes) {
                if (change.field === 'messages') {
                    const value = change.value;

                    // تجاهل status updates (sent, delivered, read, etc.)
                    if (value.statuses) {
                        console.log('⏭️ Status update, skipping');
                        continue;
                    }

                    if (value.messages && value.messages.length > 0) {
                        const message = value.messages[0];
                        const messageId = message.id;
                        const from = message.from;
                        const messageText = message.text?.body;
                        const phoneNumberId = value.metadata.phone_number_id;

                        // تجاهل الرسائل المكررة
                        if (processedMessages.has(messageId)) {
                            console.log(`⏭️ Message ${messageId} already processed, skipping`);
                            continue;
                        }

                        processedMessages.add(messageId);

                        // تنظيف القائمة بعد 1000 رسالة
                        if (processedMessages.size > 1000) {
                            const firstItem = processedMessages.values().next().value;
                            processedMessages.delete(firstItem);
                        }

                        console.log(`💬 Message from ${from} to ${phoneNumberId}: "${messageText}"`);

                        const integration = await Integration.findOne({
                            'credentials.phoneNumberId': phoneNumberId,
                            platform: 'whatsapp',
                            isActive: true
                        }).populate('company');

                        if (!integration || !integration.company) {
                            console.warn(`⚠️ No company found for phoneNumberId: ${phoneNumberId}`);
                            return;
                        }

                        const company = integration.company;
                        const accessToken = integration.credentials.accessToken;

                        console.log(`🏢 Found company: ${company.name}`);

                        const context = `
أنت مساعد ذكي تمثل شركة "${company.name}".
المجال: ${company.industry || "غير محدد"}.
وصف الشركة: ${company.description || "لا يوجد وصف"}.
الرؤية: ${company.vision || "غير محددة"}.
الرسالة: ${company.mission || "غير محددة"}.
القيم: ${(company.values || []).join(", ") || "غير محددة"}.
تحدث بالعربية وكأنك ممثل حقيقي للشركة. كن مفيداً ومهذباً.
                        `.trim();

                        // إرسال الطلب للذكاء الاصطناعي عبر CoreSys API
                        const fullQuestion = `${context}\n\nUser Question:\n${messageText}`;
                        const apiUrl = process.env.COREX_API_URL || "https://dev-c7z.pantheonsite.io/CoreSys/chat.php";
                        const aiApiKey = process.env.COREX_API_KEY || "AITHORV1_6F85B401ED";
                        const requestUrl = `${apiUrl}?key=${aiApiKey}&act=assistant&a=${encodeURIComponent(fullQuestion)}`;

                        const aiResponse = await axios.get(requestUrl, { timeout: 30000 });

                        const reply = extractCorexReply(aiResponse.data, "عذراً، لم أتمكن من معالجة طلبك.");

                        console.log(`🤖 AI Reply: "${reply}"`);

                        // 💾 Save messages to database
                        const CompanyChat = (await import('../models/CompanyChat.js')).default;

                        // Save user message
                        await CompanyChat.create({
                            company: company._id,
                            user: from, // WhatsApp phone number
                            text: messageText,
                            sender: 'user',
                            platform: 'whatsapp'
                        });

                        // إرسال الرد عبر WhatsApp
                        try {
                            await axios.post(
                                `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
                                {
                                    messaging_product: "whatsapp",
                                    to: from,
                                    text: { body: reply }
                                },
                                {
                                    headers: {
                                        Authorization: `Bearer ${accessToken}`,
                                        "Content-Type": "application/json",
                                    },
                                }
                            );

                            console.log(`✅ Reply sent successfully to ${from}`);

                            // Save AI response to database
                            await CompanyChat.create({
                                company: company._id,
                                user: from,
                                text: reply,
                                sender: 'ai',
                                platform: 'whatsapp'
                            });

                        } catch (sendError) {
                            console.error(`❌ Failed to send reply to ${from}:`, sendError.response?.data || sendError.message);
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
