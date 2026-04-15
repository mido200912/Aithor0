import { FirestoreModel } from "../config/firestoreModel.js";

/**
 * Model for storing temporary registration data before OTP verification.
 * This prevents unverified users from being created in the main 'users' collection.
 */
const PendingUser = new FirestoreModel("pending_users");
export default PendingUser;
