"use client";

import { useEffect, useRef } from "react";

/**
 * 3D animated tech-style particle mesh background.
 * Deep blue-indigo gradient with floating geometric shapes,
 * connecting lines, and subtle glow effects. No black, no white.
 */
export default function AnimatedBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;
    let width = 0;
    let height = 0;

    const PARTICLE_COUNT = 80;
    const CONNECTION_DISTANCE = 150;
    const SHAPES_COUNT = 6;

    type Particle = {
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      opacity: number;
      pulseSpeed: number;
      pulsePhase: number;
    };

    type Shape = {
      x: number;
      y: number;
      size: number;
      rotation: number;
      rotationSpeed: number;
      vx: number;
      vy: number;
      type: "hexagon" | "triangle" | "diamond" | "ring";
      opacity: number;
      pulseSpeed: number;
      pulsePhase: number;
    };

    const particles: Particle[] = [];
    const shapes: Shape[] = [];

    function resize() {
      if (!canvas) return;
      width = canvas.parentElement?.clientWidth ?? window.innerWidth;
      height = canvas.parentElement?.clientHeight ?? window.innerHeight;
      canvas.width = width * window.devicePixelRatio;
      canvas.height = height * window.devicePixelRatio;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx?.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0);
    }

    function createParticle(): Particle {
      return {
        x: Math.random() * (width || 800),
        y: Math.random() * (height || 600),
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        size: Math.random() * 2 + 1,
        opacity: Math.random() * 0.5 + 0.3,
        pulseSpeed: Math.random() * 0.02 + 0.01,
        pulsePhase: Math.random() * Math.PI * 2,
      };
    }

    function createShape(): Shape {
      const types: Array<"hexagon" | "triangle" | "diamond" | "ring"> = ["hexagon", "triangle", "diamond", "ring"];
      return {
        x: Math.random() * (width || 800),
        y: Math.random() * (height || 600),
        size: Math.random() * 30 + 15,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.008,
        vx: (Math.random() - 0.5) * 0.15,
        vy: (Math.random() - 0.5) * 0.15,
        type: types[Math.floor(Math.random() * types.length)],
        opacity: Math.random() * 0.12 + 0.04,
        pulseSpeed: Math.random() * 0.01 + 0.005,
        pulsePhase: Math.random() * Math.PI * 2,
      };
    }

    function init() {
      particles.length = 0;
      shapes.length = 0;
      for (let i = 0; i < PARTICLE_COUNT; i++) particles.push(createParticle());
      for (let i = 0; i < SHAPES_COUNT; i++) shapes.push(createShape());
    }

    function drawHexagon(cx: number, cy: number, r: number) {
      if (!ctx) return;
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i - Math.PI / 6;
        const px = cx + r * Math.cos(angle);
        const py = cy + r * Math.sin(angle);
        i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.stroke();
    }

    function drawTriangle(cx: number, cy: number, r: number) {
      if (!ctx) return;
      ctx.beginPath();
      for (let i = 0; i < 3; i++) {
        const angle = (Math.PI * 2 / 3) * i - Math.PI / 2;
        const px = cx + r * Math.cos(angle);
        const py = cy + r * Math.sin(angle);
        i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.stroke();
    }

    function drawDiamond(cx: number, cy: number, r: number) {
      if (!ctx) return;
      ctx.beginPath();
      ctx.moveTo(cx, cy - r);
      ctx.lineTo(cx + r * 0.6, cy);
      ctx.lineTo(cx, cy + r);
      ctx.lineTo(cx - r * 0.6, cy);
      ctx.closePath();
      ctx.stroke();
    }

    function drawRing(cx: number, cy: number, r: number) {
      if (!ctx) return;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
    }

    function drawShape(shape: Shape, time: number) {
      if (!ctx) return;
      const pulse = Math.sin(time * shape.pulseSpeed + shape.pulsePhase) * 0.5 + 0.5;
      const alpha = shape.opacity * (0.6 + pulse * 0.4);
      ctx.save();
      ctx.translate(shape.x, shape.y);
      ctx.rotate(shape.rotation);
      ctx.strokeStyle = `rgba(147, 197, 253, ${alpha})`;
      ctx.lineWidth = 1;

      switch (shape.type) {
        case "hexagon":
          drawHexagon(0, 0, shape.size);
          break;
        case "triangle":
          drawTriangle(0, 0, shape.size);
          break;
        case "diamond":
          drawDiamond(0, 0, shape.size);
          break;
        case "ring":
          drawRing(0, 0, shape.size);
          break;
      }
      ctx.restore();
    }

    function animate(time: number) {
      if (!ctx || !width || !height) {
        animationId = requestAnimationFrame(animate);
        return;
      }

      // Gradient background — deep indigo to blue-teal
      const grad = ctx.createLinearGradient(0, 0, width, height);
      grad.addColorStop(0, "#1e1b4b");
      grad.addColorStop(0.35, "#1e3a5f");
      grad.addColorStop(0.65, "#1a365d");
      grad.addColorStop(1, "#134e5e");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      // Subtle radial glow overlay
      const glow = ctx.createRadialGradient(
        width * 0.3, height * 0.3, 0,
        width * 0.3, height * 0.3, width * 0.6,
      );
      glow.addColorStop(0, "rgba(99, 102, 241, 0.08)");
      glow.addColorStop(1, "rgba(99, 102, 241, 0)");
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, width, height);

      // Second glow — bottom right, teal accent
      const glow2 = ctx.createRadialGradient(
        width * 0.8, height * 0.7, 0,
        width * 0.8, height * 0.7, width * 0.5,
      );
      glow2.addColorStop(0, "rgba(45, 212, 191, 0.06)");
      glow2.addColorStop(1, "rgba(45, 212, 191, 0)");
      ctx.fillStyle = glow2;
      ctx.fillRect(0, 0, width, height);

      // Update & draw shapes (behind particles)
      for (const shape of shapes) {
        shape.x += shape.vx;
        shape.y += shape.vy;
        shape.rotation += shape.rotationSpeed;

        if (shape.x < -50) shape.x = width + 50;
        if (shape.x > width + 50) shape.x = -50;
        if (shape.y < -50) shape.y = height + 50;
        if (shape.y > height + 50) shape.y = -50;

        drawShape(shape, time);
      }

      // Update particles
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;
      }

      // Draw connections
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < CONNECTION_DISTANCE) {
            const alpha = (1 - dist / CONNECTION_DISTANCE) * 0.15;
            ctx.strokeStyle = `rgba(165, 180, 252, ${alpha})`;
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }

      // Draw particles
      for (const p of particles) {
        const pulse = Math.sin(time * p.pulseSpeed + p.pulsePhase) * 0.5 + 0.5;
        const r = p.size * (0.8 + pulse * 0.4);
        const alpha = p.opacity * (0.7 + pulse * 0.3);

        // Glow
        const pg = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 4);
        pg.addColorStop(0, `rgba(165, 180, 252, ${alpha * 0.3})`);
        pg.addColorStop(1, "rgba(165, 180, 252, 0)");
        ctx.fillStyle = pg;
        ctx.fillRect(p.x - r * 4, p.y - r * 4, r * 8, r * 8);

        // Core dot
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(199, 210, 254, ${alpha})`;
        ctx.fill();
      }

      animationId = requestAnimationFrame(animate);
    }

    resize();
    init();
    animationId = requestAnimationFrame(animate);

    window.addEventListener("resize", () => {
      resize();
    });

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 h-full w-full"
      style={{ pointerEvents: "none" }}
    />
  );
}
