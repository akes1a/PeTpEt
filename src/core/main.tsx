import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// 主进程通过 URL query 决定窗口用途:
//   ?view=pet    -> 桌面宠物悬浮窗(默认,保持透明)
//   ?view=panel  -> 控制面板窗口
//   ?view=todos  -> 待办事项窗口
const params = new URLSearchParams(window.location.search);
const view = (params.get("view") as "pet" | "panel" | "todos" | null) ?? "pet";

// 功能窗口(控制面板/待办)是普通窗口,需要不透明、可滚动的底色;宠物窗口保持透明
if (view !== "pet") {
  document.documentElement.classList.add("view-panel");
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App view={view} />
  </StrictMode>,
);
