/**
 * 全局配置(主进程唯一持有并持久化到 userData/config.json)。
 * 渲染进程通过 preload 暴露的 getConfig / setConfig 访问。
 */
import { app } from "electron";
import * as fs from "fs";
import * as path from "path";

/** 内置形象(当前为程序化绘制角色;后续接入图片资产时扩展 id 即可) */
export type PetType = "cat" | "dog" | "penguin";
export const PET_TYPES: PetType[] = ["cat", "dog", "penguin"];

export interface AppConfig {
  petType: PetType;
  /**
   * 后台运行(托盘常驻):
   * true  -> 隐藏宠物 / 关闭控制面板后,应用驻留系统托盘继续运行;
   * false -> 当没有任何可见窗口(宠物被隐藏、面板被关闭)时直接退出程序。
   */
  backgroundRunning: boolean;
  /** 开机自启:仅打包安装版会对系统登录项生效 */
  autoStart: boolean;
}

export type ConfigPatch = Partial<AppConfig>;

const DEFAULTS: AppConfig = {
  petType: "cat",
  backgroundRunning: true,
  autoStart: false,
};

let cached: AppConfig | null = null;

function configFilePath(): string {
  return path.join(app.getPath("userData"), "config.json");
}

/** 从任意输入中挑出合法字段,非法/缺失字段一律忽略 */
function sanitize(patch: unknown): ConfigPatch {
  const out: ConfigPatch = {};
  if (patch && typeof patch === "object") {
    const p = patch as Record<string, unknown>;
    if (typeof p.petType === "string" && PET_TYPES.includes(p.petType as PetType)) {
      out.petType = p.petType as PetType;
    }
    if (typeof p.backgroundRunning === "boolean") out.backgroundRunning = p.backgroundRunning;
    if (typeof p.autoStart === "boolean") out.autoStart = p.autoStart;
  }
  return out;
}

/** 首次调用时从磁盘读取并校验(损坏/缺失则回落默认值) */
export function loadConfig(): AppConfig {
  if (cached) return cached;
  let stored: ConfigPatch = {};
  try {
    stored = sanitize(JSON.parse(fs.readFileSync(configFilePath(), "utf-8")));
  } catch {
    // 首次运行或文件损坏:使用默认配置
  }
  cached = { ...DEFAULTS, ...stored };
  return { ...cached };
}

/** 返回当前配置副本(确保已加载) */
export function getConfig(): AppConfig {
  return cached ? { ...cached } : loadConfig();
}

/** 合并部分更新并立即落盘,返回最新配置副本 */
export function updateConfig(patch: ConfigPatch): AppConfig {
  const next: AppConfig = { ...getConfig(), ...sanitize(patch) };
  cached = next;
  try {
    fs.mkdirSync(path.dirname(configFilePath()), { recursive: true });
    fs.writeFileSync(configFilePath(), JSON.stringify(next, null, 2), "utf-8");
  } catch (err) {
    console.warn("[config] 保存配置失败:", err);
  }
  return { ...next };
}
