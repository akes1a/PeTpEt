import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  drawPet,
  createAnimationState,
  updateAnimation,
  triggerBounce,
  triggerDrag,
  releaseDrag,
  spawnHeart,
} from "../pets";
import type { AnimationState, PetType } from "../pets";
import "./PetCanvas.css";

/**
 * PetCanvas - 桌面宠物主组件
 *
 * 交互能力：
 * - 点击：弹跳 + 爱心 + 开心表情
 * - 双击：大量爱心 + 惊喜表情
 * - 拖拽：惊恐表情 + 惯性释放
 * - 悬停：视线跟随鼠标
 * - 闲置30秒：自动打盹
 * - 随机小动作：眨眼、摇尾、歪头、打哈欠、伸懒腰
 * - 右键：切换宠物菜单
 */
const PetCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [petType, setPetType] = useState<PetType>(() => {
    return (localStorage.getItem("petpet-type") as PetType) || "cat";
  });
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

  // 动画引擎引用
  const animRef = useRef<AnimationState>(createAnimationState());
  const lastInteractionRef = useRef<number>(0);
  const mouseRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const rafRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);

  // 拖拽状态
  const dragRef = useRef({
    isDragging: false,
    startX: 0,
    startY: 0,
    lastX: 0,
    lastY: 0,
    lastTime: 0,
    moved: false,
  });

  // ======================== 动画循环 ========================
  useEffect(() => {
    const animate = (timestamp: number) => {
      const dt = lastTimeRef.current ? timestamp - lastTimeRef.current : 16;
      lastTimeRef.current = timestamp;

      // 限制最大 dt 防止切 tab 后跳帧
      const clampedDt = Math.min(dt, 50);

      const state = animRef.current;
      updateAnimation(
        state,
        clampedDt,
        lastInteractionRef.current,
        mouseRef.current.x,
        mouseRef.current.y
      );

      // 绘制
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.save();
          ctx.translate(canvas.width / 2, canvas.height / 2 + state.bounceOffset);
          ctx.scale(1 + state.breathPhase, 1 + state.breathPhase);
          drawPet(ctx, petType, state);
          ctx.restore();

          // 绘制爱心特效
          for (const heart of state.hearts) {
            drawHeartEffect(ctx, heart, canvas.width / 2, canvas.height / 2);
          }

          // 打盹 Zzz
          if (state.currentMood === "sleepy" && state.moodTransition > 0.8) {
            drawSleepZ(ctx, canvas.width / 2, canvas.height / 2, state.time);
          }
        }
      }

      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [petType]);

  // ======================== 鼠标交互 ========================
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const state = animRef.current;
      const drag = dragRef.current;

      // 点击位置（相对于 canvas 中心）
      const canvas = canvasRef.current;
      if (canvas) {
        const rect = canvas.getBoundingClientRect();
        mouseRef.current = {
          x: (e.clientX - rect.left - rect.width / 2) / (rect.width / 2),
          y: (e.clientY - rect.top - rect.height / 2) / (rect.height / 2),
        };
      }

      // 开始拖拽
      drag.isDragging = true;
      drag.startX = e.screenX;
      drag.startY = e.screenY;
      drag.lastX = e.screenX;
      drag.lastY = e.screenY;
      drag.lastTime = performance.now();
      drag.moved = false;

      // 记录交互时间
      lastInteractionRef.current = state.time;

      // 如果宠物在打盹，唤醒
      if (state.currentMood === "sleepy") {
        state.targetMood = "idle";
      }

      setContextMenu(null);
    },
    []
  );

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const drag = dragRef.current;
    if (!drag.isDragging) return;

    const dx = e.screenX - drag.lastX;
    const dy = e.screenY - drag.lastY;
    drag.lastX = e.screenX;
    drag.lastY = e.screenY;
    drag.lastTime = performance.now();

    if (Math.abs(e.screenX - drag.startX) > 3 || Math.abs(e.screenY - drag.startY) > 3) {
      drag.moved = true;
    }

    if (drag.moved && window.petpet) {
      window.petpet.dragWindow(dx, dy);
      triggerDrag(animRef.current, dx, dy);
    }
  }, []);

  const handleMouseUp = useCallback(
    (e: React.MouseEvent) => {
      const drag = dragRef.current;
      const state = animRef.current;

      if (drag.isDragging && !drag.moved) {
        // 这是一次点击，不是拖拽
        triggerBounce(state);

        const canvas = canvasRef.current;
        if (canvas) {
          const rect = canvas.getBoundingClientRect();
          const cx = e.clientX - rect.left - rect.width / 2;
          const cy = e.clientY - rect.top - rect.height / 2;
          // 在宠物头顶生成爱心
          spawnHeart(state, cx / (rect.width / 2), (cy - 40) / (rect.height / 2));
          spawnHeart(state, (cx + 15) / (rect.width / 2), (cy - 50) / (rect.height / 2));
        }

        // 检测双击
        const now = performance.now();
        const lastClick = (drag as any).lastClickTime || 0;
        if (now - lastClick < 400) {
          // 双击！
          state.targetMood = "surprised";
          const canvas = canvasRef.current;
          if (canvas) {
            const rect = canvas.getBoundingClientRect();
            for (let i = 0; i < 5; i++) {
              spawnHeart(
                state,
                (Math.random() - 0.5) * 1.5,
                (-1 - Math.random()) * 1.2
              );
            }
          }
        }
        (drag as any).lastClickTime = now;
      } else {
        releaseDrag(state);
      }

      drag.isDragging = false;
      drag.moved = false;
    },
    []
  );

  // 鼠标悬停视线跟踪
  const handleMouseEnter = useCallback((e: React.MouseEvent) => {
    window.petpet?.setIgnoreMouseEvents(false);
    const canvas = canvasRef.current;
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = {
        x: (e.clientX - rect.left - rect.width / 2) / (rect.width / 2),
        y: (e.clientY - rect.top - rect.height / 2) / (rect.height / 2),
      };
    }
  }, []);

  const handleMouseLeavePet = useCallback(() => {
    window.petpet?.setIgnoreMouseEvents(true);
    mouseRef.current = { x: 0, y: 0 };
  }, []);

  // ======================== 右键菜单 ========================
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
  }, []);

  const switchPet = useCallback((type: PetType) => {
    setPetType(type);
    localStorage.setItem("petpet-type", type);
    setContextMenu(null);
    lastInteractionRef.current = animRef.current.time;
  }, []);

  useEffect(() => {
    const handler = () => setContextMenu(null);
    if (contextMenu) {
      window.addEventListener("click", handler);
      return () => window.removeEventListener("click", handler);
    }
  }, [contextMenu]);

  // 鼠标穿透
  useEffect(() => {
    window.petpet?.setIgnoreMouseEvents(true);
    return () => {
      window.petpet?.setIgnoreMouseEvents(false);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="pet-container"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onContextMenu={handleContextMenu}
    >
      <canvas
        ref={canvasRef}
        width={200}
        height={200}
        className="pet-canvas"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeavePet}
      />

      {contextMenu && (
        <div
          className="context-menu"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <div className="menu-title">选择宠物</div>
          <button className={petType === "cat" ? "active" : ""} onClick={() => switchPet("cat")}>
            🐱 猫咪
          </button>
          <button className={petType === "dog" ? "active" : ""} onClick={() => switchPet("dog")}>
            🐶 小狗
          </button>
          <button className={petType === "penguin" ? "active" : ""} onClick={() => switchPet("penguin")}>
            🐧 企鹅
          </button>
          <hr />
          <button onClick={() => setContextMenu(null)}>关闭</button>
        </div>
      )}
    </div>
  );
};

