/**
 * 宠物动画引擎 - 管理所有动画状态
 */
import type {
  AnimationState,
  PetMood,
  IdleAction,
  HeartEffect,
} from "./types";
import { IDLE_ACTIONS } from "./types";

const IDLE_ACTION_COOLDOWN_MIN = 3000;  // 小动作最小间隔
const IDLE_ACTION_COOLDOWN_MAX = 10000; // 小动作最大间隔
const SLEEPY_THRESHOLD = 30000;          // 30秒无交互进入打盹
const BLINK_INTERVAL_MIN = 2000;
const BLINK_INTERVAL_MAX = 6000;

let heartIdCounter = 0;

export function createAnimationState(): AnimationState {
  return {
    breathPhase: 0,
    bounceOffset: 0,
    bounceVelocity: 0,
    idleAction: null,
    idleActionTimer: 0,
    tailWagPhase: 0,
    tailWagAmplitude: 0,
    eyeBlinkTimer: 2000 + Math.random() * 4000,
    isBlinking: false,
    moodTransition: 1,
    currentMood: "idle",
    targetMood: "idle",
    hearts: [],
    lookAtX: 0,
    lookAtY: 0,
    dragVelocityX: 0,
    dragVelocityY: 0,
    isDragging: false,
    time: 0,
  };
}

export function updateAnimation(
  state: AnimationState,
  dt: number,
  lastInteractionTime: number,
  mouseX: number,
  mouseY: number
): void {
  state.time += dt;

  // 呼吸：周期约 3 秒
  state.breathPhase = Math.sin(state.time / 500) * 0.12;

  // 弹跳物理（点击后的阻尼弹簧）
  if (Math.abs(state.bounceOffset) > 0.01 || Math.abs(state.bounceVelocity) > 0.01) {
    state.bounceVelocity += -state.bounceOffset * 0.3 - state.bounceVelocity * 0.15;
    state.bounceOffset += state.bounceVelocity;
    if (Math.abs(state.bounceOffset) < 0.05 && Math.abs(state.bounceVelocity) < 0.05) {
      state.bounceOffset = 0;
      state.bounceVelocity = 0;
    }
  }

  // 情绪过渡
  if (state.currentMood !== state.targetMood) {
    state.moodTransition += dt / 300; // 300ms 过渡
    if (state.moodTransition >= 1) {
      state.moodTransition = 1;
      state.currentMood = state.targetMood;
    }
  } else {
    state.moodTransition = Math.max(0, state.moodTransition - dt / 2000); // 自动回到 idle
  }

  // 自动回到 idle
  if (state.currentMood !== "idle" && state.moodTransition < 0.01) {
    state.targetMood = "idle";
  }

  // 闲置检测 → 打盹
  const idleTime = state.time - lastInteractionTime;
  if (idleTime > SLEEPY_THRESHOLD && state.currentMood === "idle" && state.targetMood === "idle") {
    state.targetMood = "sleepy";
  }

  // 眨眼
  state.eyeBlinkTimer -= dt;
  if (state.eyeBlinkTimer <= 0) {
    state.isBlinking = true;
    if (state.eyeBlinkTimer <= -150) {
      // 眨眼结束
      state.isBlinking = false;
      state.eyeBlinkTimer = BLINK_INTERVAL_MIN + Math.random() * (BLINK_INTERVAL_MAX - BLINK_INTERVAL_MIN);
    }
  }

  // 尾巴摇摆
  state.tailWagPhase += dt / 200; // 速度
  if (state.tailWagAmplitude > 0.01) {
    state.tailWagAmplitude *= 0.995; // 衰减
  }

  // 随机小动作
  if (state.idleAction) {
    state.idleAction.progress = Math.min(
      1,
      (state.time - state.idleAction.startTime) / state.idleAction.duration
    );
    if (state.idleAction.progress >= 1) {
      state.idleAction = null;
      state.idleActionTimer = IDLE_ACTION_COOLDOWN_MIN + Math.random() * (IDLE_ACTION_COOLDOWN_MAX - IDLE_ACTION_COOLDOWN_MIN);
    }
  } else if (state.currentMood === "idle") {
    state.idleActionTimer -= dt;
    if (state.idleActionTimer <= 0) {
      // 随机选择小动作（加权）
      const totalWeight = IDLE_ACTIONS.reduce((s, a) => s + a.weight, 0);
      let r = Math.random() * totalWeight;
      for (const action of IDLE_ACTIONS) {
        r -= action.weight;
        if (r <= 0) {
          state.idleAction = {
            type: action.type,
            startTime: state.time,
            duration: action.duration,
            progress: 0,
          };
          break;
        }
      }
      // 如果抽到 blink 但已经在眨眼，重新计时
      if (state.idleAction?.type === "blink") {
        state.isBlinking = true;
        state.eyeBlinkTimer = state.idleAction.duration;
      }
      if (state.idleAction?.type === "wag_tail") {
        state.tailWagAmplitude = 0.6 + Math.random() * 0.4;
      }
    }
  }

  // 爱心特效更新
  state.hearts = state.hearts.filter((h) => {
    h.life += dt / 1200; // 1.2 秒生命周期
    h.y -= h.vy * dt / 16;
    h.vy *= 0.98;
    h.opacity = 1 - h.life;
    h.size = h.size * (1 + dt / 2000);
    return h.life < 1;
  });

  // 视线跟踪（平滑）
  const targetLookX = Math.max(-1, Math.min(1, mouseX * 2));
  const targetLookY = Math.max(-1, Math.min(1, mouseY * 2));
  state.lookAtX += (targetLookX - state.lookAtX) * dt / 200;
  state.lookAtY += (targetLookY - state.lookAtY) * dt / 200;
}

export function triggerBounce(state: AnimationState): void {
  state.bounceVelocity = -8;
  state.bounceOffset = 0;
  state.tailWagAmplitude = 1;
  state.targetMood = "happy";
}

export function triggerDrag(state: AnimationState, vx: number, vy: number): void {
  state.isDragging = true;
  state.dragVelocityX = vx;
  state.dragVelocityY = vy;
  state.targetMood = "dragged";
}

export function releaseDrag(state: AnimationState): void {
  state.isDragging = false;
  state.targetMood = "idle";
}

export function spawnHeart(state: AnimationState, x: number, y: number): void {
  state.hearts.push({
    id: heartIdCounter++,
    x,
    y,
    life: 0,
    size: 8 + Math.random() * 8,
    opacity: 1,
    vy: 1 + Math.random() * 2,
  });
}

export function getEffectiveMood(state: AnimationState): PetMood {
  if (state.moodTransition >= 0.5) return state.targetMood;
  return state.currentMood;
}
