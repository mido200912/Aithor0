import axios from "axios";
import Integration from "../models/Integration.js";
import Company from "../models/CompanyModel.js";
import CompanyChat from "../models/CompanyChat.js";
import Lead from "../models/Lead.js";
import { fetchAiResponse, transcribeAudio } from "../utils/corexHelper.js";
import {
  getChatHistory,
  formatHistoryForPrompt,
} from "../utils/chatHistoryHelper.js";
import { getCompanyAIContext } from "../utils/promptHelper.js";
import NotificationService from "../services/notificationService.js";
import AILearningService from "../services/aiLearningService.js";
import PersonaService from "../services/personaService.js";
import ProductRecommendationService from "../services/recommendationService.js";

// تتبع الرسائل المعالجة لمنع التكرار
const processedMessages = new Set();

// ─── Helper: Download WhatsApp Media (Images/Stickers) ──────────────────────
async function downloadWaMedia(mediaId, accessToken) {
  try {
    const res = await axios.get(`https://graph.facebook.com/v20.0/${mediaId}`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    const mediaUrl = res.data.url;
    const mediaRes = await axios.get(mediaUrl, {
      responseType: 'arraybuffer',
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    const mimeType = mediaRes.headers['content-type'] || 'image/jpeg';
    const base64 = Buffer.from(mediaRes.data, 'binary').toString('base64');
    return `data:${mimeType};base64,${base64}`;
  } catch (e) {
    console.error('Error downloading WA media:', e.response?.data || e.message);
    return null;
  }
}

// ─── Helper: Download WhatsApp Audio Buffer ───────────────────────────────────
async function downloadWaAudioBuffer(mediaId, accessToken) {
  try {
    console.log(`[Audio] Downloading media info for ID: ${mediaId}...`);
    const res = await axios.get(`https://graph.facebook.com/v21.0/${mediaId}`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    const mediaUrl = res.data.url;
    const rawMime = res.data.mime_type || 'audio/ogg';
    // Strip any codecs parameters from mime type (e.g., "audio/ogg; codecs=opus" → "audio/ogg")
    const mimeType = rawMime.split(';')[0].trim();
    const fileSize = res.data.file_size || 'unknown';
    console.log(`[Audio] URL obtained. Raw MIME: "${rawMime}" → Cleaned: "${mimeType}", Size: ${fileSize}`);

    const mediaRes = await axios.get(mediaUrl, {
      responseType: 'arraybuffer',
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    const buffer = Buffer.from(mediaRes.data);
    console.log(`[Audio] Downloaded ${(buffer.length / 1024).toFixed(1)} KB successfully.`);
    return { buffer, mimeType };
  } catch (e) {
    const errMsg = e.response?.data?.error?.message || e.message;
    console.error('[Audio] Download failed:', errMsg);
    if (e.response?.status === 400) {
      console.error('[Audio] Bad request — media ID may be expired or invalid.');
    }
    if (e.response?.status === 401) {
      console.error('[Audio] Unauthorized — access token may be invalid or expired.');
    }
    if (e.response?.status === 404) {
      console.error('[Audio] Not found — media ID invalid or wrong API version.');
    }
    return null;
  }
}

// ─── Helper: Log Integration Errors ─────────────────────────────────────────
async function logIntegrationError(integration, errorMessage) {
  if (!integration || !integration.save) return;
  try {
      const logs = integration.logs || [];
      logs.unshift({ type: 'error', message: errorMessage, date: new Date().toISOString() });
      if (logs.length > 20) logs.length = 20;
      integration.logs = logs;
      await integration.save();
  } catch(e) {
      console.error("Failed to save integration log:", e.message);
  }
}

// تتبع حالات الطلب المؤقتة (في الانتاج يفضل Redis)
const orderSessions = {};

// ─── Helper: send Telegram message ──────────────────────────────────────────
async function tgSend(botToken, chatId, text, extra = {}) {
  await axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
    ...extra,
  });
}

// ─── Helper: send product menu with inline buttons ──────────────────────────
async function tgSendProductMenu(
  botToken,
  chatId,
  products,
  introText = "اختر المنتج:",
) {
  // Send intro text first
  await axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    chat_id: chatId,
    text: introText,
    parse_mode: "HTML",
  });

  // Send each product as a separate message
  for (const p of products) {
    const caption = `<b>${p.name}</b>\n${p.price ? `💰 السعر: ${p.price}\n` : ""}${p.description ? `\n📝 ${p.description}` : ""}`;
    const keyboard = [
      [
        {
          text: `🛒 طلب ${p.name}`,
          callback_data: `order:${p.name}`,
        },
      ],
    ];

    if (p.imageUrl) {
      try {
        await axios.post(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
          chat_id: chatId,
          photo: p.imageUrl,
          caption: caption,
          parse_mode: "HTML",
          reply_markup: { inline_keyboard: keyboard },
        });
      } catch (e) {
        console.error("Failed to send photo, fallback to text", e.message);
        await axios.post(
          `https://api.telegram.org/bot${botToken}/sendMessage`,
          {
            chat_id: chatId,
            text: caption,
            parse_mode: "HTML",
            reply_markup: { inline_keyboard: keyboard },
            disable_web_page_preview: false,
          },
        );
      }
    } else {
      await axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        chat_id: chatId,
        text: caption,
        parse_mode: "HTML",
        reply_markup: { inline_keyboard: keyboard },
        disable_web_page_preview: false,
      });
    }
  }
}

// ─── Save chat message to DB ────────────────────────────────────────────────
async function saveChatMsg(
  companyId,
  userId,
  text,
  sender,
  platform = "telegram",
) {
  await CompanyChat.create({
    company: companyId,
    user: userId,
    text,
    sender,
    platform,
  });
}

