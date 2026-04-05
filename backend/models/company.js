import { FirestoreModel } from "../config/firestoreModel.js";
import crypto from "crypto";

class CompanyModel extends FirestoreModel {
  async create(data) {
    const defaultData = {
      apiKey: crypto.randomBytes(24).toString("hex"),
      requests: [],
      knowledgeBase: [],
      extractedKnowledge: "",
      customInstructions: "",
      ...data
    };
    return super.create(defaultData);
  }
}

const Company = new CompanyModel("companies");
export default Company;
