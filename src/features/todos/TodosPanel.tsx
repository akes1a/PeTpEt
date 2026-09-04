/**
 * 待办事项窗口(附带功能 · v1 纯文本)。
 * 特性:
 *   - 顶部输入框新建条目(Enter 或“添加”按钮)
 *   - 每条左侧空圆圈点击打勾 / 取消
 *   - 右键条目 -> 弹出菜单:编辑文字 / 删除条目
 * 数据全部存于主进程 userData/todos.json(经 IPC CRUD)。
 */
import { useCallback, useEffect, useRef, useState } from "react";
import type { TodoItem } from "../../../electron/preload";
import "./TodosPanel.css";

interface MenuState {
  id: string;
  x: number;
  y: number;
}

function TodosPanel() {
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [inputText, setInputText] = useState("");
  const [menu, setMenu] = useState<MenuState | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // 初始加载 + 订阅主进程广播
  useEffect(() => {
    if (!window.petpet) return;
    void window.petpet.getTodos().then(setTodos);
    return window.petpet.onTodosChanged(setTodos);
  }, []);

  const doneCount = todos.filter((t) => t.done).length;

  // ---------- 新建 ----------
  const handleAdd = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const text = inputText.trim();
      if (!text || !window.petpet) return;
      void window.petpet.addTodo(text).then(setTodos);
      setInputText("");
      inputRef.current?.focus();
    },
    [inputText],
  );

  // ---------- 勾选 ----------
  const toggleDone = useCallback((item: TodoItem) => {
    void window.petpet?.updateTodo(item.id, { done: !item.done }).then(setTodos);
  }, []);

  // ---------- 右键菜单 ----------
  const openMenu = useCallback((e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    // 菜单 130x88 左右,贴边时收进窗口
    const x = Math.max(4, Math.min(e.clientX, window.innerWidth - 140));
    const y = Math.max(4, Math.min(e.clientY, window.innerHeight - 96));
    setMenu({ id, x, y });
  }, []);

  const closeMenu = useCallback(() => setMenu(null), []);

  // ---------- 编辑 ----------
  const startEdit = useCallback(
    (item: TodoItem) => {
      setEditingId(item.id);
      setDraft(item.text);
      closeMenu();
    },
    [closeMenu],
  );

  const saveEdit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!editingId || !window.petpet) return;
      const text = draft.trim();
      if (text) {
        void window.petpet.updateTodo(editingId, { text }).then(setTodos);
      }
      setEditingId(null);
    },
    [editingId, draft],
  );

  const cancelEdit = useCallback(() => setEditingId(null), []);

  // ---------- 删除 ----------
  const removeItem = useCallback(
    (id: string) => {
      void window.petpet?.deleteTodo(id).then(setTodos);
      closeMenu();
    },
    [closeMenu],
  );

  return (
    <div className="todos">
      <header className="todos-header">
        <h1>待办事项</h1>
        <p className="todos-subtitle">
          {todos.length === 0 ? "空列表" : `已完成 ${doneCount} / ${todos.length}`}
        </p>
      </header>

      <form className="todo-add" onSubmit={handleAdd}>
        <input
          ref={inputRef}
          type="text"
          value={inputText}
          maxLength={200}
          placeholder="输入一条待办,回车添加…"
          onChange={(e) => setInputText(e.target.value)}
        />
        <button type="submit" disabled={!inputText.trim()}>
          添加
        </button>
      </form>

      <ul className="todo-list">
        {todos.length === 0 && (
          <li className="todo-empty">
            还没有待办,在上面输入第一条吧 ✨
          </li>
        )}

        {todos.map((item) =>
          editingId === item.id ? (
            <li key={item.id} className="todo-item">
              <button
                type="button"
                className="todo-circle"
                onClick={() => toggleDone(item)}
                title={item.done ? "标记未完成" : "标记完成"}
              >
                {item.done ? "✓" : ""}
              </button>
              <form className="todo-edit-form" onSubmit={saveEdit}>
                <input
                  type="text"
                  autoFocus
                  value={draft}
                  maxLength={200}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") cancelEdit();
                  }}
                />
                <button type="submit" disabled={!draft.trim()}>保存</button>
                <button type="button" className="ghost" onClick={cancelEdit}>取消</button>
              </form>
            </li>
          ) : (
            <li
              key={item.id}
              className={item.done ? "todo-item done" : "todo-item"}
              onContextMenu={(e) => openMenu(e, item.id)}
            >
              <button
                type="button"
                className="todo-circle"
                onClick={() => toggleDone(item)}
                title={item.done ? "标记未完成" : "标记完成"}
              >
                {item.done ? "✓" : ""}
              </button>
              <span className="todo-text">{item.text}</span>
            </li>
          ),
        )}
      </ul>

      <footer className="todos-footer">右键条目可编辑或删除 · 纯文本待办 v1</footer>

      {menu && (
        <div
          className="ctx-backdrop"
          onMouseDown={closeMenu}
          onContextMenu={(e) => {
            e.preventDefault();
            closeMenu();
          }}
        >
          <div
            className="ctx-menu"
            style={{ left: menu.x, top: menu.y }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => {
                const item = todos.find((t) => t.id === menu.id);
                if (item) startEdit(item);
              }}
            >
              ✏️ 编辑文字
            </button>
            <button
              type="button"
              className="danger"
              onClick={() => removeItem(menu.id)}
            >
              🗑️ 删除条目
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default TodosPanel;
