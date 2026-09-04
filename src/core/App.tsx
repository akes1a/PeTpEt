import PetCanvas from "../pet/PetCanvas";
import ControlPanel from "../features/control-panel/ControlPanel";
import TodosPanel from "../features/todos/TodosPanel";

interface AppProps {
  /** 窗口用途:宠物悬浮窗 / 控制面板 / 待办事项 */
  view: "pet" | "panel" | "todos";
}

function App({ view }: AppProps) {
  switch (view) {
    case "panel":
      return <ControlPanel />;
    case "todos":
      return <TodosPanel />;
    default:
      return <PetCanvas />;
  }
}

export default App;
