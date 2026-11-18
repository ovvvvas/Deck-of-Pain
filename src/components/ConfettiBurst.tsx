import React, { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  w: number;
  h: number;
  angle: number;
  spin: number;
  color: string;
}

const COLORS = ['#d94e28', '#7c3aed', '#0ea5e9', '#eab308', '#16a34a'];

export const ConfettiBurst: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = window.innerWidth;
    const height = window.innerHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    const particles: Particle[] = Array.from({ length: 42 }, (_, idx) => ({
      x: Math.random() * width,
      y: -20 - Math.random() * 160,
      vx: (Math.random() - 0.5) * 2.2,
      vy: 3.2 + Math.random() * 3.4,
      w: 8,
      h: 13,
      angle: Math.random() * Math.PI * 2,
      spin: (Math.random() - 0.5) * 0.16,
      color: COLORS[idx % COLORS.length],
    }));

    let animId = 0;
    let active = true;

    const frame = () => {
      if (!active) return;
      ctx.clearRect(0, 0, width, height);
      let anyVisible = false;

      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.angle += p.spin;
        if (p.y < height + 30) {
          anyVisible = true;
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.angle);
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
          ctx.restore();
        }
      }

      if (anyVisible) {
        animId = window.requestAnimationFrame(frame);
      }
    };

    animId = window.requestAnimationFrame(frame);

    return () => {
      active = false;
      window.cancelAnimationFrame(animId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none z-50 w-full h-full"
    />
  );
};
