/**
 * PetPet 主进程(程序本体)。
 * 职责:应用生命周期 / 窗口管理 / 系统托盘 / IPC / 全局配置 / 开机自启 / 单实例锁。
 * 模块拆分:
 *   - config.ts    全局配置读写(userData/config.json)
 *   - autostart.ts 系统开机自启封装
 *   - preload.ts   渲染进程安全桥接
 */
import {
  app,
  BrowserWindow,
  Menu,
  Tray,
  ipcMain,
  nativeImage,
  screen,
  shell,
} from "electron";
import type { NativeImage, Rectangle } from "electron";
import * as path from "path";
import { getConfig, loadConfig, updateConfig } from "./config";
import type { AppConfig, ConfigPatch } from "./config";
import { setAutoStartEnabled } from "./autostart";
import { addTodo, deleteTodo, getTodos, updateTodo } from "./todos";
import type { TodoPatch } from "./todos";

// ==================== 常量与状态 ====================

const DEV_SERVER = "http://localhost:5173";
const isDev = process.env.NODE_ENV === "development" || !app.isPackaged;
/** “每日论文”网页(浏览器打开) */
const DAILY_PAPERS_URL = "https://akes1a.github.io/daily-arXiv-ai-enhanced/";
/** “流程画板”网页(浏览器打开) */
const FLOW_BOARD_URL = "https://excalidraw.com/";
/** AI 助手网页(浏览器打开) */
const CHATGPT_URL = "https://chatgpt.com/";
const DEEPSEEK_URL = "https://chat.deepseek.com/";

let petWindow: BrowserWindow | null = null;
let panelWindow: BrowserWindow | null = null;
let todosWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let menuDismissWindows: BrowserWindow[] = [];

// ==================== 图标 ====================

function appIcon(): NativeImage {
  const img = nativeImage.createFromPath(
    path.join(__dirname, "../resources/icon.png"),
  );
  return img.isEmpty() ? nativeImage.createEmpty() : img;
}

function trayIcon(): NativeImage {
  const img = appIcon();
  return img.isEmpty() ? img : img.resize({ width: 16, height: 16 });
}

// ==================== 配置 ====================

/** 配置变更的落地动作:持久化 + 系统自启同步 + 全窗口广播 + 刷新托盘 */
function applyConfigChange(patch: ConfigPatch): AppConfig {
  const next = updateConfig(patch);

  if (patch.autoStart !== undefined) {
    if (app.isPackaged) {
      setAutoStartEnabled(next.autoStart);
    } else {
      console.info("[autostart] 开发模式:仅记录配置,打包安装后写入系统登录项");
    }
  }

  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) {
      win.webContents.send("config-changed", next);
    }
  }
  updateTrayMenu();
  return next;
}

// ==================== 宠物窗口 ====================

function loadView(win: BrowserWindow, view: "pet" | "panel" | "todos"): void {
  if (isDev) {
    void win.loadURL(`${DEV_SERVER}/?view=${view}`);
  } else {
    void win.loadFile(path.join(__dirname, "../dist/index.html"), {
      query: { view },
    });
  }
}

