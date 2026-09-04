import { contextBridge, ipcRenderer } from "electron";
import type { AppConfig, ConfigPatch } from "./config";
import type { TodoItem, TodoPatch } from "./todos";

/**
 * Preload 脚本:渲染进程 <-> 主进程的安全桥接(contextBridge)。
 * 只暴露白名单 API,遵循最小权限原则。
 */

export type { AppConfig, ConfigPatch } from "./config";
export type { TodoItem, TodoPatch } from "./todos";

export interface PetPetAPI {
  // ---- 宠物窗口交互 ----
  /** 按增量移动宠物窗口(拖拽) */
  dragWindow(deltaX: number, deltaY: number): void;
  /** 是否让鼠标事件穿透窗口(移出宠物后启用) */
  setIgnoreMouseEvents(ignore: boolean): void;
  /** 获取宠物窗口位置 */
  getWindowPosition(): Promise<[number, number]>;

  // ---- 全局配置(形象 / 后台运行 / 开机自启) ----
  /** 读取当前配置 */
  getConfig(): Promise<AppConfig>;
  /** 更新部分配置并持久化,返回最新配置 */
  setConfig(patch: ConfigPatch): Promise<AppConfig>;
  /** 订阅配置变更(任意窗口修改后全窗口广播) */
  onConfigChanged(callback: (config: AppConfig) => void): () => void;

  // ---- 附带功能:每日论文 ----
  /** 用系统默认浏览器打开“每日论文”网页 */
  openDailyPapers(): void;

  // ---- 附带功能:待办事项(纯文本) ----
  /** 读取全部待办 */
  getTodos(): Promise<TodoItem[]>;
  /** 新建一条待办,返回最新列表 */
  addTodo(text: string): Promise<TodoItem[]>;
  /** 更新文字或完成态,返回最新列表 */
  updateTodo(id: string, patch: TodoPatch): Promise<TodoItem[]>;
  /** 删除一条待办,返回最新列表 */
  deleteTodo(id: string): Promise<TodoItem[]>;
  /** 订阅待办变更 */
  onTodosChanged(callback: (todos: TodoItem[]) => void): () => void;

  // ---- 窗口与应用控制 ----
  /** 显示并聚焦宠物窗口 */
  showPet(): void;
  /** 隐藏宠物窗口(受“后台运行”配置约束) */
  hidePet(): void;
  /** 打开控制面板窗口 */
  openControlPanel(): void;
  /** 打开待办事项窗口 */
  openTodos(): void;
  /** 退出整个应用 */
  quit(): void;

  /** 当前平台 */
  platform: string;
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

  getConfig: () => ipcRenderer.invoke("get-config"),

  setConfig: (patch: ConfigPatch) => {
    return ipcRenderer.invoke("set-config", patch);
  },

  onConfigChanged: (callback: (config: AppConfig) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, config: AppConfig) => {
      callback(config);
    };
    ipcRenderer.on("config-changed", handler);
    return () => ipcRenderer.removeListener("config-changed", handler);
  },

  openDailyPapers: () => ipcRenderer.send("open-daily-papers"),

  getTodos: () => ipcRenderer.invoke("get-todos"),

  addTodo: (text: string) => ipcRenderer.invoke("add-todo", text),

  updateTodo: (id: string, patch: TodoPatch) => {
    return ipcRenderer.invoke("update-todo", id, patch);
  },

  deleteTodo: (id: string) => ipcRenderer.invoke("delete-todo", id),

  onTodosChanged: (callback: (todos: TodoItem[]) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, todos: TodoItem[]) => {
      callback(todos);
    };
    ipcRenderer.on("todos-changed", handler);
    return () => ipcRenderer.removeListener("todos-changed", handler);
  },

  showPet: () => ipcRenderer.send("show-pet"),

  hidePet: () => ipcRenderer.send("hide-pet"),

  openControlPanel: () => ipcRenderer.send("open-control-panel"),

  openTodos: () => ipcRenderer.send("open-todos"),

  quit: () => ipcRenderer.send("quit-app"),

  platform: process.platform,
};

contextBridge.exposeInMainWorld("petpet", api);
