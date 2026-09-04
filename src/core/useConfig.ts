import { useEffect, useState } from "react";
import type { AppConfig } from "../../electron/preload";

/** 渲染进程在拿不到主进程配置(如纯浏览器里跑 vite)时的兜底值 */
export const DEFAULT_CONFIG: AppConfig = {
  petType: "cat",
  backgroundRunning: true,
  autoStart: false,
};

/**
 * 订阅主进程持有的全局配置(形象 / 后台运行 / 开机自启)。
 * 配置只由主进程读写持久化;任意窗口调用 setConfig 后,
 * 所有窗口都会通过 config-changed 事件收到最新值并刷新 UI。
 */
export function useConfig(): AppConfig {
  const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG);

  useEffect(() => {
    if (!window.petpet) return;
    void window.petpet.getConfig().then(setConfig);
    return window.petpet.onConfigChanged(setConfig);
  }, []);

  return config;
}
