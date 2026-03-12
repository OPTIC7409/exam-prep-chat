import katex from "katex";
import { normalizeMathDelimiters } from "@/lib/math";

function stripTags(html: string): string {
  return html.replace(/<[^>]*>/g, "");
}

function decodeEntities(input: string): string {
  return input
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function renderMathToText(expression: string, displayMode: boolean): string {
  try {
    const mathMl = katex.renderToString(expression, {
      throwOnError: false,
      displayMode,
      output: "mathml",
    });
    const plain = decodeEntities(stripTags(mathMl)).replace(/\s+/g, " ").trim();
    return plain || expression;
  } catch {
    return expression;
  }
}

export function normalizeMathForExport(input: string): string {
  const normalized = normalizeMathDelimiters(input);

  return normalized
    .replace(/\$\$([\s\S]+?)\$\$/g, (_match, expr: string) => {
      const text = renderMathToText(expr.trim(), true);
      return `\n[ ${text} ]\n`;
    })
    .replace(/\$([^\n$]+?)\$/g, (_match, expr: string) => {
      const text = renderMathToText(expr.trim(), false);
      return text;
    });
}
