/**
 * Helper to generate a unified, restrictive system prompt for AI agents.
 */
export async function getCompanyAIContext(companyDoc) {
    if (!companyDoc) return "You are a general business assistant.";

    // Dynamic import Project model to fetch product info
    let productsInfo = "No specific products listed.";
    try {
        const Project = (await import("../models/Project.js")).default;
        const projects = await Project.find({ companyId: companyDoc._id });
        if (projects.length > 0) {
            productsInfo = projects.map(p => {
                return `Project: ${p.name}\nProducts: ${p.products.map(prod => `- ${prod.title} (${prod.price} $)`).join(", ")}`;
            }).join("\n\n");
        }
    } catch (e) {
        console.error("Error fetching projects in context helper:", e);
    }

    const knowledgeContext = companyDoc.extractedKnowledge || "لا توجد معلومات إضافية متاحة حالياً.";

    const parts = [
        `You are a specialized AI assistant representing the company "${companyDoc.name || 'N/A'}".`,
        "",
        "🔴 CRITICAL INSTRUCTIONS (MANDATORY):",
        "1. DO NOT ANSWER any questions outside your company scope. You are only programmed to help with this company's products, services, and information.",
        "2. If a user asks you for general tasks (e.g., 'make me a website', 'tell me a joke') or anything unrelated to this company, YOU MUST REFUSE politely.",
        "3. REFUSAL MESSAGE (Use user's language): 'عذراً، لا يمكنني القيام بذلك. أنا مبرمج للإجابة فقط على الاستفسارات المتعلقة بخدمات ومنتجات هذه الشركة ومساعدة عملائها.'",
        "4. DO NOT explain why or give general advice. Just refuse politely as per instruction #3.",
        "",
        "Company Profile:",
        `- Industry: ${companyDoc.industry || "N/A"}`,
        `- Description: ${companyDoc.description || "No description provided"}`,
        `- Vision: ${companyDoc.vision || "No vision provided"}`,
        `- Mission: ${companyDoc.mission || "No mission provided"}`,
        `- Values: ${(companyDoc.values || []).join(", ") || "No values provided"}`,
        "",
        "Available Products & Services:",
        productsInfo,
        "",
        "Knowledge Base (Fact source):",
        knowledgeContext,
        "",
        "Custom Instructions (Follow exactly):",
        companyDoc.customInstructions || "Respond professionally and naturally.",
        "",
        "Interaction Rule: Respond in the language used by the user (Arabic/English)."
    ];

    return parts.join("\n").trim();
}