// ======================== 特效绘制 ========================

function drawHeartEffect(
  ctx: CanvasRenderingContext2D,
  heart: { x: number; y: number; size: number; opacity: number },
  cx: number,
  cy: number
): void {
  const px = cx + heart.x * 80;
  const py = cy + heart.y * 80;
  const s = heart.size;

  ctx.save();
  ctx.globalAlpha = heart.opacity;
  ctx.fillStyle = "#FF5252";
  ctx.translate(px, py);

  // 心形路径
  ctx.beginPath();
  ctx.moveTo(0, s * 0.3);
  ctx.bezierCurveTo(-s * 0.5, -s * 0.2, -s * 0.5, -s * 0.7, 0, -s);
  ctx.bezierCurveTo(s * 0.5, -s * 0.7, s * 0.5, -s * 0.2, 0, s * 0.3);
  ctx.fill();

  ctx.restore();
}

function drawSleepZ(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  time: number
): void {
  ctx.save();
  ctx.fillStyle = "#90A4AE";
  ctx.font = "bold 16px sans-serif";
  const baseX = cx + 30;
  const baseY = cy - 50;

  for (let i = 0; i < 3; i++) {
    const offset = Math.sin(time / 800 + i) * 5;
    const alpha = 0.3 + i * 0.2;
    ctx.globalAlpha = alpha;
    ctx.fillText("Z", baseX + i * 12 + offset, baseY - i * 14 + offset);
  }

  ctx.restore();
}

export default PetCanvas;
