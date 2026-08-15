import React, { useEffect, useRef } from 'react';
import Matter from 'matter-js';

// Более мягкая, пастельно-стеклянная iOS-палитра
const IOS_GLASS_PALETTE = [
  'rgba(255, 89, 94, 0.52)',   // Soft Red
  'rgba(255, 149, 0, 0.52)',   // Warm Orange
  'rgba(255, 204, 0, 0.48)',   // Amber Yellow
  'rgba(52, 199, 89, 0.52)',   // Mint Green
  'rgba(90, 200, 250, 0.52)',  // Sky Cyan
  'rgba(0, 122, 255, 0.52)',   // Royal Blue
  'rgba(175, 82, 222, 0.52)',  // Soft Violet
  'rgba(255, 45, 85, 0.52)'    // Berry Pink
];

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

    const { Engine, World, Bodies, Body } = Matter;
    const engine = Engine.create({
      gravity: { x: 0, y: 1.1, scale: 0.001 }
    });
    const world = engine.world;

    // Границы экрана
    const wallThickness = 120;
    const ground = Bodies.rectangle(width / 2, height + wallThickness / 2, width * 2, wallThickness, { isStatic: true });
    const leftWall = Bodies.rectangle(-wallThickness / 2, height / 2, wallThickness, height * 2, { isStatic: true });
    const rightWall = Bodies.rectangle(width + wallThickness / 2, height / 2, wallThickness, height * 2, { isStatic: true });
    const ceiling = Bodies.rectangle(width / 2, -wallThickness / 2 - 100, width * 2, wallThickness, { isStatic: true });

    // Физическое тело кнопки (колбочки будут падать и опираться на нее)
    let buttonBody: Matter.Body | null = null;

    const updateButtonBody = () => {
      const btnEl = document.querySelector('.ios-glass-btn');
      if (btnEl) {
        const rect = btnEl.getBoundingClientRect();
        const btnX = rect.left + rect.width / 2;
        const btnY = rect.top + rect.height / 2;

        if (!buttonBody) {
          buttonBody = Bodies.rectangle(btnX, btnY, rect.width, rect.height, {
            isStatic: true,
            chamfer: { radius: rect.height / 2 },
            friction: 0.5,
            restitution: 0.2
          });
          World.add(world, buttonBody);
        } else {
          Body.setPosition(buttonBody, { x: btnX, y: btnY });
        }
      }
    };

    World.add(world, [ground, leftWall, rightWall, ceiling]);
    updateButtonBody();

    // Создание колбочек с небольшим зазором (gap)
    const pillBodies: PillBody[] = [];
    const pillHeight = 32;
    const spacingMargin = 4; // физический отступ между элементами

    CHARACTERS.forEach((charName, index) => {
      const visualWidth = Math.max(88, charName.length * 9.2 + 26);
      const physicsWidth = visualWidth + spacingMargin;
      const physicsHeight = pillHeight + spacingMargin;

      // Спавн чуть выше кнопки с разбросом
      const startX = width / 2 + (Math.random() - 0.5) * 120;
      const startY = height * 0.35 + (Math.random() - 0.5) * 80;

      const body = Bodies.rectangle(startX, startY, physicsWidth, physicsHeight, {
        chamfer: { radius: physicsHeight / 2 },
        restitution: 0.25, // приятный мягкий отскок
        friction: 0.4,
        frictionAir: 0.025,
        angle: (Math.random() - 0.5) * 0.6
      }) as PillBody;

      body.textLabel = charName;
      body.pillColor = IOS_GLASS_PALETTE[index % IOS_GLASS_PALETTE.length];
      body.pillWidth = visualWidth;
      body.pillHeight = pillHeight;

      Body.setVelocity(body, {
        x: (Math.random() - 0.5) * 6,
        y: (Math.random() - 0.5) * 4 - 2
      });

      pillBodies.push(body);
    });

    World.add(world, pillBodies);

    // Гироскоп с плавным воздействием
    const handleOrientation = (e: DeviceOrientationEvent) => {
      if (e.gamma === null || e.beta === null) return;
      const gx = Math.min(Math.max(e.gamma / 30, -1.6), 1.6);
      const gy = Math.min(Math.max(e.beta / 30, -1.6), 1.6);
      engine.gravity.x = gx;
      engine.gravity.y = Math.max(gy, 0.4);
    };

    window.addEventListener('deviceorientation', handleOrientation);

    // Запрос прав на iOS
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

    // Обработка изменения размера экрана
    const handleResize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.scale(dpr, dpr);

      Body.setPosition(ground, { x: width / 2, y: height + wallThickness / 2 });
      Body.setPosition(rightWall, { x: width + wallThickness / 2, y: height / 2 });
      updateButtonBody();
    };

    window.addEventListener('resize', handleResize);

    // Рендер-цикл
    let animationFrameId: number;
    let lastTime = performance.now();

    const render = (time: number) => {
      const delta = Math.min(time - lastTime, 32);
      lastTime = time;

      Engine.update(engine, delta);
      ctx.clearRect(0, 0, width, height);

      pillBodies.forEach((body) => {
        const { x, y } = body.position;
        const angle = body.angle;
        const w = body.pillWidth;
        const h = body.pillHeight;
        const r = h / 2;

        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);

        // 1. Контур капсулы
        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(-w / 2, -h / 2, w, h, r);
        } else {
          ctx.arc(-w / 2 + r, 0, r, Math.PI / 2, (Math.PI * 3) / 2);
          ctx.arc(w / 2 - r, 0, r, (Math.PI * 3) / 2, Math.PI / 2);
          ctx.closePath();
        }

        // 2. Базовый полупрозрачный цвет
        ctx.fillStyle = body.pillColor;
        ctx.fill();

        // 3. Эффект стекла (световой блик сверху вниз)
        const glassGrad = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
        glassGrad.addColorStop(0, 'rgba(255, 255, 255, 0.26)');
        glassGrad.addColorStop(0.45, 'rgba(255, 255, 255, 0.05)');
        glassGrad.addColorStop(1, 'rgba(0, 0, 0, 0.12)');
        ctx.fillStyle = glassGrad;
        ctx.fill();

        // 4. Тонкий контур стекла
        ctx.lineWidth = 1;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
        ctx.stroke();

        // 5. Текст персонажа
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
