declare module "pdf-parse/lib/pdf-parse.js" {
  type PdfParseResult = {
    text?: string;
  };

  type PdfParseFn = (
    dataBuffer: Buffer,
    options?: Record<string, unknown>
  ) => Promise<PdfParseResult>;

  const pdfParse: PdfParseFn;
  export default pdfParse;
}
