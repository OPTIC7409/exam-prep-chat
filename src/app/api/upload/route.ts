import { NextRequest, NextResponse } from "next/server";
import { getTextExtractor } from "office-text-extractor";

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
const ALLOWED_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation", // pptx
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // docx
  "text/plain",
];

async function extractPdfText(buffer: Uint8Array): Promise<string> {
  // Use the internal Node parser entry; it sets PDFJS.disableWorker = true.
  const { default: pdfParse } = await import("pdf-parse/lib/pdf-parse.js");
  const result = await pdfParse(Buffer.from(buffer));
  return result.text ?? "";
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    const lowerName = file.name.toLowerCase();
    const isTxt = file.type === "text/plain" || lowerName.endsWith(".txt");
    const isPdf = file.type === "application/pdf" || lowerName.endsWith(".pdf");
    const isDocx =
      file.type ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      lowerName.endsWith(".docx");
    const isPptx =
      file.type ===
        "application/vnd.openxmlformats-officedocument.presentationml.presentation" ||
      lowerName.endsWith(".pptx");

    // Some browsers/storage providers send empty or generic MIME types.
    // Fall back to extension checks so valid files are still processed.
    if (!ALLOWED_TYPES.includes(file.type) && !isTxt && !isPdf && !isDocx && !isPptx) {
      return NextResponse.json(
        {
          error:
            "Unsupported file type. Please upload PDF, PPTX, DOCX, or TXT files.",
        },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 20MB." },
        { status: 400 }
      );
    }

    const buffer = new Uint8Array(await file.arrayBuffer());
    let extractedText = "";

    if (isTxt) {
      extractedText = new TextDecoder().decode(buffer);
    } else if (isPdf) {
      extractedText = await extractPdfText(buffer);
    } else {
      const extractor = getTextExtractor();
      extractedText = await extractor.extractText({
        input: buffer,
        type: "buffer",
      });
    }

    if (!extractedText.trim()) {
      return NextResponse.json(
        {
          error:
            "Could not extract text from this file. It may be empty or scanned.",
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      filename: file.name,
      text: extractedText,
      charCount: extractedText.length,
    });
  } catch (error) {
    console.error("Upload error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Upload failed: ${message}` },
      { status: 500 }
    );
  }
}
