'use client';

import React, { useEffect, useRef } from 'react';
import {
  BACKGROUND_FRAME_INTERVAL_MS,
  getBoundedElapsedMs,
  shouldDrawFrame,
  shouldRunDecorativeLoop,
} from './uiEffectRuntime';

export default function BackgroundNodes() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;
    const drawingContext = context as CanvasRenderingContext2D;

    let width = 0;
    let height = 0;
    let animationFrameId: number | null = null;
    let lastDrawAt: number | null = null;
    let reducedMotion = false;
    let documentHidden = false;
    let particles: Particle[] = [];

    const particleCount = 60;
    const connectionDistance = 150;
    // The previous animation moved at most 0.2px per 60Hz frame. Keeping the
    // equivalent per-second speed makes the motion stable across refresh rates.
    const particleSpeed = 24;
    const nodeColor = 'rgba(156, 163, 175, 0.4)';
    const lineColor = 'rgba(156, 163, 175, 0.15)';
    const connectionDistanceSquared = connectionDistance * connectionDistance;

    class Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      radius: number;

      constructor() {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.vx = (Math.random() - 0.5) * particleSpeed;
        this.vy = (Math.random() - 0.5) * particleSpeed;
        this.radius = Math.random() * 2 + 1.5;
      }

      update(deltaSeconds: number) {
        this.x += this.vx * deltaSeconds;
        this.y += this.vy * deltaSeconds;

        if (this.x < 0 || this.x > width) this.vx = -this.vx;
        if (this.y < 0 || this.y > height) this.vy = -this.vy;
      }

      draw() {
        drawingContext.beginPath();
        drawingContext.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        drawingContext.fillStyle = nodeColor;
        drawingContext.fill();
      }
    }

    const resize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;

      for (const particle of particles) {
        particle.x = Math.min(width, Math.max(0, particle.x));
        particle.y = Math.min(height, Math.max(0, particle.y));
      }
    };

    const init = () => {
      particles = [];
      for (let i = 0; i < particleCount; i++) {
        particles.push(new Particle());
      }
    };

    const drawFrame = (elapsedMs: number) => {
      const deltaSeconds = getBoundedElapsedMs(elapsedMs) / 1000;
      drawingContext.clearRect(0, 0, width, height);

      for (let i = 0; i < particles.length; i++) {
        particles[i].update(deltaSeconds);
        particles[i].draw();

        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const distanceSquared = dx * dx + dy * dy;

          if (distanceSquared < connectionDistanceSquared) {
            const distance = Math.sqrt(distanceSquared);
            drawingContext.beginPath();
            drawingContext.strokeStyle = lineColor;
            drawingContext.lineWidth = 1 - distance / connectionDistance;
            drawingContext.moveTo(particles[i].x, particles[i].y);
            drawingContext.lineTo(particles[j].x, particles[j].y);
            drawingContext.stroke();
          }
        }
      }
    };

    const cancelAnimation = () => {
      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
      }
      lastDrawAt = null;
    };

    const animate = (timestamp: number) => {
      animationFrameId = null;

      if (!shouldRunDecorativeLoop({ reducedMotion, documentHidden })) {
        lastDrawAt = null;
        return;
      }

      if (shouldDrawFrame(timestamp, lastDrawAt, BACKGROUND_FRAME_INTERVAL_MS)) {
        const elapsedMs = lastDrawAt === null ? 0 : timestamp - lastDrawAt;
        drawFrame(elapsedMs);
        lastDrawAt = timestamp;
      }

      animationFrameId = requestAnimationFrame(animate);
    };

    const startAnimation = () => {
      if (
        animationFrameId !== null
        || !shouldRunDecorativeLoop({ reducedMotion, documentHidden })
      ) return;

      lastDrawAt = null;
      animationFrameId = requestAnimationFrame(animate);
    };

    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    reducedMotion = reducedMotionQuery.matches;
    documentHidden = document.hidden;

    const handleReducedMotionChange = () => {
      reducedMotion = reducedMotionQuery.matches;
      if (reducedMotion) {
        cancelAnimation();
        drawFrame(0);
      } else {
        startAnimation();
      }
    };

    const handleVisibilityChange = () => {
      documentHidden = document.hidden;
      if (documentHidden) {
        cancelAnimation();
      } else {
        drawFrame(0);
        startAnimation();
      }
    };

    const handleResize = () => {
      resize();
      drawFrame(0);
    };

    window.addEventListener('resize', handleResize);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    reducedMotionQuery.addEventListener('change', handleReducedMotionChange);
    resize();
    init();
    drawFrame(0);
    startAnimation();

    return () => {
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      reducedMotionQuery.removeEventListener('change', handleReducedMotionChange);
      cancelAnimation();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none -z-10"
      aria-hidden="true"
    />
  );
}
