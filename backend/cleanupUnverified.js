import 'dotenv/config';
import User from "./models/User.js";
import { db } from "./config/firebase.js";

async function cleanup() {
    console.log("🧹 Starting cleanup of unverified users...");
    const snapshot = await db.collection("users").where("isVerified", "==", false).get();
    
    if (snapshot.empty) {
        console.log("✅ No unverified users found.");
        return;
    }

    console.log(`Found ${snapshot.size} unverified users to delete.`);
    const batch = db.batch();
    snapshot.forEach(doc => {
        batch.delete(doc.ref);
    });

    await batch.commit();
    console.log("✅ Cleanup complete.");
    process.exit(0);
}

cleanup().catch(err => {
    console.error(err);
    process.exit(1);
});
