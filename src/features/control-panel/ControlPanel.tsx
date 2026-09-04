/**
 * 控制面板(附带功能)。
 * 一个独立窗口,集中管理:宠物形象切换 / 后台运行开关 / 开机自启开关,
 * 以及“显示 / 隐藏宠物、退出程序”等快捷操作。
 * 所有开关都写入主进程统一持有的全局配置,任意入口修改会即时同步到宠物窗口。
 */
import { useConfig } from "../../core/useConfig";
import type { PetType } from "../../pet/engine";
import "./ControlPanel.css";

const PET_OPTIONS: { value: PetType; label: string; emoji: string }[] = [
  { value: "cat", label: "猫咪", emoji: "🐱" },
  { value: "dog", label: "小狗", emoji: "🐶" },
  { value: "penguin", label: "企鹅", emoji: "🐧" },
];

const APP_VERSION = "0.1.0";

function ControlPanel() {
  const config = useConfig();

  const applyConfig = (patch: Parameters<NonNullable<typeof window.petpet>["setConfig"]>[0]) => {
    void window.petpet?.setConfig(patch);
  };

  return (
    <div className="panel">
      <header className="panel-header">
        <span className="panel-logo" aria-hidden>🐾</span>
        <div>
          <h1>PetPet 控制面板</h1>
          <p className="panel-subtitle">管理桌面宠物的形象与运行方式</p>
        </div>
      </header>

      <section className="panel-section">
        <h2>宠物形象</h2>
        <div className="pet-grid">
          {PET_OPTIONS.map((opt) => {
            const active = config.petType === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                className={active ? "pet-option active" : "pet-option"}
                onClick={() => applyConfig({ petType: opt.value })}
              >
                <span className="pet-emoji" aria-hidden>{opt.emoji}</span>
                <span className="pet-name">{opt.label}</span>
                {active && <span className="pet-check" aria-hidden>✓</span>}
              </button>
            );
          })}
        </div>
      </section>

      <section className="panel-section">
        <h2>运行设置</h2>

        <label className="setting-row">
          <input
            type="checkbox"
            checked={config.backgroundRunning}
            onChange={(e) => applyConfig({ backgroundRunning: e.target.checked })}
          />
          <div>
            <span className="setting-title">后台运行(托盘常驻)</span>
            <p className="setting-desc">
              开启:隐藏宠物或关闭本面板后,程序继续驻留系统托盘运行,可从托盘随时唤回;
              关闭:宠物被藏起、面板被关闭且无其它可见窗口时,直接退出程序。
            </p>
          </div>
        </label>

        <label className="setting-row">
          <input
            type="checkbox"
            checked={config.autoStart}
            onChange={(e) => applyConfig({ autoStart: e.target.checked })}
          />
          <div>
            <span className="setting-title">开机自启动</span>
            <p className="setting-desc">登录 Windows 后自动启动并显示宠物(安装版生效)。</p>
          </div>
        </label>
      </section>

      <section className="panel-section">
        <h2>快捷操作</h2>
        <div className="action-row">
          <button type="button" className="btn" onClick={() => window.petpet?.showPet()}>
            显示宠物
          </button>
          <button type="button" className="btn" onClick={() => window.petpet?.hidePet()}>
            隐藏宠物
          </button>
          <button type="button" className="btn btn-danger" onClick={() => window.petpet?.quit()}>
            退出程序
          </button>
        </div>
      </section>

      <footer className="panel-footer">PetPet v{APP_VERSION} · Windows</footer>
    </div>
  );
}

export default ControlPanel;
