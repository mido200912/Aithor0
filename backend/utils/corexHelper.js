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
