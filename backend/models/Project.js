import { FirestoreModel } from "../config/firestoreModel.js";

class ProjectModel extends FirestoreModel {
  async create(data) {
    const defaultData = {
      tone: "professional",
      products: [],
      faqs: [],
      ...data
    };
    return super.create(defaultData);
  }
}

const Project = new ProjectModel("projects");
export default Project;
