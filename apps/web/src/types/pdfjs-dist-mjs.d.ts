declare module "pdfjs-dist/build/pdf.mjs" {
  // Minimal type shim for the ESM pdfjs-dist build used by the approved-PDF viewer.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdfjsLib: any;
  export = pdfjsLib;
}
