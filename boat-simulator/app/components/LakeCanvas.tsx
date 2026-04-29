'use client';

import { forwardRef, useEffect, useImperativeHandle, useRef, type RefObject } from 'react';
import { PIXELS_PER_METER, SCALE } from '@/lib/constants';
import type { BoatState, TrailPoint } from '@/lib/types';

type Props = {
  stateRef: RefObject<BoatState>;
  trailRef: RefObject<TrailPoint[]>;
  homeRef: RefObject<{ lat: number; lng: number }>;
  isReturningHomeRef: RefObject<boolean>;
};

export const LakeCanvas = forwardRef<HTMLCanvasElement, Props>(function LakeCanvas(
  { stateRef, trailRef, homeRef, isReturningHomeRef },
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

      const skyGrad = ctx.createLinearGradient(0, 0, 0, h * 0.3);
      skyGrad.addColorStop(0, '#1a2a40');
      skyGrad.addColorStop(1, '#0d1b2a');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, w, h * 0.3);

      const waterGrad = ctx.createLinearGradient(0, h * 0.3, 0, h);
      waterGrad.addColorStop(0, '#0a2a4a');
      waterGrad.addColorStop(0.5, '#0a1e35');
      waterGrad.addColorStop(1, '#081828');
      ctx.fillStyle = waterGrad;
      ctx.fillRect(0, h * 0.3, w, h * 0.7);

      ctx.strokeStyle = '#1a4a6a';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, h * 0.3);
      ctx.lineTo(w, h * 0.3);
      ctx.stroke();

      waveOffsetRef.current += 0.02;
      const waveOffset = waveOffsetRef.current;
      ctx.strokeStyle = 'rgba(74, 180, 220, 0.08)';
      ctx.lineWidth = 1;
      for (let row = 0; row < 15; row++) {
        const y = h * 0.35 + row * ((h * 0.7) / 15);
        ctx.beginPath();
        for (let x = 0; x < w; x += 3) {
          const wave = Math.sin(x * 0.02 + waveOffset + row * 0.5) * (3 + row * 0.5);
          if (x === 0) ctx.moveTo(x, y + wave);
          else ctx.lineTo(x, y + wave);
        }
        ctx.stroke();
      }

      ctx.strokeStyle = 'rgba(74, 180, 220, 0.05)';
      ctx.lineWidth = 0.5;
      for (let x = 0; x < w; x += 50) {
        ctx.beginPath();
        ctx.moveTo(x, h * 0.3);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = h * 0.3; y < h; y += 50) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      const home = homeRef.current!;
      const homeX = w / 2;
      const homeY = h * 0.7;
      ctx.beginPath();
      ctx.arc(homeX, homeY, 6, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(78, 205, 196, 0.3)';
      ctx.fill();
      ctx.strokeStyle = '#4ecdc4';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = '#4ecdc4';
      ctx.font = '10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('HOME', homeX, homeY - 12);

      const trail = trailRef.current!;
      if (trail.length > 1) {
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(116, 185, 255, 0.3)';
        ctx.lineWidth = 1.5;
        for (let i = 0; i < trail.length; i++) {
          const tx = homeX + (trail[i].lng - home.lng) * SCALE;
          const ty = homeY - (trail[i].lat - home.lat) * SCALE;
          if (i === 0) ctx.moveTo(tx, ty);
          else ctx.lineTo(tx, ty);
        }
        ctx.stroke();
      }

      const s = stateRef.current!;
      const boatX = homeX + (s.lng - home.lng) * SCALE;
      const boatY = homeY - (s.lat - home.lat) * SCALE;
      const boatRad = (s.heading * Math.PI) / 180;

      ctx.save();
      ctx.translate(boatX, boatY);
      ctx.rotate(boatRad);

      ctx.beginPath();
      ctx.moveTo(0, -14);
      ctx.lineTo(-7, 8);
      ctx.quadraticCurveTo(0, 12, 7, 8);
      ctx.closePath();
      ctx.fillStyle = isReturningHomeRef.current ? '#ffa94d' : '#e0e8f0';
      ctx.fill();
      ctx.strokeStyle = '#4ecdc4';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, -14);
      ctx.lineTo(0, -20);
      ctx.strokeStyle = '#ff6b6b';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.restore();

      ctx.fillStyle = '#74b9ff';
      ctx.font = '10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(s.id, boatX, boatY - 24);

      if (s.distance > 1) {
        ctx.beginPath();
        ctx.moveTo(homeX, homeY);
        ctx.lineTo(boatX, boatY);
        ctx.strokeStyle = 'rgba(255, 169, 77, 0.3)';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.stroke();
        ctx.setLineDash([]);

        const midX = (homeX + boatX) / 2;
        const midY = (homeY + boatY) / 2;
        ctx.fillStyle = '#ffa94d';
        ctx.font = '11px monospace';
        ctx.fillText(`${s.distance.toFixed(0)}m`, midX + 10, midY - 5);
      }

      ctx.fillStyle = '#3a5a7a';
      ctx.font = '10px monospace';
      ctx.textAlign = 'left';
      ctx.fillText('50m', 15, h - 15);
      ctx.beginPath();
      ctx.moveTo(15, h - 10);
      ctx.lineTo(15 + 50 * PIXELS_PER_METER, h - 10);
      ctx.strokeStyle = '#3a5a7a';
      ctx.lineWidth = 1;
      ctx.stroke();
    };

    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, [stateRef, trailRef, homeRef, isReturningHomeRef]);

  return <canvas ref={canvasRef} className="lake-canvas" />;
});
