export function normalizeMathDelimiters(input: string): string {
  return input
    .replace(/\\\[((?:.|\n)*?)\\\]/g, (_, expr: string) => `$$${expr.trim()}$$`)
    .replace(/\\\(((?:.|\n)*?)\\\)/g, (_, expr: string) => `$${expr.trim()}$`);
}

export function normalizeMathForExport(input: string): string {
  return normalizeMathDelimiters(input);
}
