# PetPet - 桌面宠物程序

> 一个开源的 Windows 桌面宠物，兼具日程管理、待办提醒和 Arxiv 论文速读功能。

## 🎯 项目目标

在桌面上养一只可爱的小宠物，它不只是好看——还能帮你管理日程、提醒待办、每天自动拉取 Arxiv 论文并生成中文摘要。

## 📦 技术栈

| 层级 | 技术 | 说明 |
|------|------|------|
| 桌面框架 | Electron 43 | 透明无边框窗口、系统托盘、跨平台 |
| 前端 | React 19 + Vite 8 | 渲染宠物画面和管理面板 |
| 语言 | TypeScript 6 | 全栈类型安全 |
| 动画 | Canvas 2D | 程序化绘制，零外部资源依赖 |
| 存储 | SQLite (better-sqlite3) | 本地日程和待办数据 |
| 打包 | electron-builder | Windows NSIS / Mac DMG / Linux AppImage |

## 🗂️ 项目结构

```
petpet/
├── electron/                  # Electron 主进程
│   ├── main.ts               # 窗口管理（透明悬浮）+ 系统托盘 + IPC
│   ├── preload.ts            # contextBridge 安全桥接层
│   └── tsconfig.json
├── src/                       # 渲染进程（React 前端）
│   ├── pets/                  # 🎨 宠物引擎
│   │   ├── types.ts          # 类型定义 + 动画状态机
│   │   ├── animation.ts      # 动画引擎（物理模拟、小动作调度）
│   │   ├── renderer.ts       # 三种宠物程序化绘制（猫/狗/企鹅）
│   │   └── index.ts
│   ├── components/
│   │   ├── PetCanvas.tsx      # 宠物主组件（交互 + 事件绑定）
│   │   └── PetCanvas.css
│   ├── hooks/                 # 自定义 Hook（预留）
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── resources/                 # 图标等静态资源
├── package.json               # 依赖 + electron-builder 配置
└── vite.config.ts
```

## ✅ 开发进度

### Phase 1: 桌宠基础形态 ✅ 已完成

#### D1 - 项目脚手架
- [x] Electron + React + Vite + TypeScript 项目初始化
- [x] 透明无边框悬浮窗口（`transparent: true, frame: false`）
- [x] 窗口置顶 + 任务栏隐藏（`alwaysOnTop, skipTaskbar`）
- [x] 系统托盘 + 右键菜单（显示/隐藏/日程/待办/Papers/设置/退出）
- [x] IPC 安全桥接（contextBridge）
- [x] electron-builder 打包配置（Win/Mac/Linux）
- [x] 构建链路验证（`npm run build:all` 通过）

#### A1-A5 - 宠物核心系统
- [x] **A1** - 透明悬浮窗口（含点击穿透）
- [x] **A2** - 三种宠物枚举：猫咪 🐱 / 小狗 🐶 / 企鹅 🐧，纯 Canvas 程序化绘制
- [x] **A3** - 动画系统：
  - 待机呼吸动画（正弦波缩放）
  - 5 种情绪状态机：`idle` → `happy` → `dragged` → `sleepy` → `surprised`
  - 随机小动作：眨眼、摇尾巴、歪头、打哈欠、伸懒腰（加权随机）
  - 视线跟随鼠标
  - 闲置 30 秒自动打盹（缩身 + Zzz 漂浮）
  - 拖拽惯性释放
- [x] **A4** - 鼠标拖拽移动窗口
- [x] **A5** - 右键菜单切换宠物 + 存储用户偏好（localStorage）

### Phase 2: 日程与待办 ⏳ 待开始

#### B1 - 本地数据存储
- [ ] SQLite 数据库初始化（better-sqlite3）
- [ ] 日程表 schema：标题、时间、提醒设置、备注
- [ ] 待办表 schema：标题、截止日期、优先级、完成状态
- [ ] 用户偏好表：宠物类型、设置项

#### B2 - 待办面板
- [ ] 独立窗口（从托盘或宠物右键打开）
- [ ] 待办 CRUD：创建、编辑、删除、标记完成
- [ ] 列表视图 + 按优先级/日期排序
- [ ] 拖拽排序

