import admin from 'firebase-admin';
import dotenv from 'dotenv';
dotenv.config();

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    }),
  });
}

const db = admin.firestore();

async function inspect() {
  const snapshot = await db.collection('companies').limit(1).get();
  snapshot.forEach(doc => {
    console.log('Fields in Company Doc:', Object.keys(doc.data()));
    const data = doc.data();
    if (data.knowledgeBase) console.log('knowledgeBase structure:', data.knowledgeBase);
    if (data.extractedKnowledge) console.log('extractedKnowledge (preview):', data.extractedKnowledge.substring(0, 100));
    if (data.urlExtractedKnowledge) console.log('urlExtractedKnowledge (preview):', data.urlExtractedKnowledge.substring(0, 100));
  });
  process.exit(0);
}

inspect();
