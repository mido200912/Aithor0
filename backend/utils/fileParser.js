import { PDFParse } from 'pdf-parse';
import mammoth from 'mammoth';

/**
 * Extracts raw text from various file buffers
 * @param {Buffer} buffer - The file buffer
 * @param {string} fileType - The file extension (pdf, docx, txt)
 * @returns {Promise<string>} - The extracted text
 */
export async function extractTextFromFile(buffer, fileType) {
    try {
        const type = fileType.toLowerCase();
        
        if (type === 'txt') {
            return buffer.toString('utf-8');
        } 
        
        if (type === 'pdf') {
            const parser = new PDFParse({ data: buffer });
            const data = await parser.getText();
            await parser.destroy(); // Important to cleanup
            return data.text;
        } 
        
        if (type === 'docx' || type === 'doc') {
            // Mammoth primary handles .docx
            const data = await mammoth.extractRawText({ buffer });
            return data.value;
        }
        
        return '';
    } catch (error) {
        console.error('Text extraction error:', error);
        return '';
    }
}
