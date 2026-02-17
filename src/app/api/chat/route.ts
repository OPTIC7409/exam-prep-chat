import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const SYSTEM_PROMPT = `You are a helpful study assistant. Your role is to help students understand their course material, answer questions about their lectures and notes, and summarize key points for exam preparation.

When the user provides document content (lecture slides, tutorial notes, etc.), use that material as your primary source to answer their questions. Be accurate and cite specific parts of the material when relevant.

When asked to summarize key points for tests, create clear, organized summaries that highlight:
- Main concepts and definitions
- Important formulas or equations (if applicable)
- Key takeaways from each section
- Potential exam-style questions or topics to review

Be concise but thorough. Always format your responses using Markdown: use **bold** for emphasis, ## headings for sections, bullet points for lists, and \`code\` for technical terms or formulas.`;

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY is not configured. Add it to .env.local" },
        { status: 500 }
      );
    }

    const openai = new OpenAI({ apiKey });

    const { messages, documentContext } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: "Messages array is required" },
        { status: 400 }
      );
    }

    const systemContent = documentContext
      ? `${SYSTEM_PROMPT}\n\n---\n**Uploaded study material for context:**\n\n${documentContext}\n\n---\nUse the above material to answer the user's questions.`
      : SYSTEM_PROMPT;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemContent },
        ...messages,
      ],
    });

    const assistantMessage = completion.choices[0]?.message?.content;

    if (!assistantMessage) {
      return NextResponse.json(
        { error: "No response from OpenAI" },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: assistantMessage });
  } catch (error) {
    console.error("Chat API error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Chat failed: ${message}` },
      { status: 500 }
    );
  }
}
