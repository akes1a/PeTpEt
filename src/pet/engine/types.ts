/**
 * 宠物渲染引擎 - 类型定义
 */

export type PetType = "cat" | "dog" | "penguin";

// 宠物状态机
export type PetMood =
  | "idle"        // 待机
  | "happy"       // 开心（点击后）
  | "dragged"     // 被拖拽中
  | "sleepy"      // 打盹（闲置过久）
  | "surprised";  // 惊讶（双击）

// 动画轨道（可同时叠加）
export interface AnimationState {
  // 呼吸（持续循环）
  breathPhase: number;       // 0-1，正弦波相位
  // 弹跳偏移（点击后衰减）
  bounceOffset: number;
  bounceVelocity: number;
  // 小动作触发
  idleAction: IdleAction | null;
  idleActionTimer: number;   // 当前小动作剩余时间 ms
  // 尾巴摇摆
  tailWagPhase: number;
  tailWagAmplitude: number;
  // 眼睛眨眼
  eyeBlinkTimer: number;
  isBlinking: boolean;
  // 表情过渡
  moodTransition: number;    // 0-1，当前表情到目标表情的插值
  currentMood: PetMood;
  targetMood: PetMood;
  // 爱心特效
  hearts: HeartEffect[];
  // 视线跟踪
  lookAtX: number;           // -1 到 1，视线偏移
  lookAtY: number;
  // 拖拽惯性
  dragVelocityX: number;
  dragVelocityY: number;
  isDragging: boolean;
  // 总时间
  time: number;
}

export interface HeartEffect {
  id: number;
  x: number;
  y: number;
  life: number;       // 0-1 生命周期
  size: number;
  opacity: number;
  vy: number;          // 上升速度
}

export interface IdleAction {
  type: "blink" | "wag_tail" | "head_tilt" | "yawn" | "stretch" | "look_around";
  startTime: number;
  duration: number;
  progress: number;     // 0-1
}

// 随机小动作配置
export const IDLE_ACTIONS: { type: IdleAction["type"]; duration: number; weight: number }[] = [
  { type: "blink", duration: 200, weight: 3 },
  { type: "wag_tail", duration: 800, weight: 4 },
  { type: "head_tilt", duration: 1200, weight: 2 },
  { type: "yawn", duration: 1500, weight: 1 },
  { type: "stretch", duration: 1800, weight: 1 },
  { type: "look_around", duration: 1000, weight: 2 },
];
