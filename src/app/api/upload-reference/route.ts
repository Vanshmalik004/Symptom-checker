import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/jwt";
import { extractText } from "@/lib/ocr";
import fs from "fs";
import path from "path";
import { SearchableDoc } from "@/lib/vector_db";

export async function POST(request: Request) {
  try {
    // 1. Authenticate user
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    // 2. Parse form data
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 3. Extract text
    const extractedText = await extractText(buffer, file.type || file.name);
    if (!extractedText || !extractedText.trim()) {
      return NextResponse.json({ error: "No readable text content found in document" }, { status: 400 });
    }

    // 4. Chunk text into pieces (~800-1000 characters)
    const paragraphs = extractedText.split(/\n\s*\n/);
    const chunks: string[] = [];
    let currentChunk = "";

    for (const para of paragraphs) {
      const cleanPara = para.trim();
      if (!cleanPara) continue;

      if (currentChunk.length + cleanPara.length > 800) {
        if (currentChunk) chunks.push(currentChunk.trim());
        currentChunk = cleanPara;
      } else {
        currentChunk = currentChunk ? `${currentChunk}\n\n${cleanPara}` : cleanPara;
      }
    }
    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }

    // 5. Load existing custom_kb
    const kbPath = path.join(process.cwd(), "src/lib/custom_kb.json");
    let customKb: SearchableDoc[] = [];
    if (fs.existsSync(kbPath)) {
      try {
        const raw = fs.readFileSync(kbPath, "utf-8");
        customKb = JSON.parse(raw);
      } catch (e) {
        console.error("Failed to parse custom_kb.json, resetting:", e);
        customKb = [];
      }
    }

    // 6. Map chunks to SearchableDoc objects and append
    const timestamp = new Date().toISOString();
    const newDocs: SearchableDoc[] = chunks.map((chunk, idx) => ({
      id: `${file.name.replace(/\s+/g, "_")}_${Date.now()}_${idx}`,
      title: `${file.name} (Part ${idx + 1})`,
      text: chunk,
      source: "Uploaded Reference Guideline",
      metadata: {
        fileName: file.name,
        uploadedAt: timestamp,
        userId: decoded.userId
      }
    }));

    customKb.push(...newDocs);
    fs.writeFileSync(kbPath, JSON.stringify(customKb, null, 2), "utf-8");

    return NextResponse.json({
      success: true,
      message: `Successfully indexed ${newDocs.length} knowledge chunks from ${file.name} into the local vector database.`,
      chunksIndexed: newDocs.length,
      fileName: file.name
    });
  } catch (error: any) {
    console.error("Reference upload error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process reference document" },
      { status: 500 }
    );
  }
}
