"use client";

import { useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";

type Props = {
    value: string;
    onChange: (base64Png: string) => void;
    disabled?: boolean;
};

export default function TabletSignaturePad({ value, onChange, disabled = false }: Props) {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const drawingRef = useRef(false);
    const strokeStartedRef = useRef(false);
    const strokeMovedRef = useRef(false);
    const hasStrokeRef = useRef(Boolean(value));
    const [hasStroke, setHasStroke] = useState(Boolean(value));

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) {
            return;
        }

        const parent = canvas.parentElement;
        const width = Math.max(280, parent?.clientWidth || 520);
        const height = 180;
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
            return;
        }

        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = "#0f172a";
        ctx.lineWidth = 2;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";

        if (value) {
            const image = new Image();
            image.onload = () => {
                ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
            };
            image.src = value;
        }

        const valueHasStroke = Boolean(value);
        hasStrokeRef.current = valueHasStroke;
    }, [value]);

    function getPoint(event: ReactPointerEvent<HTMLCanvasElement>) {
        const canvas = canvasRef.current;
        if (!canvas) {
            return { x: 0, y: 0 };
        }
        const rect = canvas.getBoundingClientRect();
        return {
            x: event.clientX - rect.left,
            y: event.clientY - rect.top,
        };
    }

    function beginDraw(event: ReactPointerEvent<HTMLCanvasElement>) {
        if (disabled) {
            return;
        }
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext("2d");
        if (!canvas || !ctx) {
            return;
        }
        canvas.setPointerCapture(event.pointerId);
        drawingRef.current = true;
        strokeStartedRef.current = true;
        strokeMovedRef.current = false;
        const { x, y } = getPoint(event);
        ctx.beginPath();
        ctx.moveTo(x, y);
    }

    function draw(event: ReactPointerEvent<HTMLCanvasElement>) {
        if (!drawingRef.current || disabled) {
            return;
        }
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext("2d");
        if (!canvas || !ctx) {
            return;
        }
        const { x, y } = getPoint(event);
        ctx.lineTo(x, y);
        ctx.stroke();
        strokeMovedRef.current = true;
        hasStrokeRef.current = true;
        setHasStroke(true);
    }

    function endDraw(event: ReactPointerEvent<HTMLCanvasElement>) {
        if (disabled || !drawingRef.current) {
            return;
        }
        const canvas = canvasRef.current;
        if (!canvas) {
            return;
        }

        drawingRef.current = false;
        if (canvas.hasPointerCapture(event.pointerId)) {
            canvas.releasePointerCapture(event.pointerId);
        }

        if (!strokeStartedRef.current) {
            return;
        }

        strokeStartedRef.current = false;
        if (!strokeMovedRef.current && !hasStrokeRef.current) {
            return;
        }

        const signature = canvas.toDataURL("image/png");
        hasStrokeRef.current = true;
        setHasStroke(true);
        onChange(signature);
    }

    function clearCanvas() {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext("2d");
        if (!canvas || !ctx) {
            return;
        }
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        hasStrokeRef.current = false;
        strokeStartedRef.current = false;
        strokeMovedRef.current = false;
        setHasStroke(false);
        onChange("");
    }

    return (
        <div className="rounded-xl border border-slate-300 bg-white p-2">
            <canvas
                ref={canvasRef}
                data-testid="signature-pad-canvas"
                role="img"
                aria-label="Signature capture area"
                tabIndex={0}
                className="w-full touch-none rounded-lg border border-slate-200 bg-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                onPointerDown={beginDraw}
                onPointerMove={draw}
                onPointerUp={endDraw}
                onPointerCancel={endDraw}
            />
            <div className="mt-2 flex items-center justify-between">
                <p className="text-xs text-slate-500">وقّع داخل المنطقة باستخدام القلم أو الإصبع.</p>
                <button
                    type="button"
                    onClick={clearCanvas}
                    disabled={!hasStroke || disabled}
                    className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-700 disabled:opacity-50"
                >
                    مسح
                </button>
            </div>
        </div>
    );
}
