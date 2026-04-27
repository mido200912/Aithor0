import { FirestoreModel } from "../config/firestoreModel.js";

class SupportMessageModel extends FirestoreModel {
  async create(data) {
    const defaultData = {
      name: data.name || "",
      email: data.email || "",
      subject: data.subject || "",
      message: data.message || "",
      status: "unread", // unread, read, replied
      createdAt: new Date().toISOString()
    };
    return super.create(defaultData);
  }
}

const SupportMessage = new SupportMessageModel("support_messages");
export default SupportMessage;