// ─── Download Telegram Media ─────────────────────────────────────────────────
async function downloadTgMedia(botToken, fileId) {
    try {
        const fileInfo = await axios.get(`https://api.telegram.org/bot${botToken}/getFile?file_id=${fileId}`);
        const filePath = fileInfo.data?.result?.file_path;
        if (!filePath) return null;

        const downloadUrl = `https://api.telegram.org/file/bot${botToken}/${filePath}`;
        const response = await axios.get(downloadUrl, { responseType: 'arraybuffer' });
        
        const buffer = Buffer.from(response.data, 'binary');
        
        let mimeType = "application/octet-stream";
        if (filePath.endsWith('.ogg')) mimeType = "audio/ogg";
        else if (filePath.endsWith('.jpg') || filePath.endsWith('.jpeg')) mimeType = "image/jpeg";
        else if (filePath.endsWith('.png')) mimeType = "image/png";
        else if (filePath.endsWith('.webp')) mimeType = "image/webp";
        else if (filePath.endsWith('.mp4')) mimeType = "video/mp4";
        
        return {
            buffer,
            mimeType,
            base64DataUri: `data:${mimeType};base64,${buffer.toString('base64')}`
        };
    } catch (error) {
        console.error("❌ Error downloading TG media:", error.message);
        return null;
    }
}

/**
 * WhatsApp Webhook Handler
 */
