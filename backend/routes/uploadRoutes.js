import express from 'express';
import multer from 'multer';
import Company from '../models/company.js';
import { requireAuth as protect } from '../middleware/auth.js';
import { fetchAiResponse } from '../utils/corexHelper.js';
import { extractTextFromFile } from '../utils/fileParser.js';

const router = express.Router();

// 🚀 Configure Multer for Memory Storage with Security Filters
const storage = multer.memoryStorage();

const allowedExtensions = ['.pdf', '.docx', '.txt', '.doc'];
const allowedMimeTypes = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'text/plain'
];

const upload = multer({ 
    storage: storage,
    limits: { 
        fileSize: 10 * 1024 * 1024, // 10MB limit
        files: 1 // Only 1 file per request
    },
    fileFilter: (req, file, cb) => {
        const fileExt = file.originalname.toLowerCase().substring(file.originalname.lastIndexOf('.'));
        const isValidExt = allowedExtensions.includes(fileExt);
        const isValidMime = allowedMimeTypes.includes(file.mimetype);

        if (isValidExt && isValidMime) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only PDF, DOCX, and TXT are allowed.'), false);
        }
    }
});

// Upload a file to knowledge base and extract text using AI
router.post('/upload', protect, (req, res, next) => {
    upload.single('file')(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            // A Multer error occurred when uploading.
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({ error: 'File size too large. Max 10MB.' });
            }
            return res.status(400).json({ error: err.message });
        } else if (err) {
            // An unknown error occurred when uploading.
            return res.status(400).json({ error: err.message });
        }
        // Everything went fine.
        next();
    });
}, async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        // Find the user's company
        const company = await Company.findOne({ owner: req.user.id });
        if (!company) {
            return res.status(404).json({ error: 'Company not found' });
        }

        // Ensure knowledgeBase exists
        if (!company.knowledgeBase) {
            company.knowledgeBase = [];
        }

        const fileType = req.file.originalname.split('.').pop().toLowerCase();
        
        // 📄 Extract ACTUAL text from the buffer
        console.log('📄 Extracting real text from:', req.file.originalname);
        const actualFileContent = await extractTextFromFile(req.file.buffer, fileType);

        const newResource = {
            _id: Date.now().toString(), // Quick unique ID for local tracking
            fileName: req.file.originalname,
            fileUrl: '', // No external hosting to save money
            fileType: fileType,
            uploadedAt: new Date()
        };

        company.knowledgeBase.push(newResource);

        // ✨ Extract knowledge from the ACTUAL content using AI
        try {
            console.log('🤖 Sending extracted text to AI for analysis...');

            const contentSnippet = actualFileContent.length > 5000 
                ? actualFileContent.substring(0, 5000) + "... [truncated]" 
                : actualFileContent;

            const extractionPrompt = `أنت مساعد ذكي متخصص في تحليل الملفات واستخراج المعلومات المهمة.
            
لقد تم رفع ملف باسم: ${req.file.originalname}
محتوى الملف المستخرج:
---
${contentSnippet || "لم يتم العثور على نص قابل للقراءة في الملف."}
---

مهتمك هي:
1. استخراج جميع المعلومات المهمة من هذا المحتوى
2. تنظيم المعلومات بشكل واضح واحترافي
3. التركيز بشكل خاص على:
   - تفاصيل المنتجات والخدمات
   - قوائم الأسعار والعروض
   - سياسات العمل والتعامل
   - معلومات الاتصال والعناوين
   - أي تفاصيل يطلبها العملاء عادةً

الرد يجب أن يكون نصاً منظماً وجاهزاً للاستخدام مباشرة في نظام دعم العملاء الآلي الخاص بالشركة.`;

            // استخدام الدالة الموحدة المدمج بها Fallback
            const extractedText = await fetchAiResponse(extractionPrompt, '');

            if (extractedText) {
                // ✨ Append to existing knowledge (don't replace)
                if (!company.extractedKnowledge) {
                    company.extractedKnowledge = "";
                }
                const separator = company.extractedKnowledge ? '\n\n---\n\n' : '';
                const fileHeader = `📄 من ملف: ${req.file.originalname}\n`;
                company.extractedKnowledge += separator + fileHeader + extractedText;

                console.log('✅ AI analysis completed and appended successfully');
            }

        } catch (aiError) {
            console.error('⚠️ AI extraction failed:', aiError.message);
            // Continue even if AI extraction fails - metadata is still saved
        }

        await company.save();

        res.json({
            message: 'File analyzed and knowledge updated successfully',
            resource: newResource,
            extractedKnowledge: company.extractedKnowledge
        });
    } catch (error) {
        console.error('Upload route error:', error);
        res.status(500).json({ 
            error: 'Server error during upload',
            message: error.message
        });
    }
});

// Get all knowledge base files
router.get('/', protect, async (req, res) => {
    try {
        const company = await Company.findOne({ owner: req.user.id });
        if (!company) {
            return res.status(404).json({ error: 'Company not found' });
        }
        
        // Ensure every file has an ID for the frontend keys
        const knowledgeBase = (company.knowledgeBase || []).map((file, index) => ({
            ...file,
            _id: file._id || file.id || `temp-${index}`
        }));
        
        res.json(knowledgeBase);
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

        if (!company.knowledgeBase) {
            return res.status(404).json({ error: 'No files found in knowledge base' });
        }

        const fileIndex = company.knowledgeBase.findIndex((f, index) => 
            (f._id && f._id.toString() === req.params.fileId) || 
            (f.id && f.id.toString() === req.params.fileId) ||
            (`temp-${index}` === req.params.fileId)
        );
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