function createPetWindow(): BrowserWindow {
  const { width: screenWidth } = screen.getPrimaryDisplay().workAreaSize;
  const win = new BrowserWindow({
    width: 200,
    height: 200,
    x: screenWidth - 220,
    y: 100,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    hasShadow: false,
    type: "toolbar",
    icon: appIcon(),
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  petWindow = win;
  loadView(win, "pet");
  if (isDev) {
    win.webContents.openDevTools({ mode: "detach" });
  }
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  win.on("closed", () => {
    closeMenuDismissWindows();
    if (petWindow === win) petWindow = null;
  });
  return win;
}

function showPetWindow(): void {
  if (!petWindow || petWindow.isDestroyed()) createPetWindow();
  if (!petWindow) return;
  petWindow.show();
  petWindow.focus();
}

function hidePetWindow(): void {
  closeMenuDismissWindows();
  if (petWindow && !petWindow.isDestroyed()) {
    petWindow.hide();
  }
  // “后台运行”关闭时:宠物被藏起且无其它可见窗口 -> 直接退出
  if (!getConfig().backgroundRunning && !isPanelVisible()) {
    app.quit();
  }
}

// ==================== 右键菜单全屏点击取消 ====================

const MENU_DISMISS_PAGE = `data:text/html;charset=UTF-8,${encodeURIComponent(`
<!doctype html>
<html>
  <head>
    <meta charset="UTF-8">
    <style>html, body { width: 100%; height: 100%; margin: 0; background: transparent; }</style>
  </head>
  <body>
    <script>
      document.addEventListener("mousedown", (event) => {
        if (event.button === 0) window.petpet.requestContextMenuDismiss();
      });
    </script>
  </body>
</html>
`)}`;

function getDesktopBounds(): Rectangle {
  const displays = screen.getAllDisplays();
  const left = Math.min(...displays.map((display) => display.bounds.x));
  const top = Math.min(...displays.map((display) => display.bounds.y));
  const right = Math.max(...displays.map((display) => display.bounds.x + display.bounds.width));
  const bottom = Math.max(...displays.map((display) => display.bounds.y + display.bounds.height));
  return { x: left, y: top, width: right - left, height: bottom - top };
}

/** 将整个桌面切成宠物窗口四周的矩形，留下宠物自身区域供菜单正常交互。 */
function getOutsidePetBounds(desktop: Rectangle, pet: Rectangle): Rectangle[] {
  const desktopRight = desktop.x + desktop.width;
  const desktopBottom = desktop.y + desktop.height;
  const petLeft = Math.max(desktop.x, pet.x);
  const petTop = Math.max(desktop.y, pet.y);
  const petRight = Math.min(desktopRight, pet.x + pet.width);
  const petBottom = Math.min(desktopBottom, pet.y + pet.height);

  if (petLeft >= petRight || petTop >= petBottom) return [desktop];

  return [
    { x: desktop.x, y: desktop.y, width: desktop.width, height: petTop - desktop.y },
    { x: desktop.x, y: petBottom, width: desktop.width, height: desktopBottom - petBottom },
    { x: desktop.x, y: petTop, width: petLeft - desktop.x, height: petBottom - petTop },
    { x: petRight, y: petTop, width: desktopRight - petRight, height: petBottom - petTop },
  ].filter((bounds) => bounds.width > 0 && bounds.height > 0);
}

function closeMenuDismissWindows(): void {
  const windows = menuDismissWindows;
  menuDismissWindows = [];
  for (const win of windows) {
    if (!win.isDestroyed()) win.destroy();
  }
}

function openMenuDismissWindows(): void {
  closeMenuDismissWindows();
  if (!petWindow || petWindow.isDestroyed()) return;

  const outsideBounds = getOutsidePetBounds(getDesktopBounds(), petWindow.getBounds());
  for (const bounds of outsideBounds) {
    const win = new BrowserWindow({
      ...bounds,
      show: false,
      frame: false,
      transparent: true,
      alwaysOnTop: true,
      skipTaskbar: true,
      resizable: false,
      movable: false,
      hasShadow: false,
      backgroundColor: "#00000000",
      webPreferences: {
        preload: path.join(__dirname, "preload.cjs"),
        contextIsolation: true,
        nodeIntegration: false,
      },
    });

    menuDismissWindows.push(win);
    win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
    win.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
    win.on("closed", () => {
      menuDismissWindows = menuDismissWindows.filter((candidate) => candidate !== win);
    });
    void win.loadURL(MENU_DISMISS_PAGE).then(() => {
      if (!win.isDestroyed()) win.showInactive();
    });
  }

  // 捕获层与宠物不重叠；再次置顶可确保菜单维持在最前方。
  petWindow.moveTop();
}

function isPanelVisible(): boolean {
  return Boolean(panelWindow && !panelWindow.isDestroyed() && panelWindow.isVisible());
}

// ==================== 控制面板窗口 ====================

function createPanelWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 460,
    height: 620,
    title: "PetPet · 控制面板",
    resizable: false,
    maximizable: false,
    fullscreenable: false,
    autoHideMenuBar: true,
    backgroundColor: "#f4f6fb",
    icon: appIcon(),
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  panelWindow = win;
  loadView(win, "panel");
  win.on("closed", () => {
    if (panelWindow === win) panelWindow = null;
    // “后台运行”关闭时:面板关掉且宠物不可见 -> 直接退出
    if (!getConfig().backgroundRunning && !(petWindow && !petWindow.isDestroyed() && petWindow.isVisible())) {
      app.quit();
    }
  });
  return win;
}

function openControlPanel(): void {
  if (!panelWindow || panelWindow.isDestroyed()) {
    createPanelWindow();
  }
  if (!panelWindow) return;
  panelWindow.show();
  panelWindow.focus();
}

// ==================== 待办事项窗口 ====================

function createTodosWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 420,
    height: 560,
    minWidth: 340,
    minHeight: 420,
    title: "PetPet · 待办事项",
    autoHideMenuBar: true,
    backgroundColor: "#f4f6fb",
    icon: appIcon(),
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  todosWindow = win;
  loadView(win, "todos");
  win.on("closed", () => {
    if (todosWindow === win) todosWindow = null;
    // “后台运行”关闭时:待办窗口关掉且宠物不可见 -> 直接退出
    if (!getConfig().backgroundRunning && !(petWindow && !petWindow.isDestroyed() && petWindow.isVisible())) {
      app.quit();
    }
  });
  return win;
}