export const handleWhatsAppMessage = async (body) => {
  try {
    console.log(`[WhatsApp Debug] Full Webhook Body:`, JSON.stringify(body));

    if (body.object !== "whatsapp_business_account") {
      console.log(
        `[WhatsApp Debug] Object is not whatsapp_business_account, it is: ${body.object}`,
      );
      return;
    }

    for (const entry of body.entry) {
      console.log(`[WhatsApp Debug] Processing Entry ID: ${entry.id}`);
      for (const change of entry.changes) {
        console.log(`[WhatsApp Debug] Change Field: ${change.field}`);
        if (change.field === "messages") {
          const value = change.value;
          if (value.statuses) {
            console.log(
              `[WhatsApp Debug] Received a status update (read/delivered), ignoring.`,
            );
            continue;
          }

          if (value.messages && value.messages.length > 0) {
            const message = value.messages[0];
            const messageId = message.id;
            const from = message.from;
            let messageText = message.text?.body || "";
            let mediaId = null;

            if (message.type === 'image' && message.image?.id) {
                mediaId = message.image.id;
                messageText = message.image.caption || "";
            } else if (message.type === 'video' && message.video?.id) {
                mediaId = message.video.id;
                messageText = message.video.caption || "";
            } else if (message.type === 'audio' && message.audio?.id) {
                // 🎙️ Voice Notes Support (Lead to STT)
                mediaId = message.audio.id;
                messageText = "[جاري معالجة الملاحظة الصوتية...]";
            } else if (message.type === 'sticker' && message.sticker?.id) {
                mediaId = message.sticker.id;
            } else if (message.type === 'document' && message.document?.id) {
                mediaId = message.document.id;
                messageText = message.document.caption || "";
            }

            if (!messageText && !mediaId) messageText = "[Non-text message]";
            const phoneNumberId = value.metadata.phone_number_id;
            const displayPhoneNumber = value.metadata.display_phone_number;

            console.log(
              `[WhatsApp Webhook] Message from ${from} to ${phoneNumberId}. Text: ${messageText}`,
            );

            if (processedMessages.has(messageId)) {
              console.log(
                `[WhatsApp Debug] Message ${messageId} already processed, skipping.`,
              );
              continue;
            }
            processedMessages.add(messageId);

            const allWaIntegrations = await Integration.find({
              platform: "whatsapp",
              isActive: true,
            });

            console.log(
              `[WhatsApp Debug] Looking for integration with Phone ID: ${phoneNumberId} or Display: ${displayPhoneNumber}`,
            );

            let integration = allWaIntegrations.find(
              (int) =>
                int.credentials?.phoneNumberId === phoneNumberId ||
                int.credentials?.phoneNumberId === displayPhoneNumber ||
                (displayPhoneNumber &&
                  int.credentials?.phoneNumberId ===
                    displayPhoneNumber.replace(/[^0-9]/g, "")),
            );

            if (!integration && allWaIntegrations.length > 0) {
              console.log(
                `[WhatsApp Debug] No direct match found. Active integrations count: ${allWaIntegrations.length}`,
              );
              console.log(
                `[WhatsApp Debug] First integration in DB has Phone ID: ${allWaIntegrations[0].credentials?.phoneNumberId}`,
              );
              integration = allWaIntegrations[0];
              console.log(
                `[WhatsApp Debug] Falling back to the first available integration for Company: ${integration.company}`,
              );
            }

            if (!integration || !integration.company) {
              console.log(
                `[WhatsApp Debug] CRITICAL: No active integration found for this message. Stopping.`,
              );
              continue;
            }

            try {
              const company = await Company.findById(integration.company);
              if (!company) {
                console.log(
                  `[WhatsApp Webhook] Associated company not found in DB!`,
                );
                continue;
              }
              const accessToken = integration.credentials.accessToken;

              let base64Media = null;
              if (mediaId) {
                  if (message.type === 'audio') {
                      const audioResult = await downloadWaAudioBuffer(mediaId, accessToken);
                      if (audioResult) {
                          console.log(`[Audio] Transcribing with MIME: ${audioResult.mimeType}...`);
                          messageText = await transcribeAudio(audioResult.buffer, 'audio.ogg', audioResult.mimeType);
                          console.log(`[Audio] Transcription result: "${messageText.substring(0, 80)}..."`);
                      } else {
                          messageText = "[فشل تحميل الرسالة الصوتية من واتساب]";
                      }
                  } else {
                      base64Media = await downloadWaMedia(mediaId, accessToken);
                      if (base64Media && !messageText) {
                          messageText = message.type === 'video' ? "العميل أرسل فيديو. قم بتحليل محتوى الفيديو والرد على العميل." : "العميل أرسل صورة. قم بتحليل محتوى الصورة والرد على العميل.";
                      }
                  }
              }

              // 🛑 Check if user is in Human Handoff mode or AI is disabled for this conversation
              const skipAi = async () => {
                  await CompanyChat.create({
                    company: company._id,
                    user: from,
                    text: messageText,
                    sender: "user",
                    platform: "whatsapp",
                    aiEnabled: false,
                    handoffRequested: true,
                  }).catch((e) => console.error("DB Save Err:", e.message));
                  return;
              };

              // 🌍 Global AI toggle check — if company aiEnabled is false, skip AI for everyone
              if (company.aiEnabled === false) {
                  console.log(`[WhatsApp Webhook] Global AI disabled for company ${company._id}. Skipping AI.`);
                  return skipAi();
              }

              // Check per-conversation aiEnabled flag on the latest chat
              const latestChat = await CompanyChat.Model.findOne({
                company: company._id,
                user: from,
                platform: "whatsapp",
              }).sort({ createdAt: -1 }).lean();

              if (latestChat && latestChat.aiEnabled === false) {
                  console.log(`[WhatsApp Webhook] AI disabled for user ${from}. Skipping AI.`);
                  return skipAi();
              }

              // Legacy global humanHandoffUsers check
              if (company.humanHandoffEnabled && company.humanHandoffUsers) {
                  const matchesHandoff = company.humanHandoffUsers.some(u => u === from || u === `whatsapp:${from}`);
                  if (matchesHandoff) {
                      console.log(`[WhatsApp Webhook] User ${from} is in human handoff mode. Skipping AI.`);
                      return skipAi();
                  }
              }

              // 🌍 Get Global AI Settings from Company
              const aiSettings = company.aiSettings || {};
              const aiModel = aiSettings.model || "inclusionai/ring-2.6-1t";
              const aiMode = aiSettings.mode || "restricted";
              const languages = (
                aiSettings.languages || ["Arabic", "English"]
              ).join(", ");

              const context = await getCompanyAIContext(company, integration);
              const history = await getChatHistory(
                company._id,
                from,
                "whatsapp",
                5,
              );
              const historyContext = formatHistoryForPrompt(history);

              // 🧠 Build Powerful System Prompt based on Mode
              let systemPrompt = context;
              
              // 📦 Add WhatsApp-Specific Settings (Products, etc.)
              if (integration.settings) {
                  if (integration.settings.about) systemPrompt += `\n\n[نبذة عن الشركة]: ${integration.settings.about}`;
                  if (integration.settings.products) systemPrompt += `\n\n[المنتجات والخدمات المتاحة]:\n${integration.settings.products}`;
                  if (integration.settings.website) systemPrompt += `\n\n[رابط الموقع]: ${integration.settings.website}`;
                  if (integration.settings.contactPhone) systemPrompt += `\n\n[رقم التواصل الإضافي]: ${integration.settings.contactPhone}`;
              }

              if (aiMode === "restricted") {
                systemPrompt += `\n⚠️ STRICT MODE: You are a professional assistant for this company ONLY. Do NOT answer questions about politics, other companies, general trivia, or anything unrelated to the company info above. If the question is unrelated, politely say that you can only help with company matters.`;
                if (base64Media) {
                  systemPrompt += `\n📸 EXCEPTION - IMAGE RECEIVED: The customer sent an image/video. For THIS message ONLY, ignore the restrictions above. You MUST analyze the image/video contents and help the customer with whatever they ask about the image.`;
                }
              } else {
                systemPrompt += `\n🌍 GENERAL MODE: You are a helpful assistant for this company. Answer company questions using the info above, but you are also free to help the user with any other general questions they might have.`;
              }

              systemPrompt += `\n📷 MEDIA HANDLING: When a customer sends an image or video, you MUST analyze its content and respond helpfully regarding the company's products/services. Analyzing images/videos is part of your job.`;

              systemPrompt += `\n🌐 LANGUAGE: You MUST respond only in one of these languages: [${languages}]. Default to Arabic if the user speaks Arabic.`;

              // 🧑‍💼 HUMAN HANDOFF INSTRUCTION
              if (company.humanHandoffEnabled) {
                  systemPrompt += `\n🧑‍💼 **التحويل البشري (HUMAN HANDOFF):**
إذا طلب المستخدم صراحة التحدث مع موظف خدمة عملاء بشري أو أبدى انزعاجاً شديداً، يجب أن ترد فقط بهذه العبارة الدقيقة:
[HUMAN_HANDOFF]`;
              }

              // 📝 AI Learning Context - learned from human agent replies
              try {
                const learningContext = await AILearningService.generateLearningContext(company._id);
                if (learningContext) systemPrompt += learningContext;
              } catch (e) {
                console.error("[Webhook] Learning context error:", e.message);
              }

              // 🛍️ Product Recommendations
              try {
                const recommendations = await ProductRecommendationService.getRecommendations(
                  company._id, messageText, 3
                );
                if (recommendations.length > 0) {
                  const productList = recommendations.map((p, i) =>
                    `${i + 1}. ${p.name} - ${p.price} ${p.currency || 'USD'}${p.description ? ' (' + p.description.substring(0, 60) + ')' : ''}`
                  ).join('\n');
                  systemPrompt += `\n\n🛍️ **المنتجات الموصى بها لهذا العميل:**\n${productList}\nيمكنك تقديم هذه المنتجات للعميل إذا كان يبحث عن منتجات مشابهة.`;
                }
              } catch (e) { /* non-critical */ }

              // 🛒 ORDERING SYSTEM INSTRUCTIONS
              systemPrompt += `\n\n🛒 **نظام الطلبات (ORDERING SYSTEM):**
1. إذا طلب العميل شراء منتج، اعرض عليه المنتجات المتاحة.
2. إذا اختار منتجاً للطلب، اطلب منه بلطف إرسال "الاسم" و "رقم الموبايل" لتأكيد الطلب.
3. بمجرد أن يرسل العميل رقم الموبايل، قم بتأكيد الطلب له، وفي **نهاية رسالتك تماماً** يجب أن تكتب هذا الكود البرمجي (الذي سيقوم بحفظ الطلب في قاعدة بياناتنا):
[SAVE_ORDER: أسم العميل | رقم الموبايل | أسم المنتج]
تأكد أن تستبدل البيانات بما طلبه العميل. النظام الخاص بنا سيقرأ هذا الكود ولن يظهر للعميل.`;

              // 📈 LEAD GENERATION INSTRUCTIONS
              systemPrompt += `\n\n📈 **توليد العملاء المحتملين (LEAD GENERATION):**
إذا قام العميل بتقديم بياناته الشخصية من تلقاء نفسه (الاسم، رقم الهاتف، أو البريد الإلكتروني) أثناء المحادثة للاستفسار، يجب عليك في نهاية رسالتك إضافة الكود التالي ليتم حفظ بياناته كعميل محتمل:
[SAVE_LEAD: الاسم | رقم الهاتف | الإيميل]
ضع الكلمة "غير متوفر" مكان أي معلومة ناقصة، وتأكد أن الكود في سطر منفصل في نهاية الرسالة ولا يظهر للعميل كجزء من الحديث.`;

              // 🎭 AI Persona Style
              const personaId = company.aiSettings?.persona || "professional";
              systemPrompt += PersonaService.getPersonaPromptSuffix(personaId);

              // Save user message to DB
              await CompanyChat.create({
                company: company._id,
                user: from,
                text: messageText,
                sender: "user",
                platform: "whatsapp",
              }).catch((e) => console.error("DB Save Err:", e.message));

              // Send notification about new incoming message
              NotificationService.notifyNewMessage(company._id, from, "whatsapp", messageText).catch(() => {});

              console.log(
                `[WhatsApp Webhook] Fetching AI response using Model: ${aiModel}...`,
              );

              // ✅ Mark message as read (Meta Standard)
              await axios
                .post(
                  `https://graph.facebook.com/v20.0/${phoneNumberId}/messages`,
                  {
                    messaging_product: "whatsapp",
                    status: "read",
                    message_id: messageId,
                  },
                  { headers: { Authorization: `Bearer ${accessToken}` } },
                )
                .catch((e) => console.warn("Read Status Err:", e.message));

              // 🎙️ Handle transcription/download failures directly — don't send error text to AI
              let reply = "";
              if (messageText.includes("[رسالة صوتية") || messageText.includes("[فشل تحميل الرسالة الصوتية")) {
                  reply = messageText;
              } else if (company.aiCredits !== undefined && company.aiCredits <= 0) {
                  reply = "نعتذر، خدمة الرد الآلي متوقفة حالياً.";
              } else {
                  if (company.aiCredits !== undefined) {
                      company.aiCredits -= 1;
                      await company.save().catch(e => console.error("Failed to deduct credit:", e));
                  }
                  
                  reply = await fetchAiResponse(
                    `${systemPrompt}\n\n${historyContext}User Question:\n${messageText}`,
                    "عذراً، لا أستطيع الرد في الوقت الحالي.",
                    aiModel,
                    base64Media
                  );
              }

              if (reply === "AI_ERROR_RETRY_LATER") {
                throw new Error(
                  "AI Assistant failed to generate a response. Please check API keys.",
                );
              }

              // 📝 PARSE ORDER TAG AND SAVE TO DATABASE
              const orderMatch = reply.match(/\[SAVE_ORDER:\s*(.*?)\s*\|\s*(.*?)\s*\|\s*(.*?)\]/i);
              if (orderMatch) {
                  const [fullMatch, customerName, phone, productName] = orderMatch;
                  
                  // Save to Database
                  const orderEntry = {
                      customerName: `${customerName.trim()} (${phone.trim()})`,
                      product: productName.trim(),
                      message: `📦 طلب جديد من واتساب!\nالمنتج: ${productName.trim()}\nالعميل: ${customerName.trim()}\nرقم الموبايل: ${phone.trim()}`,
                      source: 'whatsapp',
                      date: new Date()
                  };
                  company.requests.push(orderEntry);
                  await company.save().catch(e => console.error("Failed to save order to DB:", e));

                  // Notify about new order
                  NotificationService.notifyNewOrder(company._id, {
                      customerName: customerName.trim(),
                      items: [{ name: productName.trim() }],
                      totalPrice: 0,
                      orderId: `wa_${Date.now()}`
                  }).catch(() => {});
                  
                  // Remove the tag from the reply sent to the user
                  reply = reply.replace(fullMatch, "").trim();
              }

              // 📈 PARSE LEAD GENERATION TAG
              const leadMatch = reply.match(/\[SAVE_LEAD:\s*(.*?)\s*\|\s*(.*?)\s*\|\s*(.*?)\]/i);
              if (leadMatch) {
                  const [fullMatch, leadName, leadPhone, leadEmail] = leadMatch;
                  const companyId = company._id.toString();

                  try {
                      // Dedup by phone per company
                      if (leadPhone.trim()) {
                          const existing = await Lead.findOne({ company: companyId, phone: leadPhone.trim() });
                          if (existing) {
                              existing.name = leadName.trim() || existing.name;
                              existing.email = leadEmail.trim() || existing.email;
                              existing.sourceData = { ...existing.sourceData, lastMessage: messageText, updatedFrom: 'whatsapp' };
                              await existing.save().catch(e => console.error("Failed to update lead:", e));
                          } else {
                              await Lead.create({
                                  company: companyId,
                                  name: leadName.trim(),
                                  phone: leadPhone.trim(),
                                  email: leadEmail.trim(),
                                  source: 'whatsapp',
                                  sourceData: { messageText },
                                  status: 'new'
                              }).catch(e => console.error("Failed to create lead:", e));
                          }
                      } else {
                          // No phone — create lead anyway with just name/email
                          await Lead.create({
                              company: companyId,
                              name: leadName.trim(),
                              email: leadEmail.trim(),
                              source: 'whatsapp',
                              sourceData: { messageText },
                              status: 'new'
                          }).catch(e => console.error("Failed to create lead:", e));
                      }
                  } catch (e) {
                      console.error("Failed to save lead to DB:", e.message);
                  }
                  
                  reply = reply.replace(fullMatch, "").trim();
              }

                  // 🧑‍💼 PARSE HUMAN HANDOFF TAG
              if (reply.includes("[HUMAN_HANDOFF]")) {
                  if (!company.humanHandoffUsers) company.humanHandoffUsers = [];
                  const handoffKey = `whatsapp:${from}`;
                  if (!company.humanHandoffUsers.includes(from) && !company.humanHandoffUsers.includes(handoffKey)) {
                      company.humanHandoffUsers.push(from);
                      await company.save().catch(e => console.error("Failed to save handoff status:", e));
                  }
                  reply = "تم تحويل محادثتك لموظف خدمة العملاء، وسيقوم بالرد عليك في أقرب وقت ممكن.";
                  // Mark the AI chat as aiEnabled=false so subsequent messages also skip AI
                  await CompanyChat.Model.updateMany(
                      { company: company._id, user: from, platform: "whatsapp" },
                      { $set: { aiEnabled: false, handoffRequested: true } }
                  ).catch(e => console.error("Failed to set aiEnabled=false:", e));
                  // Notify owner about handoff
                  NotificationService.notifyHumanHandoff(company._id, from, "whatsapp").catch(() => {});
              }

              // ✂️ WhatsApp Max Length is 4096. We trim at 4000 to be safe.
              if (reply.length > 4000) {
                reply =
                  reply.substring(0, 4000) +
                  "\n\n... [تم اقتطاع باقي الرسالة لتجاوزها الحد المسموح به للواتساب]";
              }

              console.log(
                `[WhatsApp Webhook] AI generated response length: ${reply.length} chars. Sample: ${reply.substring(0, 30)}...`,
              );

              // Send AI Reply
              await axios.post(
                `https://graph.facebook.com/v20.0/${phoneNumberId}/messages`,
                {
                  messaging_product: "whatsapp",
                  to: from,
                  type: "text",
                  text: { body: reply },
                },
                {
                  headers: {
                    Authorization: `Bearer ${accessToken}`,
                    "Content-Type": "application/json",
                  },
                },
              );
              await CompanyChat.create({
                company: company._id,
                user: from,
                text: reply,
                sender: "ai",
                platform: "whatsapp",
              });

              // Notify that AI replied
              NotificationService.notifyAiReply(company._id, from, "whatsapp").catch(() => {});
            } catch (msgError) {
              console.error(
                `❌ WhatsApp Message Error:`,
                msgError.response?.data || msgError.message,
              );

              // تفاصيل الخطأ من فيسبوك
              const metaError = msgError.response?.data?.error;
              const detailedError = metaError
                ? `❌ Meta Error: ${metaError.message}\nCode: ${metaError.code}\nSubcode: ${metaError.error_subcode}\nType: ${metaError.type}`
                : `❌ Error: ${msgError.message}`;

              const errorReport = `⚠️ *WhatsApp System Alert*\n\n${detailedError}\n\n_Please check your Access Token permissions in Meta Dashboard._`;

              // محاولة إرسال تقرير الخطأ للمستخدم
              if (integration?.credentials?.accessToken) {
                try {
                  await axios.post(
                    `https://graph.facebook.com/v20.0/${phoneNumberId}/messages`,
                    {
                      messaging_product: "whatsapp",
                      to: from,
                      type: "text",
                      text: { body: errorReport },
                    },
                    {
                      headers: {
                        Authorization: `Bearer ${integration.credentials.accessToken}`,
                        "Content-Type": "application/json",
                      },
                    },
                  );
                } catch (reportErr) {
                  console.error(
                    "Final fallback failed:",
                    reportErr.response?.data || reportErr.message,
                  );
                }
              }

              // Log to DB
              if (integration?.company) {
                await CompanyChat.create({
                  company: integration.company,
                  user: "SYSTEM_ERROR",
                  text: `Loop Error: ${msgError.message}`,
                  sender: "ai",
                  platform: "whatsapp",
                }).catch(() => {});
              }
            }
          }
        }
      }
    }
  } catch (error) {
    console.error("❌ Error handling WhatsApp message:", error.message);
    try {
      // Attempt to write the fatal error to DB so the developer can see it
      const ints = await Integration.find({ platform: "whatsapp" });
      if (ints.length > 0) {
        await CompanyChat.create({
          company: ints[0].company,
          user: "FATAL_ERROR",
          text: error.message,
          sender: "ai",
          platform: "whatsapp",
        });
      }
    } catch (e) {}
    throw error;
  }
};

