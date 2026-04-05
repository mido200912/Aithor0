import admin from 'firebase-admin';

// Load Firebase credentials from environment variables (safe for deployment)
const serviceAccount = {
    type: "service_account",
    project_id: process.env.FIREBASE_PROJECT_ID,
    private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
    private_key: process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n').replace(/^"|"$/g, '') : undefined,
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    client_id: process.env.FIREBASE_CLIENT_ID,
    auth_uri: "https://accounts.google.com/o/oauth2/auth",
    token_uri: "https://oauth2.googleapis.com/token",
    auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
    client_x509_cert_url: process.env.FIREBASE_CLIENT_CERT_URL,
    universe_domain: "googleapis.com"
};

let db;
let firebaseInitError = null;

try {
    if (!serviceAccount.project_id || !serviceAccount.private_key || !serviceAccount.client_email) {
        firebaseInitError = new Error('Missing FIREBASE_* environment variables.');
        console.error('❌ Firebase Error: Missing FIREBASE_* environment variables.');
    } else {
        if (!admin.apps.length) {
            const app = admin.initializeApp({
                credential: admin.credential.cert(serviceAccount)
            });
            db = app.firestore();
        } else {
            db = admin.firestore();
        }

        // ⚡ Performance: Configure Firestore settings once at startup
        if (db) {
            db.settings({
                ignoreUndefinedProperties: true, // avoids manual undefined->delete conversions
            });
        }
    }
} catch (error) {
    firebaseInitError = error;
    console.error('Firebase Initialization Error:', error);
}

// ⚡ Pre-import firebase-admin for save() so we don't do dynamic import() every time
export { db, firebaseInitError };
export default admin;
