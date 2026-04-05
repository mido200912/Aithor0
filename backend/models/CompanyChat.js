import { FirestoreModel } from "../config/firestoreModel.js";

class CompanyChatModel extends FirestoreModel {
  async create(data) {
    const defaultData = {
      sender: 'user',
      platform: 'web',
      ...data
    };
    return super.create(defaultData);
  }

  // To support `.find().sort().limit().lean()` used in history helper, we add a simple custom find query builder if needed,
  // but for now, we rely on the implementation in the wrapper or we can adjust routes.
}

const CompanyChat = new CompanyChatModel('company_chats');
export default CompanyChat;
