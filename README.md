# PetPet

一款轻量的 Windows 桌面电子宠物。宠物以透明、无边框、置顶窗口常驻桌面，支持鼠标互动、动画反馈、形象切换、系统托盘、开机自启和本地待办事项。

> 当前版本：`0.1.0`。项目以 Windows 为主要运行平台。

## 功能特性

### 桌面宠物

- 提供猫咪、小狗、企鹅三种形象，全部使用 Canvas 2D 程序化绘制。
- 透明无边框窗口、始终置顶，并从任务栏隐藏。
- 支持拖动宠物移动窗口，释放后带有惯性效果。
- 单击宠物会触发弹跳和爱心动画，双击会进入惊讶状态并产生更多爱心。
- 宠物视线会跟随鼠标移动。
- 包含呼吸、眨眼、摇尾巴、歪头、打哈欠、伸懒腰等动画。
- 长时间没有互动时会进入睡眠状态，并显示 `Zzz` 效果；再次点击即可唤醒。
- 窗口透明区域支持鼠标穿透，尽量减少对桌面操作的干扰。

### 控制面板

- 在猫咪、小狗和企鹅之间切换，修改后立即同步到宠物窗口。
- 控制是否在系统托盘中后台运行。
- 勾选或取消 Windows 开机自启动。
- 快速显示、隐藏宠物或退出程序。
- 配置自动保存在 Electron 的 `userData/config.json` 中。

### 待办事项

- 使用独立窗口展示待办列表。
- 支持新增、完成、取消完成、编辑和删除待办。
- 待办内容最多 200 个字符。
- 数据保存在本机 Electron 用户数据目录下的 `todos.json`，不需要数据库和网络服务。

### 系统集成

- 系统托盘菜单可显示或隐藏宠物、打开待办事项、打开控制面板、设置开机自启和退出程序。
- 单击托盘图标可快速切换宠物的显示状态。
- 单实例运行：重复启动程序时会唤回已有宠物，不会创建多个实例。
- “每日论文”入口会使用系统默认浏览器打开 [Daily arXiv AI Enhanced](https://akes1a.github.io/daily-arXiv-ai-enhanced/)。
- 提供 Windows x64 NSIS 安装包配置，可选择安装位置并创建桌面快捷方式。

## 使用方式

### 宠物窗口

| 操作 | 效果 |
| --- | --- |
| 单击宠物 | 弹跳并显示爱心 |
| 双击宠物 | 进入惊讶状态并显示一组爱心 |
| 按住并拖动 | 移动宠物窗口 |
| 移动鼠标 | 宠物视线跟随鼠标 |
| 右键宠物 | 打开快捷菜单 |

宠物右键菜单提供“每日论文”“待办事项”“控制面板”和“退出程序”入口。宠物形象及运行选项统一在控制面板中管理。

### 开机自启

安装 PetPet 后，可通过以下任一入口勾选“开机自启”：

1. 右键宠物，打开“控制面板”，在“运行设置”中开启。
2. 右键 Windows 系统托盘中的 PetPet 图标，勾选“开机自启”。

开机自启仅在打包后的安装版中写入 Windows 登录项。开发模式只保存配置，不会把 `electron.exe` 注册为启动项。

## 本地开发

### 环境要求

- Windows 10/11
- Node.js 22 或更高版本
- npm

### 安装与启动

```bash
git clone https://github.com/akes1a/PeTpEt.git
cd PeTpEt
npm install
npm run dev:electron
```

`npm run dev:electron` 会先编译 Electron 主进程，然后同时启动 Vite 开发服务器和 Electron 桌面程序。开发模式下会自动打开 DevTools。

如果只需要查看 React 页面，可以运行：

```bash
npm run dev
```

然后访问 `http://localhost:5173`。纯浏览器模式无法使用窗口拖动、系统托盘、开机自启和本地文件持久化等 Electron 能力。

## 构建与打包

```bash
# 检查代码
npm run lint

# 构建 React 前端
npm run build

# 构建 Electron 主进程和预加载脚本
npm run build:electron

# 构建全部生产文件
npm run build:all

# 生成 Windows x64 NSIS 安装程序
npm run dist:win

# 生成解压目录，不制作安装程序
npm run pack
```

Windows 安装包默认输出到：

```text
release/PetPet Setup 0.1.0.exe
```

未配置代码签名证书时，Windows 首次运行安装包可能显示 SmartScreen 提示。

## 项目结构

```text
petpet/
├─ electron/                     # Electron 主进程
│  ├─ main.ts                    # 生命周期、窗口、托盘、IPC、单实例
│  ├─ preload.ts                 # contextBridge 安全 API
│  ├─ config.ts                  # 应用配置持久化
│  ├─ autostart.ts               # Windows 登录启动项
│  └─ todos.ts                   # 本地待办数据读写
├─ src/
│  ├─ core/                      # React 入口、视图分发、全局配置 Hook
│  ├─ pet/
│  │  ├─ PetCanvas.tsx           # 宠物交互与右键菜单
│  │  └─ engine/                 # 动画状态机和 Canvas 绘制引擎
│  └─ features/
│     ├─ control-panel/          # 控制面板
│     └─ todos/                  # 待办事项界面
├─ resources/                    # 应用图标等打包资源
├─ scripts/                      # Electron 构建辅助脚本
└─ package.json                  # 依赖、脚本与 electron-builder 配置
```

## 技术栈

- Electron 43
- React 19
- TypeScript 6
- Vite 8
- Canvas 2D
- electron-builder / NSIS
- Oxlint

## 当前限制与后续方向

当前版本聚焦桌宠核心体验和轻量待办，以下能力尚未实现：

- 日历、日程管理和定时提醒。
- 待办优先级、截止日期、筛选和拖动排序。
- 自动抓取 arXiv 论文、PDF 下载及 LLM 中文摘要。
- 自动更新和正式代码签名。
- macOS 与 Linux 的完整适配和测试。

更详细的开发记录可查看 [DEVLOG.md](./DEVLOG.md)。

## License

本项目基于 [MIT License](./LICENSE) 开源。
