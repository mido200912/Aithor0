import mongoose from "mongoose";
import crypto from "crypto";

const companySchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    name: { type: String, required: true },
    description: { type: String },
    industry: { type: String },
    size: { type: String },
    vision: { type: String },
    mission: { type: String },
    values: { type: [String] },
    apiKey: {
      type: String,
      unique: true,
      default: () => crypto.randomBytes(24).toString("hex"),
    },
    requests: [
      {
        customerName: String,
        product: String,
        message: String,
        date: { type: Date, default: Date.now },
      },
    ],
    knowledgeBase: [
      {
        fileName: String,
        fileUrl: String,
        fileType: String, // 'pdf', 'docx', 'text'
        uploadedAt: { type: Date, default: Date.now }
      }
    ],
    extractedKnowledge: {
      type: String,
      default: ""
    }, // ✨ AI-extracted text from all uploaded files
    customInstructions: { type: String, default: "" },
  },
  { timestamps: true }
);

const Company = mongoose.model("Company", companySchema);
export default Company;
