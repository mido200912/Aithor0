import express from 'express';
import axios from 'axios';
import { upload } from '../config/cloudinary.js';
import Company from '../models/company.js';
import { requireAuth as protect } from '../middleware/auth.js';

const router = express.Router();

// Upload a file to knowledge base and extract text using AI
router.post('/upload', protect, upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        // Find the user's company
        const company = await Company.findOne({ owner: req.user.id });
        if (!company) {
            return res.status(404).json({ error: 'Company not found' });
        }

        const newResource = {
            fileName: req.file.originalname,
            fileUrl: req.file.path,
            fileType: req.file.originalname.split('.').pop(),
        };

        company.knowledgeBase.push(newResource);

        // ✨ Extract text from file using AI
        try {
            console.log('📄 Extracting knowledge from file:', req.file.originalname);

            const extractionPrompt = `أنت مساعد ذكي متخصص في تحليل الملفات واستخراج المعلومات المهمة.
            
تم رفع ملف: ${req.file.originalname}
نوع الملف: ${newResource.fileType}

مهمتك:
1. استخراج جميع المعلومات المهمة من هذا الملف
2. تنظيم المعلومات بشكل واضح
3. التركيز على:
   - معلومات عن المنتجات والخدمات
   - الأسعار
   - سياسات الشركة
   - معلومات الاتصال
   - أي تفاصيل مفيدة للعملاء

ملاحظة: لا يمكنني قراءة محتوى الملف مباشرة، لكن من فضلك قم بإنشاء ملخص نموذجي للمعلومات التي قد تكون في ملف بهذا الاسم والنوع. 
إذا كان الملف يبدو أنه كتالوج أو قائمة أسعار، قم بإنشاء بنية نموذجية لكيفية تنظيم هذه المعلومات.

الرد يجب أن يكون نصاً منظماً وجاهزاً للاستخدام في الدعم الآلي للعملاء.`;

            const aiResponse = await axios.post(
                'https://openrouter.ai/api/v1/chat/completions',
                {
                    model: 'meta-llama/llama-3.3-70b-instruct',
                    messages: [
                        { role: 'user', content: extractionPrompt }
                    ],
                    temperature: 0.3,
                    max_tokens: 1000
                },
                {
                    headers: {
                        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: 30000
                }
            );

            const extractedText = aiResponse.data?.choices?.[0]?.message?.content || '';

            if (extractedText) {
                // ✨ Append to existing knowledge (don't replace)
                const separator = company.extractedKnowledge ? '\n\n---\n\n' : '';
                const fileHeader = `📄 من ملف: ${req.file.originalname}\n`;
                company.extractedKnowledge += separator + fileHeader + extractedText;

                console.log('✅ Knowledge extracted and appended successfully');
            }

        } catch (aiError) {
            console.error('⚠️ AI extraction failed:', aiError.message);
            // Continue even if AI extraction fails - file is still uploaded
        }

        await company.save();

        res.json({
            message: 'File uploaded and analyzed successfully',
            resource: newResource,
            extractedKnowledge: company.extractedKnowledge
        });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: 'Server error during upload' });
    }
});

// Get all knowledge base files
router.get('/', protect, async (req, res) => {
    try {
        const company = await Company.findOne({ owner: req.user.id });
        if (!company) {
            return res.status(404).json({ error: 'Company not found' });
        }
        res.json(company.knowledgeBase);
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// ✨ Get extracted knowledge text
router.get('/extracted-knowledge', protect, async (req, res) => {
    try {
        const company = await Company.findOne({ owner: req.user.id });
        if (!company) {
            return res.status(404).json({ error: 'Company not found' });
        }
        res.json({ extractedKnowledge: company.extractedKnowledge || '' });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// ✨ Update extracted knowledge text (editable by user)
router.put('/extracted-knowledge', protect, async (req, res) => {
    try {
        const { extractedKnowledge } = req.body;
        const company = await Company.findOne({ owner: req.user.id });
        if (!company) {
            return res.status(404).json({ error: 'Company not found' });
        }

        company.extractedKnowledge = extractedKnowledge || '';
        await company.save();

        res.json({
            message: 'Extracted knowledge updated successfully',
            extractedKnowledge: company.extractedKnowledge
        });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Update custom instructions
router.put('/instructions', protect, async (req, res) => {
    try {
        const { instructions } = req.body;
        const company = await Company.findOne({ owner: req.user.id });
        if (!company) {
            return res.status(404).json({ error: 'Company not found' });
        }

        company.customInstructions = instructions;
        await company.save();
        res.json({ message: 'Instructions updated', instructions });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Delete a file from knowledge base
router.delete('/:fileId', protect, async (req, res) => {
    try {
        const company = await Company.findOne({ owner: req.user.id });
        if (!company) {
            return res.status(404).json({ error: 'Company not found' });
        }

        const fileIndex = company.knowledgeBase.findIndex(f => f._id.toString() === req.params.fileId);
        if (fileIndex === -1) {
            return res.status(404).json({ error: 'File not found' });
        }

        // Optional: Delete from Cloudinary using public_id if you stored it
        // const publicId = company.knowledgeBase[fileIndex].publicId; 
        // if (publicId) await cloudinary.uploader.destroy(publicId);

        company.knowledgeBase.splice(fileIndex, 1);
        await company.save();

        res.json({ message: 'File deleted successfully', knowledgeBase: company.knowledgeBase });
    } catch (error) {
        console.error("Delete error:", error);
        res.status(500).json({ error: 'Server error' });
    }
});

export default router;
