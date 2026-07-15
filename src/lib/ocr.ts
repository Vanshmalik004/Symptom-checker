import { createRequire } from "module";
import { createWorker } from "tesseract.js";

const require = createRequire(import.meta.url);

// Polyfill DOM classes for pdf-parse in Node environment
if (typeof globalThis.DOMMatrix === "undefined") {
  (globalThis as any).DOMMatrix = class DOMMatrix {};
}
if (typeof globalThis.ImageData === "undefined") {
  (globalThis as any).ImageData = class ImageData {};
}
if (typeof globalThis.Path2D === "undefined") {
  (globalThis as any).Path2D = class Path2D {};
}

// Preload PDF.js worker message handler to prevent dynamic worker imports in Next.js
if (typeof (globalThis as any).pdfjsWorker === "undefined") {
  (globalThis as any).pdfjsWorker = require("pdfjs-dist/legacy/build/pdf.worker.min.mjs");
}

/**
 * Extracts text from a PDF buffer
 */
export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  try {
    const pdfModule = require("pdf-parse");
    
    // Handle newer class-based API
    if (pdfModule && pdfModule.PDFParse) {
      const instance = new pdfModule.PDFParse({ data: buffer });
      const result = await instance.getText();
      return result.text || "";
    }
    
    // Fallback to older function-based API
    const pdf = typeof pdfModule === "function" ? pdfModule : pdfModule.default;
    if (typeof pdf !== "function") {
      throw new Error("Resolved pdf-parse module is not a function");
    }
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