#### B3 - 日程面板
- [ ] 日历视图（月视图）
- [ ] 事件创建/编辑/删除
- [ ] 日视图查看当天安排

#### B4 - 定时提醒
- [ ] 宠物气泡弹窗提醒
- [ ] 系统通知（Notification API）
- [ ] 提醒时间配置

### Phase 3: Arxiv Paper Reading ⏳ 待开始

#### C1 - 用户兴趣配置
- [ ] 关键词/领域设置界面
- [ ] Arxiv 分类选择（cs.AI, cs.CL, stat.ML 等）

#### C2 - 飞书 API 集成
- [ ] 飞书 Bot Token 配置
- [ ] Daily Arxiv 消息拉取
- [ ] 消息解析（提取论文链接和标题）

#### C3 - Arxiv 数据获取
- [ ] Arxiv API 查询（匹配用户兴趣关键词）
- [ ] PDF 批量下载到本地目录
- [ ] 下载队列管理

#### C4 - Paper Reading
- [ ] PDF 文本提取（pdf-parse）
- [ ] LLM API 调用（用户配置 API Key）
- [ ] 中文摘要生成（标题 + 核心贡献 + 方法 + 结论）
- [ ] 略读卡片展示

#### C5 - 定时任务
- [ ] node-cron 每日定时触发
- [ ] 后台静默拉取 + 宠物通知

#### C6 - Paper 浏览面板
- [ ] 论文列表 + 摘要卡片
- [ ] 点击打开 PDF
- [ ] 已读/未读标记

### Phase 4: 打磨与发布 ⏳ 待开始

#### D2-D4 - 工程化
- [ ] Windows NSIS 安装包测试
- [ ] 跨平台适配预埋（Mac/Linux）
- [ ] README / CONTRIBUTING / CHANGELOG
- [ ] 开源许可证确认
- [ ] 自动更新机制调研

## 🚀 本地开发

### 前置要求

- Node.js >= 22（[下载](https://nodejs.org)）
- Git

### 启动

```bash
git clone https://github.com/akes1a/PeTpEt.git
cd PeTpEt
npm install
npm run dev:electron     # 开发模式（热更新）
```

### 构建

```bash
npm run build:all        # 编译前端 + Electron 主进程
npm run dist:win         # 打包 Windows 安装包
npm run dist             # 打包所有平台
```

## 🏗️ 架构设计

```
┌─────────────────────────────────────────────┐
│              桌面宠物窗口 (透明悬浮)            │
│  ┌─────────┐  ┌──────────┐  ┌────────────┐  │
│  │ 宠物形象  │  │ 交互动画  │  │  气泡对话   │  │
│  │ Canvas   │  │ 引擎     │  │  /通知     │  │
│  └─────────┘  └──────────┘  └────────────┘  │
├─────────────────────────────────────────────┤
│              Tray 托盘菜单                     │
│   日程管理  │  待办列表  │  Paper Reading     │
├─────────────────────────────────────────────┤
│              Main Process (Electron)          │
│   ┌──────┐ ┌──────┐ ┌──────┐ ┌───────────┐  │
│   │ 窗口 │ │ 托盘 │ │ 存储 │ │ 定时任务   │  │
│   │ 管理 │ │ 管理 │ │SQLite│ │node-cron  │  │
│   └──────┘ └──────┘ └──────┘ └───────────┘  │
├─────────────────────────────────────────────┤
│              Backend Services                 │
│  ┌──────────┐  ┌────────────────────────┐    │
│  │ 飞书 API │  │ Arxiv Paper 下载 & LLM │    │
│  │ 连接器   │  │ 摘要生成               │    │
│  └──────────┘  └────────────────────────┘    │
└─────────────────────────────────────────────┘
```

## 📝 宠物动画状态机

```
        点击/双击
 idle ──────────→ happy/surprised
  ↑                  │
  │ 300ms 自动恢复    │
  │                  ↓
  └────── 过渡 ←─────┘
  │
  │ 30s 无交互
  ↓
sleepy ←── 点击唤醒
  │
  │ 拖拽
  ↓
dragged ── 释放 → idle
```

## 📄 许可证

MIT License
