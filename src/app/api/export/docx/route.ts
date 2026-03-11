import { NextRequest, NextResponse } from "next/server";
import { convertMarkdownToDocx } from "@mohtasham/md-to-docx";

export async function POST(req: NextRequest) {
  try {
    const { content, filename = "study-guide" } = await req.json();

    if (!content || typeof content !== "string") {
      return NextResponse.json(
        { error: "Content is required and must be a string" },
        { status: 400 }
      );
    }

    const blob = await convertMarkdownToDocx(content);
    const arrayBuffer = await blob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const safeFilename = filename.replace(/[^a-zA-Z0-9-_]/g, "_");
    const downloadName = safeFilename.endsWith(".docx")
      ? safeFilename
      : `${safeFilename}.docx`;

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${downloadName}"`,
        "Content-Length": buffer.length.toString(),
      },
    });
  } catch (error) {
    console.error("DOCX export error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Word export failed: ${message}` },
      { status: 500 }
    );
  }
}
