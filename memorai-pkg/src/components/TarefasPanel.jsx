import TaskList from "./TaskList";

// Painel de tarefas no lado direito (abre/fecha pela barra direita).
// Arraste uma tarefa para a agenda para agendá-la.
export default function TarefasPanel({ open = true }) {
  return (
    <aside className={"hoje taskspanel" + (open ? "" : " closed")}>
      <div className="paneltitle">Tarefas</div>
      <div className="panelhint">Arraste uma tarefa para a agenda para agendá-la.</div>
      <TaskList compact />
    </aside>
  );
}
