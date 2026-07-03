import {
  app,
  BrowserWindow,
  Tray,
  Menu,
  nativeImage,
  ipcMain,
  screen,
  globalShortcut,
} from "electron";
import * as path from "path";

// 开发模式判断
const isDev = process.env.NODE_ENV === "development" || !app.isPackaged;

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;

function createPetWindow(): void {
  const { width: screenWidth } = screen.getPrimaryDisplay().workAreaSize;

  mainWindow = new BrowserWindow({
    width: 200,
    height: 200,
    x: screenWidth - 220,
    y: 100,
    frame: false,           // 无边框
    transparent: true,       // 透明背景
    alwaysOnTop: true,       // 窗口置顶
    skipTaskbar: true,       // 不在任务栏显示
    resizable: false,
    hasShadow: false,
    type: "toolbar",         // 在 Windows 上确保置顶
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // 加载页面
  if (isDev) {
    mainWindow.loadURL("http://localhost:5173");
    mainWindow.webContents.openDevTools({ mode: "detach" });
  } else {
    mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  }

  // 设置窗口不可被大多数方式聚焦，但允许鼠标事件
  mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

function createTray(): void {
  // 创建一个 16x16 的托盘图标（使用简单的 1x1 像素占位，后续替换为实际图标）
  const icon = nativeImage.createEmpty();
  tray = new Tray(icon);

  const contextMenu = Menu.buildFromTemplate([
    {
      label: "显示宠物",
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      },
    },
    {
      label: "隐藏宠物",
      click: () => {
        if (mainWindow) {
          mainWindow.hide();
        }
      },
    },
    { type: "separator" },
    {
      label: "日程管理",
      click: () => {
        // TODO: 打开日程窗口
        if (mainWindow) {
          mainWindow.webContents.send("navigate", "calendar");
          mainWindow.show();
          mainWindow.focus();
        }
      },
    },
    {
      label: "待办事项",
      click: () => {
        // TODO: 打开待办窗口
        if (mainWindow) {
          mainWindow.webContents.send("navigate", "todos");
          mainWindow.show();
          mainWindow.focus();
        }
      },
    },
    {
      label: "Paper Reading",
      click: () => {
        if (mainWindow) {
          mainWindow.webContents.send("navigate", "papers");
          mainWindow.show();
          mainWindow.focus();
        }
      },
    },
    { type: "separator" },
    {
      label: "设置",
      click: () => {
        if (mainWindow) {
          mainWindow.webContents.send("navigate", "settings");
          mainWindow.show();
          mainWindow.focus();
        }
      },
    },
    {
      label: "退出",
      click: () => {
        app.quit();
      },
    },
  ]);

  tray.setToolTip("PetPet - 桌面宠物");
  tray.setContextMenu(contextMenu);

  tray.on("double-click", () => {
    if (mainWindow) {
      mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show();
    }
  });
}

// IPC 处理：窗口拖拽
ipcMain.on("window-drag", (event, { deltaX, deltaY }) => {
  if (mainWindow) {
    const [x, y] = mainWindow.getPosition();
    mainWindow.setPosition(x + deltaX, y + deltaY);
  }
});

// IPC 处理：设置鼠标穿透
ipcMain.on("set-ignore-mouse-events", (_event, ignore: boolean) => {
  if (mainWindow) {
    mainWindow.setIgnoreMouseEvents(ignore, { forward: true });
  }
});

// IPC 处理：获取窗口位置
ipcMain.handle("get-window-position", () => {
  if (mainWindow) {
    return mainWindow.getPosition();
  }
  return [0, 0];
});

app.whenReady().then(() => {
  createPetWindow();
  createTray();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createPetWindow();
    }
  });
});

app.on("window-all-closed", () => {
  // 在 macOS 上不退出，Windows/Linux 上退出
  if (process.platform !== "darwin") {
    // 不自动退出，托盘保持运行
  }
});

app.on("before-quit", () => {
  if (tray) {
    tray.destroy();
    tray = null;
  }
});
