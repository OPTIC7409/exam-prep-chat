"use client";

import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";

type Message = {
  role: "user" | "assistant";
  content: string;
};

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [documentContext, setDocumentContext] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;

    setIsUploading(true);
    setUploadError("");

    const fileArray = Array.from(files);
    const results = await Promise.allSettled(
      fileArray.map(async (file) => {
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch("/api/upload", { method: "POST", body: formData });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Upload failed");
        return { filename: data.filename, text: data.text };
      })
    );

    const succeeded: { filename: string; text: string }[] = [];
    const failed: string[] = [];

    results.forEach((result, i) => {
      if (result.status === "fulfilled") {
        succeeded.push(result.value);
      } else {
        failed.push(fileArray[i].name);
      }
    });

    if (succeeded.length > 0) {
      const newContext = succeeded
        .map(({ filename, text }) => `**${filename}**\n\n${text}`)
        .join("\n\n---\n\n");
      setDocumentContext((prev) =>
        prev ? `${prev}\n\n---\n\n${newContext}` : newContext
      );
      setUploadedFiles((prev) => [
        ...prev,
        ...succeeded.map((s) => s.filename),
      ]);
    }

    if (failed.length > 0) {
      setUploadError(
        `Failed to upload: ${failed.join(", ")}`
      );
    }

    setIsUploading(false);
    e.target.value = "";
  };

  const clearDocuments = () => {
    setDocumentContext("");
    setUploadedFiles([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, { role: "user", content: userMessage }].map(
            (m) => ({ role: m.role, content: m.content })
          ),
          documentContext: documentContext || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to get response");
      }

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.message },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `Error: ${err instanceof Error ? err.message : "Something went wrong"}`,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const quickPrompts = [
    "Summarise the key points for this material",
    "What are the main concepts I should know for the exam?",
    "Create a study guide from this content",
    "Explain the most important ideas in simple terms",
  ];

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900/50 px-4 py-3">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <h1 className="text-lg font-semibold tracking-tight">
            Exam Prep Chat
          </h1>
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.pptx,.docx,.txt"
              multiple
              onChange={handleUpload}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-1.5 text-sm font-medium text-slate-200 transition hover:border-slate-500 hover:bg-slate-700 disabled:opacity-50"
            >
              {isUploading ? "Uploading…" : "Upload notes (multiple)"}
            </button>
            {uploadedFiles.length > 0 && (
              <button
                type="button"
                onClick={clearDocuments}
                className="rounded-lg px-3 py-1.5 text-sm text-slate-400 transition hover:text-slate-200"
              >
                Clear
              </button>
            )}
          </div>
        </div>
        {uploadError && (
          <p className="mx-auto mt-2 max-w-3xl text-sm text-rose-400">
            {uploadError}
          </p>
        )}
        {uploadedFiles.length > 0 && (
          <p className="mx-auto mt-2 max-w-3xl text-sm text-emerald-400">
            Loaded: {uploadedFiles.join(", ")}
          </p>
        )}
      </header>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-6">
        {messages.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
            <p className="max-w-md text-slate-400">
              Upload lecture slides, tutorial notes, or PDFs, then ask questions
              or request summaries for exam prep.
            </p>
            {documentContext ? (
              <div className="flex flex-wrap justify-center gap-2">
                {quickPrompts.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => setInput(prompt)}
                    className="rounded-lg border border-slate-600 bg-slate-800/50 px-4 py-2 text-sm text-slate-300 transition hover:border-slate-500 hover:bg-slate-800"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">
                Upload a document to get started
              </p>
            )}
          </div>
        ) : (
          <div className="flex flex-1 flex-col gap-4 overflow-y-auto pb-4">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${
                  msg.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${
                    msg.role === "user"
                      ? "bg-emerald-600/80 text-white"
                      : "bg-slate-800 text-slate-200"
                  }`}
                >
                  {msg.role === "assistant" ? (
                    <div className="markdown-body text-sm leading-relaxed [&_h1]:text-base [&_h1]:font-bold [&_h1]:mt-3 [&_h1]:mb-1 [&_h2]:text-sm [&_h2]:font-bold [&_h2]:mt-3 [&_h2]:mb-1 [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:mt-2 [&_h3]:mb-1 [&_p]:my-1 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-0.5 [&_code]:bg-slate-700/50 [&_code]:text-emerald-300 [&_code]:px-1 [&_code]:rounded [&_code]:text-xs [&_pre]:my-2 [&_pre]:overflow-x-auto [&_pre]:rounded [&_pre]:bg-slate-900/80 [&_pre]:p-3 [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_strong]:font-semibold [&_blockquote]:border-l-2 [&_blockquote]:border-slate-600 [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:text-slate-300">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap text-sm leading-relaxed">
                      {msg.content}
                    </p>
                  )}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="rounded-2xl bg-slate-800 px-4 py-2.5">
                  <span className="animate-pulse text-sm text-slate-400">
                    Thinking…
                  </span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4">
          <div className="flex gap-2 rounded-xl border border-slate-700 bg-slate-900/50 p-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about your notes or request a summary…"
              className="flex-1 bg-transparent px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 outline-none"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-500 disabled:opacity-50 disabled:hover:bg-emerald-600"
            >
              Send
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
