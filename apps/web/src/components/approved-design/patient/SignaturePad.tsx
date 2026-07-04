"use client";

import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { cls } from "../shared";
import type { Lang } from "./types";

export type SignaturePadHandle = {
  isEmpty(): boolean;
  clear(): void;
  toDataUrl(): string | null;
};

type SignaturePadProps = {
  lang: Lang;
  onChange?: (hasInk: boolean) => void;
  padRef: React.MutableRefObject<SignaturePadHandle | null>;
};

export function SignaturePad({ lang, onChange, padRef }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);
  const lastRef = useRef<{ x: number; y: number } | null>(null);
  const [hasInk, setHasInk] = useState(false);

  const resize = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ratio = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * ratio;
    canvas.height = rect.height * ratio;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(ratio, ratio);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = "#1B4F8A";
  }, []);

  useEffect(() => {
    resize();
    const onResize = () => resize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [resize]);

  const pointFrom = (e: PointerEvent | React.PointerEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX ?? 0) - rect.left,
      y: (e.clientY ?? 0) - rect.top,
    };
  };

  const start = (e: React.PointerEvent) => {
    e.preventDefault();
    (e.target as Element).setPointerCapture?.(e.pointerId);
    drawingRef.current = true;
    lastRef.current = pointFrom(e);
  };

  const move = (e: React.PointerEvent) => {
    if (!drawingRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const p = pointFrom(e);
    const last = lastRef.current || p;
    ctx.beginPath();
    ctx.moveTo(last.x, last.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    lastRef.current = p;
    if (!hasInk) {
      setHasInk(true);
      onChange?.(true);
    }
  };

  const end = () => {
    drawingRef.current = false;
    lastRef.current = null;
  };

  useImperativeHandle(padRef, () => ({
    isEmpty: () => !hasInk,
    clear: () => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (!canvas || !ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      setHasInk(false);
      onChange?.(false);
    },
    toDataUrl: () => {
      const canvas = canvasRef.current;
      if (!canvas || !hasInk) return null;
      return canvas.toDataURL("image/png");
    },
  }));

  return (
    <div
      className={cls(
        "relative rounded-xl border-2 bg-white overflow-hidden touch-none select-none",
        hasInk ? "border-primary" : "border-dashed border-border",
      )}
      style={{ height: 180 }}
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full cursor-crosshair"
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={end}
        onPointerCancel={end}
        onPointerLeave={end}
      />
      {!hasInk ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 pointer-events-none">
          <div className="w-8 h-0.5 bg-muted-foreground/30 rounded" />
          <p className="text-xs text-muted-foreground">
            {lang === "ar" ? "ارسم توقيعك هنا" : "Draw your signature here"}
          </p>
        </div>
      ) : null}
      <div className="absolute bottom-8 left-8 right-8 h-px bg-muted-foreground/20" />
    </div>
  );
}
