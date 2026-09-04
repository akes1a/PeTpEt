/**
 * 系统开机自启封装(Electron 登录项)。
 * 注意:仅在打包安装版中可靠;开发模式下写入的是 electron.exe 而非本应用,
 * 因此调用方(主进程)负责在 app.isPackaged 时才真正写系统。
 */
import { app } from "electron";

/** 查询系统登录项中是否开启了本应用自启 */
export function isAutoStartEnabled(): boolean {
  try {
    return app.getLoginItemSettings().openAtLogin;
  } catch (err) {
    console.warn("[autostart] 查询失败:", err);
    return false;
  }
}

/** 设置系统登录项自启,返回设置后的实际状态 */
export function setAutoStartEnabled(enabled: boolean): boolean {
  try {
    app.setLoginItemSettings({ openAtLogin: enabled });
  } catch (err) {
    console.warn("[autostart] 设置失败:", err);
    return isAutoStartEnabled();
  }
  return isAutoStartEnabled();
}
