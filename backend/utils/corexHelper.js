import axios from 'axios';

/**
 * Helper for CoreSys API
 * Parses the response from CoreSys which may return nested JSON strings.
 *
 * Example CoreSys raw response:
 *   { status: 'success', response: '{"response":"النص الحقيقي"}' }
 * OR:
 *   { status: 'success', response: 'النص الحقيقي' }
 */
export function extractCorexReply(data, fallback = "لم أتمكن من الرد حالياً.") {
  if (!data || data.status !== 'success') return fallback;

  let raw = data.response;
  if (!raw) return fallback;

  // If it's a JSON string like {"response":"..."}, parse it
  if (typeof raw === 'string' && raw.trim().startsWith('{')) {
    try {
      const parsed = JSON.parse(raw);
      // Try common keys
      raw = parsed.response || parsed.reply || parsed.text || parsed.message || raw;
    } catch (_) {
      // Not valid JSON, use as-is
    }
  }

  return raw || fallback;
}

/**
 * Unified AI Request Handler
 * Tries CoreSys first, falls back to OpenRouter if API limits are hit or server fails.
 */
export async function fetchAiResponse(fullQuestion, fallbackText = "لم أتمكن من الرد حالياً.") {
    let reply = null;

    // ✅ Use POST to avoid 414 URI Too Long errors — no truncation needed
    const truncatedQuestion = fullQuestion.length > 12000 ? fullQuestion.substring(0, 12000) + "..." : fullQuestion;

    try {
        const apiUrl = process.env.COREX_API_URL || "https://dev-c7z.pantheonsite.io/CoreSys/chat.php";
        const aiApiKey = process.env.COREX_API_KEY || "VOXIOV1_6F85B401ED";

        const aiResponse = await axios.post(apiUrl, 
            new URLSearchParams({ key: aiApiKey, act: 'assistant', a: truncatedQuestion }).toString(),
            { 
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                timeout: 60000 
            }
        );
        reply = extractCorexReply(aiResponse.data, null);

        if (reply && typeof reply === 'string' && (reply.includes('daily limit') || reply.includes('{"success":false'))) {
            throw new Error('CoreSys API limit reached'); 
        }
    } catch (error) {
        console.log(`🔄 CoreSys Primary failed: ${error.message}`);
        reply = null;
    }

    // 🔄 OpenRouter Fallback if CoreX fails
    if (!reply) {
        const openRouterApiKey = process.env.OPENROUTER_API_KEY;
        if (openRouterApiKey) {
            try {
                const fallbackResponse = await axios.post("https://openrouter.ai/api/v1/chat/completions", {
                    model: "google/gemini-2.0-flash-001", 
                    messages: [{ role: "user", content: truncatedQuestion }],
                    max_tokens: 2000
                }, {
                    headers: {
                        "Authorization": `Bearer ${openRouterApiKey}`,
                        "Content-Type": "application/json"
                    },
                    timeout: 60000
                });
                
                if (fallbackResponse.data?.choices?.length > 0) {
                    reply = fallbackResponse.data.choices[0].message.content;
                }
            } catch (fallbackError) {
                console.error('❌ Fallback failed:', fallbackError.response?.data || fallbackError.message);
            }
        }
    }

    return reply || fallbackText;
}

/**
 * Dedicated AI function for the Website Designer (Corex Editor)
 * Uses OpenRouter POST directly — no URL truncation, sends the FULL code context.
 * Falls back to CoreSys if OpenRouter fails.
 */
export async function fetchDesignerAiResponse(systemPrompt, userPrompt, fallbackText = "Failed to generate design.") {
    const openRouterApiKey = process.env.OPENROUTER_API_KEY;
    
    // Try OpenRouter FIRST (POST = no URL length limits = full code context)
    if (openRouterApiKey) {
        try {
            console.log("🎨 Designer AI: Sending to OpenRouter (POST)...");
            const response = await axios.post("https://openrouter.ai/api/v1/chat/completions", {
                model: "google/gemini-2.0-flash-001",
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userPrompt }
                ],
                temperature: 0.7,
                max_tokens: 8000
            }, {
                headers: {
                    "Authorization": `Bearer ${openRouterApiKey}`,
                    "Content-Type": "application/json"
                },
                timeout: 90000
            });
            
            if (response.data?.choices?.length > 0) {
                const reply = response.data.choices[0].message.content;
                console.log("🎨 Designer AI: Got response, length:", reply.length);
                return reply;
            }
        } catch (err) {
            console.error("🎨 Designer AI OpenRouter failed:", err.response?.data || err.message);
        }
    }
    
    // Fallback to CoreSys (GET - will truncate, but better than nothing)
    try {
        const fullQuestion = systemPrompt + "\n\nUser request: " + userPrompt;
        return await fetchAiResponse(fullQuestion, fallbackText);
    } catch (err) {
        console.error("🎨 Designer AI CoreSys fallback also failed:", err.message);
    }
    
    return fallbackText;
}
