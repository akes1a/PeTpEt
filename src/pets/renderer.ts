/**
 * 宠物渲染器 - 程序化绘制三种宠物
 * 支持：多情绪表情、眨眼、尾巴摇摆、小动作动画
 */
import type { AnimationState, PetType, IdleAction } from "./types";

// ======================== 绘制工具函数 ========================

/** 绘制圆角眼睛（含眨眼） */
function drawEye(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  isBlinking: boolean,
  lookX: number,
  lookY: number
): void {
  ctx.save();
  ctx.translate(x, y);

  if (isBlinking) {
    // 眨眼：压扁成一条线
    ctx.fillStyle = "#333";
    ctx.fillRect(-w, -1, w * 2, 2);
  } else {
    // 眼白
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.ellipse(0, 0, w, h, 0, 0, Math.PI * 2);
    ctx.fill();

    // 瞳孔（跟随视线）
    const pupilX = lookX * (w * 0.3);
    const pupilY = lookY * (h * 0.3);
    ctx.fillStyle = "#222";
    ctx.beginPath();
    ctx.arc(pupilX, pupilY, w * 0.48, 0, Math.PI * 2);
    ctx.fill();

    // 高光
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(pupilX - w * 0.15, pupilY - h * 0.2, w * 0.2, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

// ======================== 猫咪绘制 ========================

export function drawCat(ctx: CanvasRenderingContext2D, state: AnimationState): void {
  const { isBlinking, lookAtX, lookAtY, idleAction, tailWagAmplitude, tailWagPhase } = state;
  const mood = state.currentMood;

  // 身体
  const bodyScale = mood === "sleepy" ? 0.92 : mood === "dragged" ? 0.85 : 1;
  ctx.save();
  ctx.scale(bodyScale, bodyScale);

  // 阴影
  ctx.fillStyle = "rgba(0,0,0,0.08)";
  ctx.beginPath();
  ctx.ellipse(0, 42, 28, 6, 0, 0, Math.PI * 2);
  ctx.fill();

  // --- 身体 ---
  ctx.fillStyle = "#FFB74D";
  ctx.beginPath();
  ctx.ellipse(0, 5, 30, 35, 0, 0, Math.PI * 2);
  ctx.fill();

  // 肚皮
  ctx.fillStyle = "#FFE0B2";
  ctx.beginPath();
  ctx.ellipse(0, 10, 18, 22, 0, 0, Math.PI * 2);
  ctx.fill();

  // --- 尾巴 ---
  ctx.save();
  const tailSwing = Math.sin(tailWagPhase) * tailWagAmplitude * 15;
  ctx.strokeStyle = "#FFB74D";
  ctx.lineWidth = 6;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(10, 30);
  ctx.quadraticCurveTo(35 + tailSwing, 15, 45 + tailSwing * 1.5, 0);
  ctx.stroke();
  // 尾巴尖
  ctx.strokeStyle = "#FFCC80";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(35 + tailSwing, 15);
  ctx.quadraticCurveTo(38 + tailSwing, 10, 45 + tailSwing * 1.5, 0);
  ctx.stroke();
  ctx.restore();

  // --- 头 ---
  const headTilt = idleAction?.type === "head_tilt" ? Math.sin(idleAction.progress * Math.PI) * 0.2 : 0;
  ctx.save();
  ctx.translate(0, -28);
  ctx.rotate(headTilt);

  ctx.fillStyle = "#FFB74D";
  ctx.beginPath();
  ctx.arc(0, 0, 25, 0, Math.PI * 2);
  ctx.fill();

  // 耳朵（左）
  ctx.fillStyle = "#FFB74D";
  ctx.beginPath();
  ctx.moveTo(-18, -17);
  ctx.lineTo(-25, -34);
  ctx.lineTo(-5, -20);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#FFCC80";
  ctx.beginPath();
  ctx.moveTo(-16, -18);
  ctx.lineTo(-22, -30);
  ctx.lineTo(-8, -20);
  ctx.closePath();
  ctx.fill();

  // 耳朵（右）
  ctx.fillStyle = "#FFB74D";
  ctx.beginPath();
  ctx.moveTo(18, -17);
  ctx.lineTo(25, -34);
  ctx.lineTo(5, -20);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#FFCC80";
  ctx.beginPath();
  ctx.moveTo(16, -18);
  ctx.lineTo(22, -30);
  ctx.lineTo(8, -20);
  ctx.closePath();
  ctx.fill();

  // 眼睛
  drawEye(ctx, -9, -2, 6, 7, isBlinking, lookAtX, lookAtY);
  drawEye(ctx, 9, -2, 6, 7, isBlinking, lookAtX, lookAtY);

  // 表情：嘴巴
  ctx.strokeStyle = "#666";
  ctx.lineWidth = 1.5;
  if (mood === "happy") {
    // 开心：弯弯的嘴
    ctx.beginPath();
    ctx.arc(0, 8, 5, 0.2, Math.PI - 0.2);
    ctx.stroke();
  } else if (mood === "dragged") {
    // 被拖：惊讶张嘴
    ctx.fillStyle = "#FF8A80";
    ctx.beginPath();
    ctx.ellipse(0, 10, 5, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#E57373";
    ctx.beginPath();
    ctx.ellipse(0, 8, 3, 3, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (mood === "sleepy") {
    // 打盹：小嘴
    ctx.beginPath();
    ctx.arc(0, 8, 2, 0, Math.PI);
    ctx.stroke();
  } else {
    // 正常
    ctx.beginPath();
    ctx.moveTo(0, 8);
    ctx.quadraticCurveTo(-5, 13, -8, 14);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, 8);
    ctx.quadraticCurveTo(5, 13, 8, 14);
    ctx.stroke();
  }

  // 鼻子
  ctx.fillStyle = "#FF8A80";
  ctx.beginPath();
  ctx.moveTo(0, 4);
  ctx.lineTo(-3, 7);
  ctx.lineTo(3, 7);
  ctx.closePath();
  ctx.fill();

  // 打哈欠特效
  if (idleAction?.type === "yawn") {
    const yawnProgress = idleAction.progress;
    if (yawnProgress > 0.1 && yawnProgress < 0.7) {
      ctx.fillStyle = "#FF8A80";
      const yawnScale = Math.sin((yawnProgress - 0.1) / 0.6 * Math.PI);
      ctx.beginPath();
      ctx.ellipse(0, 12, 7 * yawnScale, 8 * yawnScale, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // 胡须（左）
  ctx.strokeStyle = "#ddd";
  ctx.lineWidth = 1;
  const whiskerShrink = mood === "sleepy" ? 0.5 : 1;
  ctx.beginPath(); ctx.moveTo(-22, 3); ctx.lineTo(-45 * whiskerShrink, 0); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-22, 6); ctx.lineTo(-45 * whiskerShrink, 6); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-22, 9); ctx.lineTo(-43 * whiskerShrink, 13); ctx.stroke();

  // 胡须（右）
  ctx.beginPath(); ctx.moveTo(22, 3); ctx.lineTo(45 * whiskerShrink, 0); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(22, 6); ctx.lineTo(45 * whiskerShrink, 6); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(22, 9); ctx.lineTo(43 * whiskerShrink, 13); ctx.stroke();

  ctx.restore(); // 头

  // 前爪
  ctx.fillStyle = "#FFB74D";
  ctx.beginPath();
  ctx.ellipse(-12, 35, 8, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(12, 35, 8, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore(); // 身体缩放
}

// ======================== 小狗绘制 ========================

export function drawDog(ctx: CanvasRenderingContext2D, state: AnimationState): void {
  const { isBlinking, lookAtX, lookAtY, idleAction, tailWagAmplitude, tailWagPhase } = state;
  const mood = state.currentMood;

  ctx.save();

  // 阴影
  ctx.fillStyle = "rgba(0,0,0,0.08)";
  ctx.beginPath();
  ctx.ellipse(0, 42, 26, 6, 0, 0, Math.PI * 2);
  ctx.fill();

  // --- 身体 ---
  ctx.fillStyle = "#8D6E63";
  ctx.beginPath();
  ctx.ellipse(0, 8, 28, 32, 0, 0, Math.PI * 2);
  ctx.fill();

  // 肚皮
  ctx.fillStyle = "#BCAAA4";
  ctx.beginPath();
  ctx.ellipse(0, 12, 16, 20, 0, 0, Math.PI * 2);
  ctx.fill();

  // --- 尾巴（卷曲+摇摆） ---
  ctx.save();
  const tailSwing = Math.sin(tailWagPhase) * tailWagAmplitude * 10;
  ctx.translate(10, 22);
  ctx.rotate(tailSwing * 0.05);
  ctx.strokeStyle = "#8D6E63";
  ctx.lineWidth = 5;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(20, -15, 25, 3);
  ctx.quadraticCurveTo(28, 13, 20, 8);
  ctx.stroke();
  ctx.restore();

  // --- 头 ---
  const headTilt = idleAction?.type === "head_tilt" ? Math.sin(idleAction.progress * Math.PI) * 0.25 : 0;
  ctx.save();
  ctx.translate(0, -25);
  ctx.rotate(headTilt);

  ctx.fillStyle = "#A1887F";
  ctx.beginPath();
  ctx.arc(0, 0, 24, 0, Math.PI * 2);
  ctx.fill();

  // 耳朵（垂耳）
  const earSwing = idleAction?.type === "wag_tail" ? Math.sin(idleAction.progress * Math.PI * 3) * 3 : 0;
  ctx.fillStyle = "#6D4C41";
  ctx.beginPath();
  ctx.ellipse(-20, -5, 8, 18, -0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(20, -5, 8, 18, 0.3, 0, Math.PI * 2);
  ctx.fill();

  // 眼睛
  drawEye(ctx, -8, -2, 5.5, 6, isBlinking, lookAtX, lookAtY);
  drawEye(ctx, 8, -2, 5.5, 6, isBlinking, lookAtX, lookAtY);

  // 鼻子
  ctx.fillStyle = "#333";
  ctx.beginPath();
  ctx.ellipse(0, 5, 6, 4.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#555";
  ctx.beginPath();
  ctx.arc(-1, 4, 2, 0, Math.PI * 2);
  ctx.fill();

  // 嘴
  ctx.strokeStyle = "#555";
  ctx.lineWidth = 1.5;
  if (mood === "happy") {
    ctx.beginPath();
    ctx.arc(0, 10, 5, 0.3, Math.PI - 0.3);
    ctx.stroke();
    // 舌头
    ctx.fillStyle = "#FF8A80";
    ctx.beginPath();
    ctx.ellipse(0, 12, 4, 5, 0, 0, Math.PI);
    ctx.fill();
  } else if (mood === "dragged") {
    ctx.fillStyle = "#FF8A80";
    ctx.beginPath();
    ctx.ellipse(0, 12, 5, 6, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (mood === "sleepy") {
    ctx.beginPath();
    ctx.arc(0, 10, 2.5, 0, Math.PI);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.moveTo(0, 9);
    ctx.quadraticCurveTo(-4, 14, -7, 15);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, 9);
    ctx.quadraticCurveTo(4, 14, 7, 15);
    ctx.stroke();
  }

  ctx.restore(); // 头

  // 前爪
  ctx.fillStyle = "#8D6E63";
  ctx.beginPath();
  ctx.ellipse(-10, 36, 8, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(10, 36, 8, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

// ======================== 企鹅绘制 ========================

export function drawPenguin(ctx: CanvasRenderingContext2D, state: AnimationState): void {
  const { isBlinking, lookAtX, lookAtY, idleAction } = state;
  const mood = state.currentMood;

  ctx.save();

  // 阴影
  ctx.fillStyle = "rgba(0,0,0,0.08)";
  ctx.beginPath();
  ctx.ellipse(0, 48, 24, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  // --- 身体 ---
  ctx.fillStyle = "#37474F";
  ctx.beginPath();
  ctx.ellipse(0, 10, 26, 36, 0, 0, Math.PI * 2);
  ctx.fill();

  // 肚子（白）
  ctx.fillStyle = "#ECEFF1";
  ctx.beginPath();
  ctx.ellipse(0, 15, 16, 26, 0, 0, Math.PI * 2);
  ctx.fill();

  // --- 翅膀 ---
  const wingFlap = idleAction?.type === "stretch"
    ? Math.sin(idleAction.progress * Math.PI) * 15
    : idleAction?.type === "wag_tail"
      ? Math.sin(idleAction.progress * Math.PI * 4) * 5
      : 0;

  ctx.fillStyle = "#263238";
  ctx.save();
  ctx.translate(-24, 5);
  ctx.rotate(-0.2 + wingFlap * 0.02);
  ctx.beginPath();
  ctx.ellipse(0, 0, 8, 22, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.translate(24, 5);
  ctx.rotate(0.2 - wingFlap * 0.02);
  ctx.beginPath();
  ctx.ellipse(0, 0, 8, 22, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // --- 头 ---
  const headTilt = idleAction?.type === "head_tilt" ? Math.sin(idleAction.progress * Math.PI) * 0.2 : 0;
  ctx.save();
  ctx.translate(0, -22);
  ctx.rotate(headTilt);

  ctx.fillStyle = "#263238";
  ctx.beginPath();
  ctx.arc(0, 0, 22, 0, Math.PI * 2);
  ctx.fill();

  // 眼睛
  drawEye(ctx, -7, -3, 6, 7, isBlinking, lookAtX, lookAtY);
  drawEye(ctx, 7, -3, 6, 7, isBlinking, lookAtX, lookAtY);

  // 喙
  ctx.fillStyle = "#FF8F00";
  if (mood === "happy") {
    // 开心：张嘴
    ctx.beginPath();
    ctx.moveTo(-4, 4);
    ctx.lineTo(4, 4);
    ctx.lineTo(0, 10);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#E65100";
    ctx.beginPath();
    ctx.moveTo(-2, 4);
    ctx.lineTo(2, 4);
    ctx.lineTo(0, 8);
    ctx.closePath();
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.moveTo(-4, 4);
    ctx.lineTo(4, 4);
    ctx.lineTo(0, 9);
    ctx.closePath();
    ctx.fill();
  }

  ctx.restore(); // 头

  // 脚
  ctx.fillStyle = "#FF8F00";
  ctx.beginPath();
  ctx.ellipse(-10, 42, 10, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(10, 42, 10, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

// ======================== 统一入口 ========================

export function drawPet(
  ctx: CanvasRenderingContext2D,
  type: PetType,
  state: AnimationState
): void {
  switch (type) {
    case "cat":
      drawCat(ctx, state);
      break;
    case "dog":
      drawDog(ctx, state);
      break;
    case "penguin":
      drawPenguin(ctx, state);
      break;
  }
}
