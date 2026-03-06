import Company from "../models/company.js";

// Middleware للتحقق من صحة مفتاح API
const verifyApiKey = async (req, res, next) => {
    try {
      const { apiKey } = req.body;
      if (!apiKey) return res.status(400).json({ error: "apiKey مفقود" });
  
      const company = await Company.findOne({ apiKey });
      if (!company) return res.status(403).json({ error: "apiKey غير صالح" });
  
      req.company = company; // تخزين بيانات الشركة في الطلب
      next();
    } catch (err) {
      console.error("verifyApiKey error:", err.message);
      res.status(500).json({ error: "خطأ أثناء التحقق من مفتاح API" });
    }
  };
export { verifyApiKey };
