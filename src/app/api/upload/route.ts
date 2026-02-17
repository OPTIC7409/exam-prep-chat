import { NextRequest, NextResponse } from "next/server";
import { getTextExtractor } from "office-text-extractor";

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
const ALLOWED_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation", // pptx
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // docx
  "text/plain",
];

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

    const isTxt =
      file.type === "text/plain" || file.name.toLowerCase().endsWith(".txt");
    if (!ALLOWED_TYPES.includes(file.type) && !isTxt) {
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
