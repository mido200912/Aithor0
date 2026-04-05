import { FirestoreModel } from "../config/firestoreModel.js";

class IntegrationModel extends FirestoreModel {
  async create(data) {
    const defaultData = {
      isActive: true,
      settings: {
        autoReply: true,
        syncProducts: false,
        commands: []
      },
      ...data
    };
    return super.create(defaultData);
  }
}

const Integration = new IntegrationModel('integrations');
export default Integration;
