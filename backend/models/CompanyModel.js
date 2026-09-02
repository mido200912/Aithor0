import { FirestoreModel } from "../config/firestoreModel.js";
import crypto from "crypto";

class CompanyModel extends FirestoreModel {
  async create(data) {
    const defaultData = {
      apiKey: crypto.randomBytes(24).toString("hex"),
      chatToken: `vchat_${crypto.randomBytes(16).toString("hex")}`,
      slug: data.name ? data.name.toLowerCase().replace(/ /g, "-") : `company-${Date.now()}`,
      websiteUrl: data.websiteUrl || "",
      allowedDomains: data.allowedDomains || [],
      extractedKnowledge: "",
      urlExtractedKnowledge: "",
      customInstructions: "",
      websiteConfig: {
        themeColor: "#4f46e5",
        backgroundColor: "#000000",
        welcomeMessage: "Hello! How can I help you today?",
        botName: data.name || "Assistant",
        layout: "centered",
        font: "Inter"
      },
      aiSettings: {
        mode: 'restricted', // 'general' or 'restricted'
        model: 'nvidia/nemotron-3-ultra-550b-a55b:free',
        languages: ['Arabic', 'English']
      },
      aiCredits: 500,
      aiEnabled: true,
      humanHandoffEnabled: true,
      humanHandoffUsers: [],
      ...data
    };
    return super.create(defaultData);
  }

  async findById(id) {
    const company = await super.findById(id);
    return await this._syncModel(company);
  }

  async findOne(query) {
    const company = await super.findOne(query);
    return await this._syncModel(company);
  }

  async find(query = {}) {
    const companies = await super.find(query);
    if (!companies) return [];
    return Promise.all(companies.map(c => this._syncModel(c)));
  }

  async _syncModel(company) {
    if (!company) return null;
    
    // Ensure global aiEnabled defaults to true for legacy companies
    if (company.aiEnabled === undefined || company.aiEnabled === null) {
      company.aiEnabled = true;
      try {
        await company.save();
      } catch (e) {
        console.error("[Model Sync] Failed to save aiEnabled default", e);
      }
    }
    
    // Dynamic import to avoid circular dependencies just in case
    const { VALID_MODELS, DEFAULT_TEXT_MODEL } = await import("../utils/corexHelper.js");
    
    if (company.aiSettings && company.aiSettings.model) {
      if (!VALID_MODELS.includes(company.aiSettings.model)) {
        console.log(`[Model Sync] Updating company ${company.name || company._id} model from ${company.aiSettings.model} to ${DEFAULT_TEXT_MODEL}`);
        company.aiSettings.model = DEFAULT_TEXT_MODEL;
        try {
          // company is an instance with .save() mapped
          await company.save();
        } catch (e) {
          console.error("[Model Sync] Failed to save updated model", e);
        }
      }
    } else if (company.aiSettings && !company.aiSettings.model) {
        company.aiSettings.model = DEFAULT_TEXT_MODEL;
        try {
          await company.save();
        } catch (e) {
          console.error("[Model Sync] Failed to save updated model", e);
        }
    }
    
    return company;
  }
}

const Company = new CompanyModel("companies");
export default Company;
