import { createRequire } from "module";
import { createWorker } from "tesseract.js";

const require = createRequire(import.meta.url);

/**
 * Extracts text from a PDF buffer
 */
export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  try {
    const pdf = require("pdf-parse");
    const result = await pdf(buffer);
    return result.text || "";
  } catch (error) {
    console.error("PDF text extraction error:", error);
    throw new Error("Failed to extract text from PDF file");
  }
}

/**
 * Extracts text from an Image buffer using Tesseract.js server-side
 */
export async function extractTextFromImage(buffer: Buffer): Promise<string> {
  try {
    const worker = await createWorker("eng");
    // Recognize text in the image buffer
    const ret = await worker.recognize(buffer);
    await worker.terminate();
    return ret.data.text || "";
  } catch (error) {
    console.error("Image OCR extraction error:", error);
    throw new Error("Failed to extract text from image file using OCR");
  }
}

/**
 * Automatically detects file type and extracts text
 */
export async function extractText(buffer: Buffer, fileType: string): Promise<string> {
  const normalizedType = fileType.toLowerCase();
  
  if (normalizedType.includes("pdf")) {
    return extractTextFromPDF(buffer);
  } else if (
    normalizedType.includes("image") ||
    normalizedType.includes("png") ||
    normalizedType.includes("jpg") ||
    normalizedType.includes("jpeg") ||
    normalizedType.includes("webp")
  ) {
    return extractTextFromImage(buffer);
  } else {
    throw new Error(`Unsupported file type: ${fileType}`);
  }
}