/**
 * Instagram Webhook Handler
 */
export const handleInstagramWebhook = async (body) => {
  try {
    console.log(`[IG Webhook] ======= INSTAGRAM HANDLER START =======`);
    console.log(`[IG Webhook] body.object: "${body.object}"`);
    console.log(`[IG Webhook] entries count: ${body.entry?.length || 0}`);
    
    // Meta webhooks for Instagram usually have object === 'page' or 'instagram'
    if (body.object !== "page" && body.object !== "instagram") {
      console.log(`[IG Webhook] Ignoring: object "${body.object}" is not page/instagram`);
      return;
    }

    for (const entry of body.entry) {
      const receiverId = entry.id;
      console.log(`[IG Webhook] Processing entry: receiverId=${receiverId}, hasMessaging=${!!entry.messaging}, hasChanges=${!!entry.changes}, changesCount=${entry.changes?.length || 0}`);

      // Handle Messages (DM)
      if (entry.messaging) {
        console.log(`[IG Webhook] Messaging events count: ${entry.messaging.length}`);
        for (const event of entry.messaging) {
          if (event.message && event.message.text && !event.message.is_echo) {
            const senderId = event.sender.id;
            const messageText = event.message.text;
            const messageId = event.message.mid;
            console.log(`[IG Webhook] Received message '${messageText}' from ${senderId}`);

            if (processedMessages.has(messageId)) continue;
            processedMessages.add(messageId);
            if (processedMessages.size > 1000)
              processedMessages.delete(processedMessages.values().next().value);

            // Find integration using the page ID or IG account ID
            const allIgIntegrations = await Integration.find({
              platform: "instagram",
              isActive: true,
            });

            let integration = allIgIntegrations.find(
              (int) =>
                String(int.credentials?.pageId) === String(receiverId) ||
                String(int.credentials?.igAccountId) === String(receiverId),
            );

            if (!integration && allIgIntegrations.length > 0) {
              console.log(`[IG Webhook] ⚠️ No exact match for receiverId ${receiverId}, falling back to first active integration.`);
              integration = allIgIntegrations[0];
              // Save the igAccountId for future use
              try {
                if (integration.credentials) {
                  integration.credentials.igAccountId = receiverId;
                  integration.markModified('credentials');
                  await integration.save();
                  console.log(`[IG Webhook] 🔧 Saved igAccountId ${receiverId} to integration ${integration._id}`);
                }
              } catch (e) {
                console.error('[IG Webhook] Failed to save fallback igAccountId:', e.message);
              }
            }

            if (!integration) {
                console.error(`[IG Webhook] ❌ No active Instagram integration found for receiverId: ${receiverId}`);
                continue;
            }
            if (!integration.company) {
                console.error(`[IG Webhook] ❌ Integration has no associated company.`);
                continue;
            }
            console.log(`[IG Webhook] ✅ Found integration for company: ${integration.company}`);

            const accessToken = integration.credentials.accessToken;
            const settings = integration.settings || {};
            const chatbotRules = settings.chatbotRules || [];
            const commands = settings.commands || [];

            await CompanyChat.create({
              company: integration.company,
              user: senderId,
              text: messageText,
              sender: "user",
              platform: "instagram",
            });

            let replyMsg = null;

            // 1. Check if matches any exact chatbot rule (DM trigger)
            const cleanMessageText = messageText.trim().toLowerCase();
            const matchedRule = chatbotRules.find(
              (rule) =>
                (rule.trigger || '').toLowerCase().trim() === cleanMessageText
            );

            if (matchedRule) {
              replyMsg = matchedRule.response;
            } else {
              // 2. Check if matches any exact command (ignoring leading slashes)
              const cleanCmdText = messageText.trim().toLowerCase().replace(/^\/+/, '');
              const command = commands.find(
                (cmd) =>
                  (cmd.command || '').toLowerCase().trim().replace(/^\/+/, '') === cleanCmdText
              );

              const company = await Company.findById(integration.company);

              if (command && command.type === "fixed_message") {
                replyMsg = command.message;
              } else if (command && command.type === "product_menu") {
                let menuText = command.message + "\n\n";
                (command.products || []).forEach((p, idx) => {
                    menuText += `${idx + 1}. ${p.name} - ${p.price}\n`;
                });
                replyMsg = menuText;
              } else {
                // 3. AI Fallback (or if type === "ai")
                if (company) {
                  const context = await getCompanyAIContext(company, integration);
                  try {
                    replyMsg = await fetchAiResponse(
                      `${context}\n\nClient asking on Instagram: ${messageText}`,
                      "عذراً لم أتمكن من الرد.",
                      company.aiSettings?.model,
                    );
                  } catch (aiErr) {
                    const errMsg = aiErr.response?.data?.error?.message || aiErr.message;
                    replyMsg = `[AI System Error]: ${errMsg}`;
                    console.error("AI Error for Instagram:", errMsg);
                    await logIntegrationError(integration, `AI Error: ${errMsg}`);
                  }
                }
              }
            }

            if (replyMsg) {
              try {
                // Send the reply message using the correct Instagram Account ID endpoint
                await axios.post(
                  `https://graph.facebook.com/v20.0/me/messages`,
                  { recipient: { id: senderId }, message: { text: replyMsg } },
                  { params: { access_token: accessToken } }
                );
                await CompanyChat.create({
                  company: integration.company,
                  user: senderId,
                  text: replyMsg,
                  sender: "ai",
                  platform: "instagram",
                  status: "delivered",
                });
              } catch (err) {
                const errorMessage = err.response?.data?.error?.message || err.message;
                console.error("Error sending IG DM:", errorMessage);
                await logIntegrationError(integration, `DM Send Error: ${errorMessage}`);
                
                await CompanyChat.create({
                  company: integration.company,
                  user: senderId,
                  text: replyMsg,
                  sender: "ai",
                  platform: "instagram",
                  status: "failed",
                });

                // Fallback to send the error message to the user as requested
                try {
                  await axios.post(
                    `https://graph.facebook.com/v20.0/me/messages`,
                    { recipient: { id: senderId }, message: { text: `[System Error]: ${errorMessage}` } },
                    { params: { access_token: accessToken } }
                  );
                } catch (fallbackErr) {
                  console.error("Fallback IG error message failed:", fallbackErr.message);
                }
              }
            }
          }
        }
      }

      // Handle Comments (Instagram comments arrive as field:"feed" with value.item:"comment")
      if (entry.changes) {
        for (const change of entry.changes) {
          const isCommentEvent =
            change.field === "feed" && change.value?.item === "comment" ||
            change.field === "comments"; // legacy fallback

          console.log(`[IG Webhook] Change field: "${change.field}", item: "${change.value?.item}", isComment: ${isCommentEvent}`);

          if (isCommentEvent) {
            const commentValue = change.value;
            const commentId = commentValue.comment_id || commentValue.id;
            const commentText = commentValue.message || commentValue.text;
            const fromId = commentValue.from?.id || commentValue.sender_id;
            const fromName = commentValue.from?.name || commentValue.from?.username || "user";

            console.log(`[IG Webhook] 💬 Comment received: id=${commentId}, from=${fromId} (${fromName}), text="${commentText}"`);

            if (!fromId || !commentText) {
              console.log(`[IG Webhook] ⚠️ Skipping comment: missing fromId or commentText`);
              continue;
            }

            if (processedMessages.has(commentId)) {
              console.log(`[IG Webhook] ⚠️ Comment ${commentId} already processed, skipping`);
              continue;
            }
            processedMessages.add(commentId);
            if (processedMessages.size > 1000)
              processedMessages.delete(processedMessages.values().next().value);

            const allIgIntegrations = await Integration.find({
              platform: "instagram",
              isActive: true,
            });

            console.log(`[IG Webhook] Found ${allIgIntegrations.length} active IG integrations`);

            let integration = allIgIntegrations.find(
              (int) =>
                String(int.credentials?.pageId) === String(receiverId) ||
                String(int.credentials?.igAccountId) === String(receiverId),
            );

            // Fallback: if no match by ID and there's only one integration, use it
            if (!integration && allIgIntegrations.length > 0) {
              console.log(`[IG Webhook] ⚠️ No exact match for receiverId ${receiverId}, falling back to first integration`);
              integration = allIgIntegrations[0];
            }

            if (!integration || !integration.company) {
              console.log(`[IG Webhook] ❌ No integration or company found, skipping`);
              continue;
            }

            // Loop prevention: skip comments made by the business account itself
            const igAccountId = String(integration.credentials?.igAccountId || '');
            const pageId = String(integration.credentials?.pageId || '');
            if (String(fromId) === igAccountId || String(fromId) === pageId) {
              console.log(`[IG Webhook] 🔄 Skipping own comment from ${fromId}`);
              continue;
            }

            const accessToken = integration.credentials.accessToken;
            const settings = integration.settings || {};
            const globalRules = settings.globalCommentRules || [];
            const dmClosedFallback = settings.dmClosedFallback || "";

            console.log(`[IG Webhook] 🔍 Checking ${globalRules.length} global comment rules against: "${commentText}"`);

            // Check global rules
            const matchedRule = globalRules.find((r) =>
              commentText.toLowerCase().includes((r.keyword || '').toLowerCase()),
            );

            if (matchedRule) {
              console.log(`[IG Webhook] ✅ Matched rule: keyword="${matchedRule.keyword}"`);
              let canSendDm = true;
              let isFollower = true;

              if (matchedRule.requireFollow) {
                if (!isFollower) {
                  canSendDm = false;
                }
              }

              if (!canSendDm) {
                if (matchedRule.notFollowingReply) {
                  try {
                    await axios.post(
                      `https://graph.facebook.com/v20.0/${commentId}/replies`,
                      { message: matchedRule.notFollowingReply },
                      { params: { access_token: accessToken } },
                    );
                  } catch (replyErr) {
                    console.error(
                      "[IG Webhook] Failed to reply (not following):",
                      replyErr.response?.data || replyErr.message,
                    );
                  }
                }
              } else {
                let dmSuccess = false;

                // 1. Try to send DM (Private reply to comment)
                if (matchedRule.dmReply) {
                  try {
                    await axios.post(
                      `https://graph.facebook.com/v20.0/me/messages`,
                      {
                        recipient: { comment_id: commentId },
                        message: { text: matchedRule.dmReply },
                      },
                      { params: { access_token: accessToken } },
                    );
                    console.log(`[IG Webhook] ✅ DM sent successfully for comment ${commentId}`);
                    await CompanyChat.create({
                      company: integration.company,
                      user: fromId,
                      text: matchedRule.dmReply,
                      sender: "ai",
                      platform: "instagram",
                      status: "delivered",
                    });
                    dmSuccess = true;
                  } catch (dmErr) {
                    console.error(
                      "[IG Webhook] ❌ Failed to send DM for comment:",
                      JSON.stringify(dmErr.response?.data || dmErr.message),
                    );
                    await CompanyChat.create({
                      company: integration.company,
                      user: fromId,
                      text: matchedRule.dmReply,
                      sender: "ai",
                      platform: "instagram",
                      status: "failed",
                    });
                    dmSuccess = false;
                  }
                }

                // 2. Reply to comment (success reply or fallback if DM failed)
                const commentReplyText = dmSuccess
                  ? matchedRule.commentReply
                  : dmClosedFallback || matchedRule.commentReply;

                if (commentReplyText) {
                  try {
                    await axios.post(
                      `https://graph.facebook.com/v20.0/${commentId}/replies`,
                      { message: commentReplyText },
                      { params: { access_token: accessToken } },
                    );
                    console.log(`[IG Webhook] ✅ Comment reply sent for ${commentId}`);
                  } catch (replyErr) {
                    console.error(
                      "[IG Webhook] ❌ Failed to reply to IG comment:",
                      JSON.stringify(replyErr.response?.data || replyErr.message),
                    );
                  }
                }
              }
            } else {
              console.log(`[IG Webhook] ℹ️ No matching rule found for comment: "${commentText}"`);
              // No rule matched - optionally reply with AI
              // Save the comment to chat history
              await CompanyChat.create({
                company: integration.company,
                user: fromId,
                text: `[Comment] ${commentText}`,
                sender: "user",
                platform: "instagram",
              }).catch(e => console.error("[IG Webhook] DB save error:", e.message));
            }
          }
        }
      }
    }
  } catch (error) {
    console.error("❌ Error handling Instagram webhook:", error.message);
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
      const data = cb.data || "";
      const user = cb.from?.username || cb.from?.first_name || "عميل";
      const userId = chatId.toString();

      if (data.startsWith("order:")) {
        const productName = data.replace("order:", "");

        // Use lean() for reading only - we don't need Mongoose methods here
        const integration = await Integration.findOne({
          company: companyId,
          platform: "telegram",
          isActive: true,
        });

        if (!integration) return res.sendStatus(200);

        const botToken = integration.credentials.botToken;

        // Answer callback to remove loading spinner
        await axios
          .post(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
            callback_query_id: cb.id,
          })
          .catch(() => {});

        // Find the command config that has this product to get successMessage
        const matchedCmd = (integration.settings?.commands || []).find(
          (c) =>
            c.type === "product_menu" &&
            (c.products || []).some((p) => p.name === productName),
        );
        const successMessage = matchedCmd?.successMessage || "";

        // Start Order Session - wait for phone number
        orderSessions[chatId] = {
          productName,
          customerName: user,
          userId,
          companyId,
          successMessage,
          timestamp: Date.now(),
        };

        // Ask for phone number
        const requestPhoneMsg = `جميل جداً! أنت اخترت: <b>${productName}</b>.\n\nمن فضلك أرسل <b>رقم الموبايل</b> الخاص بك (11 رقم) لتأكيد طلبك وسنتواصل معك فوراً. 📱`;
        await tgSend(botToken, chatId, requestPhoneMsg);
        await saveChatMsg(companyId, userId, requestPhoneMsg, "ai");
      }

      return res.sendStatus(200);
    }

    // ══════════════════════════════════════════════════════════════════════
    // ══ REGULAR MESSAGE ═══════════════════════════════════════════════════
    // ══════════════════════════════════════════════════════════════════════
    if (!body.message) return res.sendStatus(200);

    const chatId = body.message.chat.id;
    let text = body.message.text || body.message.caption || "";
    const user =
      body.message.from?.username ||
      body.message.from?.first_name ||
      "مستخدم تليجرام";
    const userId = chatId.toString();

    // Deduplicate messages
    const messageId = `tg_${body.message.message_id}`;
    if (processedMessages.has(messageId)) return res.sendStatus(200);
    processedMessages.add(messageId);
    if (processedMessages.size > 1000)
      processedMessages.delete(processedMessages.values().next().value);

    // Get integration data (lean for reading)
    const integration = await Integration.findOne({
      company: companyId,
      platform: "telegram",
      isActive: true,
    });

    if (!integration) return res.sendStatus(200);

    const botToken = integration.credentials.botToken;

    let base64Media = null;
    let mediaFileId = null;
    let isAudio = false;

    if (body.message.photo) {
        mediaFileId = body.message.photo[body.message.photo.length - 1].file_id;
    } else if (body.message.video) {
        mediaFileId = body.message.video.file_id;
    } else if (body.message.sticker) {
        mediaFileId = body.message.sticker.file_id;
    } else if (body.message.voice) {
        mediaFileId = body.message.voice.file_id;
        isAudio = true;
    } else if (body.message.audio) {
        mediaFileId = body.message.audio.file_id;
        isAudio = true;
    }

    if (mediaFileId) {
        const mediaResult = await downloadTgMedia(botToken, mediaFileId);
        if (mediaResult) {
            if (isAudio) {
                console.log(`[Telegram Audio] Transcribing with MIME: ${mediaResult.mimeType}...`);
                text = await transcribeAudio(mediaResult.buffer, 'audio.ogg', mediaResult.mimeType);
                console.log(`[Telegram Audio] Transcription result: "${text.substring(0, 80)}..."`);
            } else {
                base64Media = mediaResult.base64DataUri;
                if (!text) text = body.message.video ? "العميل أرسل فيديو. قم بتحليل محتوى الفيديو والرد على العميل." : "العميل أرسل صورة. قم بتحليل محتوى الصورة والرد على العميل.";
            }
        } else if (isAudio) {
            text = "[فشل تحميل الرسالة الصوتية من تليجرام]";
        }
    }

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
          source: 'telegram',
          date: new Date(),
        });
        await companyDoc.save();
      }

      await saveChatMsg(
        companyId,
        userId,
        `رقم الموبايل: ${phoneNumber}`,
        "user",
      );

      // Send Confirmation (Custom or Default)
      let confirmMsg =
        session.successMessage ||
        `✅ تم بنجاح طلب <b>${session.productName}</b>!\n\nسيتواصل معك فريقنا قريباً على الرقم: ${phoneNumber}\nشكراً لك! 🙏`;
      confirmMsg = confirmMsg
        .replace("{{product}}", session.productName)
        .replace("{{phone}}", phoneNumber);

      await tgSend(botToken, chatId, confirmMsg);
      await saveChatMsg(companyId, userId, confirmMsg, "ai");

      delete orderSessions[chatId];
      return res.sendStatus(200);
    }

    // ── Match Command ────────────────────────────────────────────────────
    const cleanText = text.trim().toLowerCase().replace("/", "");
    const commands = integration.settings?.commands || [];
    const commandConfig = commands.find(
      (c) => cleanText === c.command || text === `/${c.command}`,
    );

    if (commandConfig) {
      console.log(
        `🎯 Command matched: ${commandConfig.command} | Type: ${commandConfig.type} | Products: ${(commandConfig.products || []).length}`,
      );
      const cmdType = commandConfig.type || "ai";

      // Save incoming command to chat history
      await saveChatMsg(companyId, userId, text, "user");

      if (cmdType === "fixed_message") {
        const replyMsg =
          commandConfig.message ||
          `مرحباً! أنت في قسم: ${commandConfig.category || commandConfig.description}.`;
        await tgSend(botToken, chatId, replyMsg);
        await saveChatMsg(companyId, userId, replyMsg, "ai");

        // Save as dashboard request
        const companyDoc = await Company.findById(companyId);
        if (companyDoc) {
          companyDoc.requests.push({
            customerName: user,
            product: commandConfig.category || commandConfig.command,
            message: text,
            source: 'telegram',
            date: new Date(),
          });
          await companyDoc.save();
        }
      } else if (cmdType === "product_menu") {
        const products = commandConfig.products || [];
        if (products.length === 0) {
          await tgSend(botToken, chatId, `عذراً، لا توجد منتجات متاحة حالياً.`);
          return res.sendStatus(200);
        }
        const introText =
          commandConfig.message ||
          `🛍️ اختر المنتج الذي تريده من <b>${commandConfig.category || "قائمتنا"}</b>:`;
        await tgSendProductMenu(botToken, chatId, products, introText);
        await saveChatMsg(companyId, userId, introText, "ai");
      } else {
        // AI type
        const companyDoc = await Company.findById(companyId);
        const context = await getCompanyAIContext(companyDoc, integration);
        const history = await getChatHistory(companyId, userId, "telegram", 5);
        const historyContext = formatHistoryForPrompt(history);
        const reply = await fetchAiResponse(
          `${context}\n\n${historyContext}User Question:\n${text}`,
          "عذراً لم أتمكن من الرد.",
          companyDoc.aiSettings?.model,
          base64Media
        );
        await tgSend(botToken, chatId, reply);
        await saveChatMsg(companyId, userId, reply, "ai");

        if (companyDoc) {
          companyDoc.requests.push({
            customerName: user,
            product: commandConfig.category || commandConfig.command,
            message: text,
            source: 'telegram',
            date: new Date(),
          });
          await companyDoc.save();
        }
      }

      return res.sendStatus(200);
    }

    // ── No command matched → Default AI reply ───────────────────────────
    const companyDoc = await Company.findById(companyId);
    const context = await getCompanyAIContext(companyDoc, integration);

      await saveChatMsg(companyId, userId, text, "user");

    // Send notification for new incoming Telegram message
    NotificationService.notifyNewMessage(companyId, user || userId, "telegram", text).catch(() => {});

    const history = await getChatHistory(companyId, userId, "telegram", 5);
    const historyContext = formatHistoryForPrompt(history);
    const reply = await fetchAiResponse(
      `${context}\n\n${historyContext}User Question:\n${text}`,
      "عذراً لم أتمكن من الرد.",
      companyDoc.aiSettings?.model,
      base64Media
    );
    await tgSend(botToken, chatId, reply);
    await saveChatMsg(companyId, userId, reply, "ai");

    // Notify that AI replied
    NotificationService.notifyAiReply(companyId, user || userId, "telegram").catch(() => {});

    res.sendStatus(200);
  } catch (error) {
    console.error("Error handling Telegram Webhook:", error.message);
    res.sendStatus(500);
  }
};
