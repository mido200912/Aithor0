/**
 * Secure Storage Utility
 * Provides a layer of obfuscation for data stored in localStorage.
 * This prevents users from easily reading or modified sensitive data in clear text.
 */

const SECRET_SALT = 'voxio_secure_v1_';

const encrypt = (text) => {
    if (!text) return text;
    // Simple but effective scrambling for client-side storage
    const encoded = btoa(unescape(encodeURIComponent(text)));
    return SECRET_SALT + encoded.split('').reverse().join('');
};

const decrypt = (scrambled) => {
    if (!scrambled) return null;
    if (!scrambled.startsWith(SECRET_SALT)) return scrambled; // Fallback for unencrypted data
    try {
        const encoded = scrambled.replace(SECRET_SALT, '').split('').reverse().join('');
        return decodeURIComponent(escape(atob(encoded)));
    } catch (e) {
        return scrambled; // Fallback
    }
};

export const secureStorage = {
    setItem: (key, value) => {
        if (value === null || value === undefined) {
            localStorage.removeItem(key);
            return;
        }
        const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
        localStorage.setItem(key, encrypt(stringValue));
    },
    getItem: (key) => {
        const scrambled = localStorage.getItem(key);
        if (!scrambled) return null;
        
        const decrypted = decrypt(scrambled);
        if (!decrypted) return null;
        
        try {
            // Check if it's a JSON string
            if ((decrypted.startsWith('{') && decrypted.endsWith('}')) || (decrypted.startsWith('[') && decrypted.endsWith(']'))) {
                return JSON.parse(decrypted);
            }
            return decrypted;
        } catch (e) {
            return decrypted;
        }
    },
    removeItem: (key) => {
        localStorage.removeItem(key);
    },
    clear: () => {
        localStorage.clear();
    }
};
