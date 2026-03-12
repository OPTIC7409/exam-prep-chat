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

const MAX_HISTORY_MESSAGES = 12;
const MAX_HISTORY_CHARS = 12000;
const MAX_CONTEXT_CHARS = 70000;
const STOP_WORDS = new Set([
  "the",
  "a",
  "an",
  "and",
  "or",
  "to",
  "for",
  "of",
  "in",
  "on",
  "with",
  "is",
  "are",
  "was",
  "were",
  "be",
  "this",
  "that",
  "these",
  "those",
  "it",
  "as",
  "at",
  "by",
  "from",
  "about",
  "into",
  "than",
  "then",
  "you",
  "your",
  "me",
  "my",
  "we",
  "our",
  "can",
  "could",
  "should",
  "would",
  "please",
]);

type ChatMessage = { role: "user" | "assistant"; content: string };
type Section = { title: string; content: string };

function extractKeywords(text: string): string[] {
  return Array.from(
    new Set(
      text
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .filter((w) => w.length > 2 && !STOP_WORDS.has(w))
    )
  );
}

function splitSections(documentContext: string): Section[] {
  const matches = Array.from(
    documentContext.matchAll(/\*\*(.+?)\*\*\n\n([\s\S]*?)(?=\n\n---\n\n\*\*|$)/g)
  );
  if (!matches.length) return [{ title: "Uploaded notes", content: documentContext }];
  return matches.map((m) => ({
    title: m[1].trim(),
    content: m[2].trim(),
  }));
}

function scoreSection(section: Section, keywords: string[]): number {
  if (!keywords.length) return 0;
  const haystack = `${section.title}\n${section.content}`.toLowerCase();
  let score = 0;
  for (const keyword of keywords) {
    if (haystack.includes(keyword)) score += 1;
  }
  return score;
}

function buildContextSnippet(documentContext: string, query: string): string {
  const sections = splitSections(documentContext);
  const keywords = extractKeywords(query);
  const ranked = sections
    .map((section) => ({ section, score: scoreSection(section, keywords) }))
    .sort((a, b) => b.score - a.score);

  const selected: string[] = [];
  let used = 0;

  for (const item of ranked) {
    if (used >= MAX_CONTEXT_CHARS) break;
    const budget = Math.min(12000, MAX_CONTEXT_CHARS - used);
    if (budget <= 0) break;
    const snippet = item.section.content.slice(0, budget);
    if (!snippet.trim()) continue;
    const block = `**${item.section.title}**\n\n${snippet}`;
    selected.push(block);
    used += block.length + 8;
  }

  // Fallback for unusual formats
  if (!selected.length) {
    return documentContext.slice(0, MAX_CONTEXT_CHARS);
  }

  return selected.join("\n\n---\n\n");
}

function trimMessages(input: ChatMessage[]): ChatMessage[] {
  const tail = input.slice(-MAX_HISTORY_MESSAGES);
  const out: ChatMessage[] = [];
  let used = 0;

  // Keep newest messages first, then restore order.
  for (let i = tail.length - 1; i >= 0; i--) {
    const msg = tail[i];
    const clipped = msg.content.length > 2000 ? `${msg.content.slice(0, 2000)}…` : msg.content;
    const cost = clipped.length;
    if (used + cost > MAX_HISTORY_CHARS) break;
    out.push({ role: msg.role, content: clipped });
    used += cost;
  }

  return out.reverse();
}

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

    const typedMessages = messages as ChatMessage[];
    const trimmedMessages = trimMessages(typedMessages);
    const latestUserMessage =
      [...trimmedMessages].reverse().find((m) => m.role === "user")?.content ?? "";

    const contextSnippet =
      typeof documentContext === "string" && documentContext.trim()
        ? buildContextSnippet(documentContext, latestUserMessage)
        : "";

    const systemContent = contextSnippet
      ? `${SYSTEM_PROMPT}\n\n---\n**Uploaded study material (selected excerpts):**\n\n${contextSnippet}\n\n---\nUse these excerpts first. If details are missing, say what specific section to upload or ask for.`
      : SYSTEM_PROMPT;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemContent },
        ...trimmedMessages,
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