function openTodosWindow(): void {
  if (!todosWindow || todosWindow.isDestroyed()) {
    createTodosWindow();
  }
  if (!todosWindow) return;
  todosWindow.show();
  todosWindow.focus();
}

/** 待办变更后向所有窗口广播(便于未来多处编辑时保持同步) */
function broadcastTodos(): void {
  const todos = getTodos();
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) {
      win.webContents.send("todos-changed", todos);
    }
  }
}

// ==================== 系统托盘 ====================

function updateTrayMenu(): void {
  if (!tray) return;
  const cfg = getConfig();
  tray.setToolTip("PetPet · 桌面宠物");
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: "显示宠物", click: showPetWindow },
      { label: "隐藏宠物", click: hidePetWindow },
      { type: "separator" },
      { label: "待办事项", click: openTodosWindow },
      { label: "每日论文", click: () => void shell.openExternal(DAILY_PAPERS_URL) },
      { label: "流程画板", click: () => void shell.openExternal(FLOW_BOARD_URL) },
      { label: "GPT", click: () => void shell.openExternal(CHATGPT_URL) },
      { label: "DeepSeek", click: () => void shell.openExternal(DEEPSEEK_URL) },
      { type: "separator" },
      { label: "控制面板", click: openControlPanel },
      { type: "separator" },
      {
        label: "开机自启",
        type: "checkbox",
        checked: cfg.autoStart,
        click: (item) => {
          void applyConfigChange({ autoStart: item.checked });
        },
      },
      { type: "separator" },
      { label: "退出", click: () => app.quit() },
    ]),
  );
}

function createTray(): void {
  tray = new Tray(trayIcon());
  updateTrayMenu();
  // 左键单击:显示 / 隐藏宠物(隐藏动作遵循“后台运行”语义)
  tray.on("click", () => {
    if (petWindow && !petWindow.isDestroyed() && petWindow.isVisible()) {
      hidePetWindow();
    } else {
      showPetWindow();
    }
  });
}

// ==================== IPC ====================

