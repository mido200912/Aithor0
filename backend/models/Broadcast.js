import { FirestoreModel } from "../config/firestoreModel.js";

class BroadcastModel extends FirestoreModel {
  async create(data) {
    const defaultData = {
      message: data.message || "",
      type: data.type || "info", // info, warning, success
      active: true,
      createdAt: new Date().toISOString()
    };
    return super.create(defaultData);
  }
}

const Broadcast = new BroadcastModel("broadcasts");
export default Broadcast;
