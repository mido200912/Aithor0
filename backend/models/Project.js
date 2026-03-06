import mongoose from "mongoose";

const projectSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  name: { type: String, required: true },
  description: String,
  products: [{ title: String, price: Number, sku: String }],
  faqs: [{ q: String, a: String }],
  tone: { type: String, default: "professional" }, // voice/tone
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("Project", projectSchema);
