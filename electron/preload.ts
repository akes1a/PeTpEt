import { contextBridge, ipcRenderer } from "electron";

/**
 * Preload 脚本：在渲染进程和主进程之间建立安全的桥接
 * 只暴露必要的 API，遵循最小权限原则
 */

export interface PetPetAPI {
  // 窗口拖拽
  dragWindow: (deltaX: number, deltaY: number) => void;
  // 鼠标穿透控制
  setIgnoreMouseEvents: (ignore: boolean) => void;
  // 获取窗口位置
  getWindowPosition: () => Promise<[number, number]>;
  // 监听主进程导航事件
  onNavigate: (callback: (page: string) => void) => () => void;
  // 平台信息
  platform: NodeJS.Platform;
}

const api: PetPetAPI = {
  dragWindow: (deltaX: number, deltaY: number) => {
    ipcRenderer.send("window-drag", { deltaX, deltaY });
  },

  setIgnoreMouseEvents: (ignore: boolean) => {
    ipcRenderer.send("set-ignore-mouse-events", ignore);
  },

  getWindowPosition: () => {
    return ipcRenderer.invoke("get-window-position");
  },

  onNavigate: (callback: (page: string) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, page: string) => {
      callback(page);
    };
    ipcRenderer.on("navigate", handler);
    return () => {
      ipcRenderer.removeListener("navigate", handler);
    };
  },

  platform: process.platform,
};

contextBridge.exposeInMainWorld("petpet", api);
