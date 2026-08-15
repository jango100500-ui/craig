import React, { useEffect, useRef } from 'react';
import Matter from 'matter-js';

// iOS системные цвета с альфа-каналом 0.65
const IOS_COLORS = [
  'rgba(255, 69, 58, 0.65)',   // iOS Red
  'rgba(255, 159, 10, 0.65)',  // iOS Orange
  'rgba(255, 214, 10, 0.65)',  // iOS Yellow
  'rgba(48, 209, 88, 0.65)',   // iOS Green
  'rgba(10, 132, 255, 0.65)',  // iOS Blue
  'rgba(191, 90, 242, 0.65)',  // iOS Purple
  'rgba(255, 55, 95, 0.65)',   // iOS Pink
  'rgba(100, 210, 255, 0.65)', // iOS Teal
];

// Персонажи из разных вселенных
const CHARACTERS = [
  'Дарт Вейдер',
  'Уолтер Уайт',
  'Омни-мэн',
  'Люк Скайуокер',
  'Джесси Пинкман',
  'Неуязвимый',
  'Густаво Фринг',
  'Йода',
  'Сол Гудман',
  'Мандалорец',
  'Бэтмен',
  'Джокер',
  'Хоумлендер',
  'Гарри Поттер',
  'Шрек',
  'Человек-паук',
  'Тони Старк',
  'Геральт',
  'Дэдпул',
  'Эрен Йегер',
  'Танос',
  'Нео',
  'Хан Соло',
  'Годжо',
  'Джек Воробей',
  'Гэндальф'
];

interface PillBody extends Matter.Body {
  textLabel: string;
  pillColor: string;
  pillWidth: number;
  pillHeight: number;
}

export const PhysicsPills: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = window.innerWidth;
    let height = window.innerHeight;
    const dpr = window.devicePixelRatio || 1;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    // Инициализация Matter.js Engine & World
    const { Engine, World, Bodies, Body } = Matter;
    const engine = Engine.create({
      gravity: { x: 0, y: 1.15, scale: 0.001 }
    });
    const world = engine.world;

    // Невидимые границы экрана (стены, пол, потолок)
    const wallThickness = 120;
    const ground = Bodies.rectangle(width / 2, height + wallThickness / 2, width * 2, wallThickness, { isStatic: true });
    const leftWall = Bodies.rectangle(-wallThickness / 2, height / 2, wallThickness, height * 2, { isStatic: true });
    const rightWall = Bodies.rectangle(width + wallThickness / 2, height / 2, wallThickness, height * 2, { isStatic: true });
    const ceiling = Bodies.rectangle(width / 2, -wallThickness / 2, width * 2, wallThickness, { isStatic: true });

    World.add(world, [ground, leftWall, rightWall, ceiling]);

    // Создание колбочек
    const pillBodies: PillBody[] = [];
    const pillHeight = 32;

    CHARACTERS.forEach((charName, index) => {
      // Подбираем ширину капсулы под длину имени
      const pillWidth = Math.max(90, charName.length * 9.5 + 28);
      
      // Появление из центра экрана с легким разбросом
      const startX = width / 2 + (Math.random() - 0.5) * 80;
      const startY = height / 2 - 40 + (Math.random() - 0.5) * 80;

      const body = Bodies.rectangle(startX, startY, pillWidth, pillHeight, {
        chamfer: { radius: pillHeight / 2 },
        restitution: 0.45,  // отскок
        friction: 0.3,
        frictionAir: 0.02,
        angle: (Math.random() - 0.5) * 0.8
      }) as PillBody;

      body.textLabel = charName;
      body.pillColor = IOS_COLORS[index % IOS_COLORS.length];
      body.pillWidth = pillWidth;
      body.pillHeight = pillHeight;

      // Небольшой начальный импульс взрыва из центра
      Body.setVelocity(body, {
        x: (Math.random() - 0.5) * 8,
        y: (Math.random() - 0.5) * 8 - 2
      });

      pillBodies.push(body);
    });

    World.add(world, pillBodies);

    // Слушатель наклона устройства (гироскоп)
    const handleOrientation = (e: DeviceOrientationEvent) => {
      if (e.gamma === null || e.beta === null) return;
      // gamma (-90 to 90) -> влево/вправо
      // beta (-180 to 180) -> вперед/назад
      const gx = Math.min(Math.max(e.gamma / 35, -1.5), 1.5);
      const gy = Math.min(Math.max(e.beta / 35, -1.5), 1.5);
      engine.gravity.x = gx;
      engine.gravity.y = Math.max(gy, 0.3); // чтобы они все же падали вниз
    };

    window.addEventListener('deviceorientation', handleOrientation);

    // Запрос прав на акселерометр для iOS 13+ при первом клике
    const requestMotionPermission = () => {
      if (
        typeof DeviceOrientationEvent !== 'undefined' &&
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        typeof (DeviceOrientationEvent as any).requestPermission === 'function'
      ) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (DeviceOrientationEvent as any).requestPermission().catch(() => {});
      }
    };
    window.addEventListener('click', requestMotionPermission, { once: true });

    // Обработка ресайза
    const handleResize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.scale(dpr, dpr);

      Body.setPosition(ground, { x: width / 2, y: height + wallThickness / 2 });
      Body.setPosition(rightWall, { x: width + wallThickness / 2, y: height / 2 });
    };
    window.addEventListener('resize', handleResize);

    // Кастомный рендер-цикл
    let animationFrameId: number;
    let lastTime = performance.now();

    const render = (time: number) => {
      const delta = Math.min(time - lastTime, 32);
      lastTime = time;

      Engine.update(engine, delta);

      ctx.clearRect(0, 0, width, height);

      // Отрисовка каждой колбочки
      pillBodies.forEach((body) => {
        const { x, y } = body.position;
        const angle = body.angle;
        const w = body.pillWidth;
        const h = body.pillHeight;
        const r = h / 2;

        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);

        // Рисуем скругленный прямоугольник (капсулу)
        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(-w / 2, -h / 2, w, h, r);
        } else {
          ctx.arc(-w / 2 + r, 0, r, Math.PI / 2, (Math.PI * 3) / 2);
          ctx.arc(w / 2 - r, 0, r, (Math.PI * 3) / 2, Math.PI / 2);
          ctx.closePath();
        }

        // Фон колбочки
        ctx.fillStyle = body.pillColor;
        ctx.fill();

        // Тонкий контур
        ctx.lineWidth = 1;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
        ctx.stroke();

        // Текст внутри колбочки (прозрачность 1)
        ctx.fillStyle = '#ffffff';
        ctx.font = '600 13px -apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(body.textLabel, 0, 0.5);

        ctx.restore();
      });

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('deviceorientation', handleOrientation);
      window.removeEventListener('resize', handleResize);
      World.clear(world, false);
      Engine.clear(engine);
    };
  }, []);

  return <canvas ref={canvasRef} className="physics-canvas" />;
};
