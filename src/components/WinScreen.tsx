import React, { useEffect, useRef, useState } from 'react';
import { LottieIcon } from './LottieIcon';

const WIN_PHRASES = [
  'Я как всегда хорош!',
  'Какой я молодец!',
  'Выпьем за меня!',
  'Слишком просто для меня!',
  'Раскусил тебя без шансов!'
];

interface WinScreenProps {
  onRestart: () => void;
  onViewReflections: () => void;
}

export const WinScreen: React.FC<WinScreenProps> = ({ onRestart, onViewReflections }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [phrase] = useState(() => {
    return WIN_PHRASES[Math.floor(Math.random() * WIN_PHRASES.length)];
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const colors = ['#FF453A', '#FF9F0A', '#FFD60A', '#30D158', '#0A84FF', '#BF5AF2', '#FF375F'];

    interface Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      color: string;
      rotation: number;
      vRot: number;
      opacity: number;
    }

    const particles: Particle[] = [];
    for (let i = 0; i < 90; i++) {
      particles.push({
        x: width / 2 + (Math.random() - 0.5) * 60,
        y: height * 0.45 + (Math.random() - 0.5) * 40,
        vx: (Math.random() - 0.5) * 14,
        vy: (Math.random() - 0.7) * 16 - 3,
        size: Math.random() * 8 + 5,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        vRot: (Math.random() - 0.5) * 10,
        opacity: 1
      });
    }

    let animationId: number;

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.35;
        p.vx *= 0.98;
        p.rotation += p.vRot;
        p.opacity = Math.max(0, p.opacity - 0.005);

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.globalAlpha = p.opacity;
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        ctx.restore();
      });

      if (particles.some((p) => p.opacity > 0)) {
        animationId = requestAnimationFrame(render);
      }
    };

    animationId = requestAnimationFrame(render);

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <>
      <canvas ref={canvasRef} className="win-confetti-canvas" />

      <main className="win-screen-container">
        <div className="win-content-block">
          <div className="win-lottie-slot">
            <LottieIcon 
              src="/Yeah.json" 
              className="win-lottie-host" 
              fallbackClass="ios-skeleton-box" 
            />
          </div>

          <h1 className="win-phrase-title">{phrase}</h1>
        </div>

        <div className="win-buttons-group">
          <button 
            type="button" 
            className="ios-glass-btn win-action-btn"
            onClick={onViewReflections}
          >
            Посмотреть размышления
          </button>

          <button 
            type="button" 
            className="ios-glass-btn win-again-btn"
            onClick={onRestart}
          >
            <img src="/Again.png" alt="" className="again-icon-img" />
            <span>Сыграть еще</span>
          </button>
        </div>
      </main>
    </>
  );
};