function registerIpc(): void {
  ipcMain.on("window-drag", (_event, delta: { deltaX: number; deltaY: number }) => {
    if (!petWindow || petWindow.isDestroyed()) return;
    const [x, y] = petWindow.getPosition();
    petWindow.setPosition(x + delta.deltaX, y + delta.deltaY);
  });

  ipcMain.on("set-ignore-mouse-events", (_event, ignore: boolean) => {
    petWindow?.setIgnoreMouseEvents(Boolean(ignore), { forward: true });
  });

  ipcMain.on("set-context-menu-open", (event, open: boolean) => {
    if (!petWindow || event.sender !== petWindow.webContents) return;
    if (open) openMenuDismissWindows();
    else closeMenuDismissWindows();
  });

  ipcMain.on("request-context-menu-dismiss", (event) => {
    const isDismissWindow = menuDismissWindows.some((win) => win.webContents === event.sender);
    if (!isDismissWindow) return;
    closeMenuDismissWindows();
    petWindow?.webContents.send("dismiss-context-menu");
  });

  ipcMain.handle("get-window-position", () => {
    return petWindow?.getPosition() ?? [0, 0];
  });

  ipcMain.handle("get-config", () => getConfig());

  ipcMain.handle("set-config", (_event, patch: ConfigPatch) => {
    return applyConfigChange(patch ?? {});
  });

  // ---- 附带功能:外部网页 / 待办事项 ----
  ipcMain.on("open-daily-papers", () => {
    void shell.openExternal(DAILY_PAPERS_URL);
  });

  ipcMain.on("open-flow-board", () => {
    void shell.openExternal(FLOW_BOARD_URL);
  });

  ipcMain.on("open-chatgpt", () => {
    void shell.openExternal(CHATGPT_URL);
  });

  ipcMain.on("open-deepseek", () => {
    void shell.openExternal(DEEPSEEK_URL);
  });

  ipcMain.handle("get-todos", () => getTodos());

  ipcMain.handle("add-todo", (_event, text: string) => {
    const list = addTodo(typeof text === "string" ? text : "");
    broadcastTodos();
    return list;
  });

  ipcMain.handle("update-todo", (_event, id: string, patch: TodoPatch) => {
    const list = updateTodo(typeof id === "string" ? id : "", patch ?? {});
    broadcastTodos();
    return list;
  });

  ipcMain.handle("delete-todo", (_event, id: string) => {
    const list = deleteTodo(typeof id === "string" ? id : "");
    broadcastTodos();
    return list;
  });

  ipcMain.on("show-pet", showPetWindow);
  ipcMain.on("hide-pet", hidePetWindow);
  ipcMain.on("open-control-panel", openControlPanel);
  ipcMain.on("open-todos", openTodosWindow);
  ipcMain.on("quit-app", () => app.quit());
}

// ==================== 生命周期 ====================

function bootstrap(): void {
  // 1. 读取配置,并让系统登录项与配置一致(仅打包版)
  loadConfig();
  if (app.isPackaged) {
    setAutoStartEnabled(getConfig().autoStart);
  }

  // 2. 去掉默认应用菜单(托盘菜单 / 自定义右键菜单已足够)
  Menu.setApplicationMenu(null);

  // 3. 注册 IPC
  registerIpc();

  // 4. 创建宠物窗口与托盘
  createPetWindow();
  createTray();

  app.on("activate", () => {
    // macOS Dock 点击恢复
    if (BrowserWindow.getAllWindows().length === 0) createPetWindow();
    else showPetWindow();
  });
}

// 单实例锁:双击 exe / 再次启动时聚焦已有实例,而不是开第二只宠物
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on("second-instance", () => {
    showPetWindow();
  });

  app.whenReady().then(() => {
    bootstrap();
  });
}

app.on("window-all-closed", () => {
  // 后台运行开启:窗口全部关闭后驻留系统托盘,不退出(Win/Linux 桌面宠物常驻)
  if (!getConfig().backgroundRunning) {
    app.quit();
  }
});

app.on("before-quit", () => {
  closeMenuDismissWindows();
  tray?.destroy();
  tray = null;
});
