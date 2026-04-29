'use client';

import { forwardRef, useEffect, useImperativeHandle, useRef, type RefObject } from 'react';
import type { BoatState } from '@/lib/types';

type Props = {
  stateRef: RefObject<BoatState>;
};

export const CameraCanvas = forwardRef<HTMLCanvasElement, Props>(function CameraCanvas(
  { stateRef },
  ref,
) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  useImperativeHandle(ref, () => canvasRef.current!, []);

  const waveOffsetRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf = 0;
    let scaled = false;

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const rect = parent.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      scaled = true;
    };

    resize();
    window.addEventListener('resize', resize);

    const draw = () => {
      raf = requestAnimationFrame(draw);
      if (!scaled) return;

      const dpr = window.devicePixelRatio || 1;
      const w = canvas.width / dpr;
      const h = canvas.height / dpr;
      const s = stateRef.current!;

      const skyGrad = ctx.createLinearGradient(0, 0, 0, h * 0.4);
      skyGrad.addColorStop(0, '#2a3a50');
      skyGrad.addColorStop(1, '#1a2a3a');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, w, h * 0.4);

      const horizonY = h * 0.4;
      const wGrad = ctx.createLinearGradient(0, horizonY, 0, h);
      wGrad.addColorStop(0, '#1a3a5a');
      wGrad.addColorStop(1, '#0a1e30');
      ctx.fillStyle = wGrad;
      ctx.fillRect(0, horizonY, w, h);

      waveOffsetRef.current += 0.03;
      const waveOffset = waveOffsetRef.current;
      for (let row = 0; row < 8; row++) {
        const y = horizonY + 5 + row * ((h - horizonY) / 8);
        const amplitude = 1 + row * 0.5;
        ctx.beginPath();
        ctx.strokeStyle = `rgba(74, 180, 220, ${0.05 + row * 0.02})`;
        ctx.lineWidth = 0.5 + row * 0.2;
        for (let x = 0; x < w; x += 2) {
          const wave = Math.sin(x * 0.05 + waveOffset + row * 0.8) * amplitude;
          if (x === 0) ctx.moveTo(x, y + wave);
          else ctx.lineTo(x, y + wave);
        }
        ctx.stroke();
      }

      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(w / 2 - 30, 4, 60, 16);
      ctx.fillStyle = '#4ecdc4';
      ctx.font = '10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`${s.heading.toFixed(0)}°`, w / 2, 16);

      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(w - 55, 4, 50, 16);
      ctx.fillStyle = '#74b9ff';
      ctx.textAlign = 'right';
      ctx.fillText(`${(s.speed * 3.6).toFixed(1)}km/h`, w - 8, 16);

      ctx.strokeStyle = 'rgba(255, 107, 107, 0.4)';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(w / 2, horizonY + 10);
      ctx.lineTo(w / 2, horizonY + 30);
      ctx.moveTo(w / 2 - 10, horizonY + 20);
      ctx.lineTo(w / 2 + 10, horizonY + 20);
      ctx.stroke();
    };

    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, [stateRef]);

  return <canvas ref={canvasRef} className="camera-canvas" />;
});
