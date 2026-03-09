"use client";

import { useRef, useState } from "react";

type TabletSignaturePadProps = {
  onAccept: (dataUrl: string) => void;
};

export default function TabletSignaturePad({ onAccept }: TabletSignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [drawing, setDrawing] = useState(false);

  function draw(event: React.MouseEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas || !drawing) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#0f172a";
    ctx.lineTo(event.nativeEvent.offsetX, event.nativeEvent.offsetY);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(event.nativeEvent.offsetX, event.nativeEvent.offsetY);
  }

  function startDrawing(event: React.MouseEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    setDrawing(true);
    ctx.beginPath();
    ctx.moveTo(event.nativeEvent.offsetX, event.nativeEvent.offsetY);
  }

  function stopDrawing() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    setDrawing(false);
    ctx.beginPath();
  }

  function clearPad() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  function acceptSignature() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    onAccept(canvas.toDataURL("image/png"));
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="text-base font-semibold text-slate-900">Tablet Signature</h3>
      <canvas
        ref={canvasRef}
        width={560}
        height={180}
        className="mt-3 w-full rounded-lg border border-slate-300 bg-white"
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
      />
      <div className="mt-3 flex gap-2">
        <button type="button" onClick={clearPad} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm">Clear</button>
        <button type="button" onClick={acceptSignature} className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm text-white">Accept</button>
      </div>
    </section>
  );
}
