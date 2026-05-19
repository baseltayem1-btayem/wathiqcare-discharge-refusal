import { escapeHtml } from "@/lib/pdf-engine/core/pdf-layout";

export interface WatermarkProps {
  label: string;
}

export function renderPdfWatermark(props: WatermarkProps): string {
  return `<div class="wc-pdf-watermark">${escapeHtml(props.label)}</div>`;
}