import CompanyChat from '../models/CompanyChat.js';

/**
 * Get the last N messages for a specific company and user context
 */
export async function getChatHistory(companyId, userId, platform = 'web', limit = 10) {
    try {
        const chats = await CompanyChat.find({
            company: companyId,
            user: userId,
            platform: platform
        })
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();

        // Sort them chronologically (oldest first)
        return chats.reverse().map(c => ({
            role: c.sender === 'user' ? 'user' : 'assistant',
            text: c.text
        }));
    } catch (error) {
        console.error('Error fetching chat history:', error);
        return [];
    }
}

/**
 * Format chat history for prompt
 */
export function formatHistoryForPrompt(history) {
    if (!history || history.length === 0) return '';
    
    return "Recent conversation history:\n" + history.map(h => 
        `${h.role === 'user' ? 'User' : 'Assistant'}: ${h.text}`
    ).join('\n') + "\n\n";
}
