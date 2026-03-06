import mongoose from "mongoose";

const CompanyChatSchema = new mongoose.Schema(
  {
    company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
    user: { type: String, required: true }, // Customer name or phone number
    text: { type: String, required: true },
    sender: { type: String, enum: ['user', 'ai'], default: 'user' },
    platform: { type: String, enum: ['web', 'whatsapp', 'facebook', 'instagram'], default: 'web' },
  },
  { timestamps: true }
);

// Index for fast retrieval of chat history per company and user
CompanyChatSchema.index({ company: 1, user: 1, createdAt: 1 });

export default mongoose.model("CompanyChat", CompanyChatSchema);
