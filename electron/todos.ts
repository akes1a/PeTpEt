/**
 * 纯文本待办数据(主进程唯一持有并持久化到 userData/todos.json)。
 * 当前为轻量 JSON 存储,不引入 SQLite(保持零原生依赖)。
 */
import { app } from "electron";
import * as fs from "fs";
import * as path from "path";

export interface TodoItem {
  id: string;
  /** 纯文本内容 */
  text: string;
  /** 是否已完成(点击左侧圆圈) */
  done: boolean;
  createdAt: number;
}

/** 可更新字段(编辑文字 / 勾选完成) */
export type TodoPatch = Partial<Pick<TodoItem, "text" | "done">>;

const MAX_TEXT_LENGTH = 200;

let cached: TodoItem[] | null = null;

function todosFilePath(): string {
  return path.join(app.getPath("userData"), "todos.json");
}

function isValidText(text: unknown): text is string {
  return typeof text === "string" && text.trim().length > 0 && text.trim().length <= MAX_TEXT_LENGTH;
}

function sanitizeList(raw: unknown): TodoItem[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: TodoItem[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const e = entry as Record<string, unknown>;
    if (typeof e.id !== "string" || seen.has(e.id)) continue;
    if (!isValidText(e.text)) continue;
    out.push({
      id: e.id,
      text: (e.text as string).trim(),
      done: e.done === true,
      createdAt: typeof e.createdAt === "number" ? e.createdAt : Date.now(),
    });
    seen.add(e.id);
  }
  return out;
}

/** 首次调用时从磁盘读取(损坏则回落空列表) */
export function loadTodos(): TodoItem[] {
  if (cached) return cached;
  let list: TodoItem[] = [];
  try {
    list = sanitizeList(JSON.parse(fs.readFileSync(todosFilePath(), "utf-8")));
  } catch {
    // 首次运行或文件损坏:空列表
  }
  cached = list;
  return [...cached];
}

function persist(): TodoItem[] {
  if (!cached) loadTodos();
  try {
    fs.mkdirSync(path.dirname(todosFilePath()), { recursive: true });
    fs.writeFileSync(todosFilePath(), JSON.stringify(cached, null, 2), "utf-8");
  } catch (err) {
    console.warn("[todos] 保存失败:", err);
  }
  return [...cached!];
}

export function getTodos(): TodoItem[] {
  return cached ? [...cached] : loadTodos();
}

/** 新建条目,返回最新列表 */
export function addTodo(text: string): TodoItem[] {
  const clean = text.trim();
  if (!clean) return getTodos();
  loadTodos();
  cached!.push({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    text: clean.slice(0, MAX_TEXT_LENGTH),
    done: false,
    createdAt: Date.now(),
  });
  return persist();
}

/** 更新条目文字或完成态,返回最新列表(条目不存在则原样返回) */
export function updateTodo(id: string, patch: TodoPatch): TodoItem[] {
  loadTodos();
  const target = cached!.find((t) => t.id === id);
  if (!target) return getTodos();

  if (patch.text !== undefined) {
    if (!isValidText(patch.text)) return getTodos();
    target.text = patch.text.trim().slice(0, MAX_TEXT_LENGTH);
  }
  if (patch.done !== undefined) {
    target.done = patch.done === true;
  }
  return persist();
}

/** 删除条目,返回最新列表 */
export function deleteTodo(id: string): TodoItem[] {
  loadTodos();
  cached = cached!.filter((t) => t.id !== id);
  return persist();
}
