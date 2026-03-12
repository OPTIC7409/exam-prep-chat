import { NextRequest, NextResponse } from "next/server";
import {
  PDFDocument,
  StandardFonts,
  rgb,
} from "pdf-lib";
import { normalizeMathForExport } from "@/lib/math-export";

const MARGIN = 50;
const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const CONTENT_WIDTH = PAGE_WIDTH - 2 * MARGIN;
const LINE_HEIGHT = 14;
const PARAGRAPH_GAP = 8;
const HEADING1_SIZE = 20;
const HEADING2_SIZE = 16;
const HEADING3_SIZE = 14;
const BODY_SIZE = 11;

/** Simple markdown to plain text - keeps structure for headings */
function mdToLines(content: string): { text: string; size: number }[] {
  const lines: { text: string; size: number }[] = [];
  const blocks = content.split(/\n\n+/);

  for (const block of blocks) {
    const trimmed = block.trim();
    if (!trimmed) continue;

    // Strip inline markdown (**bold**, *italic*, `code`)
    const stripInline = (s: string) =>
      s.replace(/\*\*(.+?)\*\*/g, "$1").replace(/\*(.+?)\*/g, "$1").replace(/`(.+?)`/g, "$1");

    if (trimmed.startsWith("# ")) {
      lines.push({ text: stripInline(trimmed.slice(2)), size: HEADING1_SIZE });
    } else if (trimmed.startsWith("## ")) {
      lines.push({ text: stripInline(trimmed.slice(3)), size: HEADING2_SIZE });
    } else if (trimmed.startsWith("### ")) {
      lines.push({ text: stripInline(trimmed.slice(4)), size: HEADING3_SIZE });
    } else if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      const items = trimmed.split(/\n(?=[-*]\s)/).map((line) =>
        stripInline(line.replace(/^[-*]\s*/, "• "))
      );
      for (const item of items) {
        lines.push({ text: item, size: BODY_SIZE });
      }
    } else if (/^\d+\.\s/.test(trimmed)) {
      const numRegex = /^\d+\.\s*/;
      const items = trimmed.split(/\n(?=\d+\.\s)/).map((line) =>
        stripInline(line.replace(numRegex, ""))
      );
      for (const item of items) {
        lines.push({ text: item, size: BODY_SIZE });
      }
    } else {
      lines.push({ text: stripInline(trimmed), size: BODY_SIZE });
    }
  }
  return lines;
}

/** Word-wrap text to fit width (approx chars per line from font size) */
function wrapText(text: string, fontSize: number): string[] {
  const approxCharsPerLine = Math.floor(CONTENT_WIDTH / (fontSize * 0.6));
  const words = text.split(/\s+/);
  const result: string[] = [];
  let current = "";

  for (const word of words) {
    if (current.length + word.length + 1 <= approxCharsPerLine) {
      current = current ? `${current} ${word}` : word;
    } else {
      if (current) result.push(current);
      current = word;
    }
  }
  if (current) result.push(current);
  return result;
}

export async function POST(req: NextRequest) {
  try {
    const { content, filename = "study-guide" } = await req.json();

    if (!content || typeof content !== "string") {
      return NextResponse.json(
        { error: "Content is required and must be a string" },
        { status: 400 }
      );
    }

    const preparedContent = normalizeMathForExport(content);
    const pdfDoc = await PDFDocument.create();
    const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    let page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    let y = PAGE_HEIGHT - MARGIN;

    const blocks = mdToLines(preparedContent);

    for (const { text, size } of blocks) {
      const wrapped = wrapText(text, size);
      const lineHeight = size * 1.3;
      const isHeading = size > BODY_SIZE;

      for (const line of wrapped) {
        if (y < MARGIN + lineHeight) {
          page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
          y = PAGE_HEIGHT - MARGIN;
        }

        page.drawText(line, {
          x: MARGIN,
          y,
          size,
          font: isHeading ? helveticaBold : helvetica,
          color: rgb(0.1, 0.1, 0.1),
        });
        y -= lineHeight;
      }
      y -= PARAGRAPH_GAP;
    }

    const pdfBytes = await pdfDoc.save();
    const buffer = Buffer.from(pdfBytes);

    const safeFilename = filename.replace(/[^a-zA-Z0-9-_]/g, "_");
    const downloadName = safeFilename.endsWith(".pdf")
      ? safeFilename
      : `${safeFilename}.pdf`;

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${downloadName}"`,
        "Content-Length": buffer.length.toString(),
      },
    });
  } catch (error) {
    console.error("PDF export error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `PDF export failed: ${message}` },
      { status: 500 }
    );
  }
}
