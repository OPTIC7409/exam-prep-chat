import { normalizeMathDelimiters } from "@/lib/math";

function latexToReadable(input: string): string {
  let out = input.trim();

  // Basic structural operators first.
  for (let i = 0; i < 6; i += 1) {
    const next = out.replace(
      /\\frac\s*\{([^{}]+)\}\s*\{([^{}]+)\}/g,
      "($1)/($2)"
    );
    if (next === out) break;
    out = next;
  }

  const symbolMap: Record<string, string> = {
    "\\cdot": "*",
    "\\times": "*",
    "\\div": "/",
    "\\pm": "+/-",
    "\\mp": "-/+",
    "\\leq": "<=",
    "\\geq": ">=",
    "\\neq": "!=",
    "\\approx": "~",
    "\\infty": "infinity",
    "\\rightarrow": "->",
    "\\Rightarrow": "=>",
    "\\leftrightarrow": "<->",
    "\\Leftrightarrow": "<=>",
    "\\land": "and",
    "\\lor": "or",
    "\\neg": "not",
  };

  Object.entries(symbolMap).forEach(([k, v]) => {
    out = out.replace(new RegExp(k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"), v);
  });

  // Keep common functions but drop backslash.
  out = out.replace(
    /\\(log|ln|sin|cos|tan|cot|sec|csc|sqrt|max|min|sum|prod)\b/g,
    "$1"
  );

  // Remove layout commands that are not meaningful in plain text.
  out = out.replace(/\\(left|right|,|!|;|quad|qquad)\b/g, "");

  // Convert grouped subscripts/superscripts before removing braces.
  out = out
    .replace(/_\{([^{}]+)\}/g, "_($1)")
    .replace(/\^\{([^{}]+)\}/g, "^($1)")
    .replace(/_([A-Za-z0-9])/g, "_($1)")
    .replace(/\^([A-Za-z0-9])/g, "^($1)");

  // Final cleanup.
  out = out
    .replace(/[{}]/g, "")
    .replace(/\\+/g, "")
    .replace(/\s+/g, " ")
    .trim();

  return out || input.trim();
}

export function normalizeMathForExport(input: string): string {
  const normalized = normalizeMathDelimiters(input);

  return normalized
    .replace(/\$\$([\s\S]+?)\$\$/g, (_match, expr: string) => {
      const text = latexToReadable(expr);
      return `\n[[ ${text} ]]\n`;
    })
    .replace(/\$([^\n$]+?)\$/g, (_match, expr: string) => {
      return latexToReadable(expr);
    });
}
