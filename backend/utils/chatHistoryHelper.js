import CompanyChat from '../models/CompanyChat.js';

/**
 * Get the last N messages for a specific company and user context
 */
export async function getChatHistory(companyId, userId, platform = 'web', limit_val = 10) {
    try {
        const chats = await CompanyChat.find({
            company: companyId,
            user: userId,
            platform: platform
        });

        // Filter valid data and sort them natively in JS since the basic wrapper doesn't support chained sorting
        chats.sort((a, b) => {
            const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return timeB - timeA; // Descending
        });

        const limitedChats = chats.slice(0, limit_val);

        // Sort them chronologically (oldest first)
        return limitedChats.reverse().map(c => ({
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
