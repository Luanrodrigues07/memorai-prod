import { useTasks } from "../api/hooks";
import TaskList from "./TaskList";

export default function Tarefas() {
  const { data: tasks = [] } = useTasks();
  const open = tasks.filter((t) => !t.done).length;

  return (
    <div className="main">
      <div className="head">
        <h1>Tarefas</h1>
        <span className="sub">{open} abertas</span>
      </div>
      <div className="pagewrap">
        <div className="panel">
          <TaskList />
        </div>
      </div>
    </div>
  );
}
