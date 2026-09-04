import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  drawPet,
  createAnimationState,
  updateAnimation,
  triggerBounce,
  triggerDrag,
  releaseDrag,
  spawnHeart,
} from "./engine";
import type { AnimationState, PetType } from "./engine";
import { useConfig } from "../core/useConfig";
import "./PetCanvas.css";

const DRAG_THRESHOLD = 8;

const PetCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [menuPos, setMenuPos] = useState<{ x: number; y: number } | null>(null);

  // 全局配置由主进程统一持有(形象/后台运行/自启),跨窗口实时同步
  const config = useConfig();

  const animRef = useRef<AnimationState>(createAnimationState());
  const lastInteractionRef = useRef<number>(0);
  const mouseRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const rafRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const petTypeRef = useRef<PetType>("cat");

  // 形象切换(右键菜单 / 控制面板)即时生效
  useEffect(() => {
    petTypeRef.current = config.petType;
  }, [config.petType]);

  const dragRef = useRef({
    isDragging: false,
    startX: 0,
    startY: 0,
    lastX: 0,
    lastY: 0,
    moved: false,
    lastClickTime: 0,
  });

  const animationLoop = useCallback((timestamp: number) => {
    const dt = lastTimeRef.current ? timestamp - lastTimeRef.current : 16;
    lastTimeRef.current = timestamp;
    const clampedDt = Math.min(dt, 50);

    const state = animRef.current;
    if (!state.isDragging && window.petpet &&
        (Math.abs(state.dragVelocityX) > 0.5 || Math.abs(state.dragVelocityY) > 0.5)) {
      window.petpet.dragWindow(
        Math.round(state.dragVelocityX),
        Math.round(state.dragVelocityY)
      );
      const friction = Math.pow(0.88, clampedDt / 16);
      state.dragVelocityX *= friction;
      state.dragVelocityY *= friction;
    }
    updateAnimation(
      state,
      clampedDt,
      lastInteractionRef.current,
      mouseRef.current.x,
      mouseRef.current.y
    );

    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.save();
        ctx.translate(canvas.width / 2, canvas.height / 2 + state.bounceOffset);
        ctx.scale(1 + state.breathPhase, 1 + state.breathPhase);
        drawPet(ctx, petTypeRef.current, state);
        ctx.restore();

        for (const heart of state.hearts) {
          drawHeartEffect(ctx, heart, canvas.width / 2, canvas.height / 2);
        }

        if (state.currentMood === "sleepy" && state.moodTransition > 0.8) {
          drawSleepZ(ctx, canvas.width / 2, canvas.height / 2, state.time);
        }
      }
    }

    rafRef.current = requestAnimationFrame(animationLoop);
  }, []);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(animationLoop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [animationLoop]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const state = animRef.current;
    const drag = dragRef.current;

    const canvas = canvasRef.current;
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = {
        x: (e.clientX - rect.left - rect.width / 2) / (rect.width / 2),
        y: (e.clientY - rect.top - rect.height / 2) / (rect.height / 2),
      };
    }

    drag.isDragging = true;
    drag.startX = e.screenX;
    drag.startY = e.screenY;
    drag.lastX = e.screenX;
    drag.lastY = e.screenY;
    drag.moved = false;
    state.dragVelocityX = 0;
    state.dragVelocityY = 0;

    lastInteractionRef.current = state.time;

    if (state.currentMood === "sleepy") {
      state.targetMood = "idle";
    }

    setMenuPos(null);
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = {
        x: (e.clientX - rect.left - rect.width / 2) / (rect.width / 2),
        y: (e.clientY - rect.top - rect.height / 2) / (rect.height / 2),
      };
    }

    const drag = dragRef.current;
    if (!drag.isDragging) return;

    const dx = e.screenX - drag.lastX;
    const dy = e.screenY - drag.lastY;
    drag.lastX = e.screenX;
    drag.lastY = e.screenY;

    if (Math.sqrt(
      (e.screenX - drag.startX) ** 2 + (e.screenY - drag.startY) ** 2
    ) > DRAG_THRESHOLD) {
      drag.moved = true;
    }

    if (drag.moved) {
      window.petpet?.dragWindow(dx, dy);
      triggerDrag(animRef.current, dx, dy);
    }
  }, []);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    const drag = dragRef.current;
    const state = animRef.current;

    const totalDist = Math.sqrt(
      (e.screenX - drag.startX) ** 2 + (e.screenY - drag.startY) ** 2
    );

    if (drag.isDragging && totalDist < DRAG_THRESHOLD) {
      triggerBounce(state);

      const canvas = canvasRef.current;
      if (canvas) {
        const rect = canvas.getBoundingClientRect();
        const cx = e.clientX - rect.left - rect.width / 2;
        const cy = e.clientY - rect.top - rect.height / 2;
        spawnHeart(state, cx / (rect.width / 2), (cy - 40) / (rect.height / 2));
        spawnHeart(state, (cx + 15) / (rect.width / 2), (cy - 50) / (rect.height / 2));
      }

      const now = performance.now();
      if (now - drag.lastClickTime < 400) {
        state.targetMood = "surprised";
        for (let i = 0; i < 6; i++) {
          spawnHeart(
            state,
            (Math.random() - 0.5) * 1.5,
            (-1 - Math.random()) * 1.2
          );
        }
      }
      drag.lastClickTime = now;
    } else {
      releaseDrag(state);
    }

    drag.isDragging = false;
    drag.moved = false;
  }, []);

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
    if (!menuPos && !dragRef.current.isDragging) {
      window.petpet?.setIgnoreMouseEvents(true);
    }
    if (!dragRef.current.isDragging) {
      mouseRef.current = { x: 0, y: 0 };
    }
  }, [menuPos]);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const menuW = 120;
    const menuH = 148;
    const winW = 200;
    const winH = 200;
    let mx = e.clientX;
    let my = e.clientY;
    if (mx + menuW > winW) mx = winW - menuW - 4;
    if (my + menuH > winH) my = winH - menuH - 4;
    mx = Math.max(4, mx);
    my = Math.max(4, my);
    setMenuPos({ x: mx, y: my });
  }, []);

  // 附带功能入口(每日论文走系统浏览器,待办事项另开窗口)
  const openDailyPapers = useCallback(() => {
    setMenuPos(null);
    window.petpet?.openDailyPapers();
    window.petpet?.setIgnoreMouseEvents(true);
  }, []);

  const openTodosWindow = useCallback(() => {
    setMenuPos(null);
    window.petpet?.openTodos();
    window.petpet?.setIgnoreMouseEvents(true);
  }, []);

  const openControlPanel = useCallback(() => {
    setMenuPos(null);
    window.petpet?.openControlPanel();
    window.petpet?.setIgnoreMouseEvents(true);
  }, []);

  const quitApp = useCallback(() => {
    setMenuPos(null);
    window.petpet?.quit();
  }, []);

  const closeMenu = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setMenuPos(null);
    // 菜单消失后鼠标仍在窗口内，不会重新触发 canvas mouseenter；
    // 保持接收鼠标事件，避免宠物卡在穿透状态。
    window.petpet?.setIgnoreMouseEvents(false);
  }, []);

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

      {menuPos && (
        <div
          className="menu-backdrop"
          onMouseDown={closeMenu}
          onContextMenu={(e) => e.preventDefault()}
        >
          <div
            className="context-menu"
            style={{ left: menuPos.x, top: menuPos.y }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <button onMouseDown={openDailyPapers}>每日论文</button>
            <button onMouseDown={openTodosWindow}>待办事项</button>
            <div className="menu-separator" />
            <button onMouseDown={openControlPanel}>控制面板</button>
            <button onMouseDown={quitApp}>退出程序</button>
          </div>
        </div>
      )}
    </div>
  );
};

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
  ctx.globalAlpha = Math.max(0, heart.opacity);
  ctx.fillStyle = "#FF5252";
  ctx.translate(px, py);

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
