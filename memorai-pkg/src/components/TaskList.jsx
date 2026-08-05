import { useState } from "react";
import { useTasks, useTaskActions } from "../api/hooks";
import { todayKey, toKey, fromKey, daysBetween, dowIndex, DOW, MONTHS } from "../lib/dates";
import Check from "./Check";

const nextKey = (key, n = 1) => { const d = fromKey(key); d.setDate(d.getDate() + n); return toKey(d); };

function dayLabel(date, today, tomorrow) {
  if (date === today) return "Hoje";
  if (date === tomorrow) return "Amanhã";
  const d = fromKey(date);
  return `${DOW[dowIndex(d)]}, ${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)}`;
}
function overdueLabel(date, today) {
  const n = daysBetween(date, today);
  return n === 1 ? "ontem" : `há ${n} dias`;
}

// Lista de tarefas agrupada por dia (+ atrasadas). Usada na página e no painel.
export default function TaskList({ compact = false }) {
  const { data: tasks = [] } = useTasks();
  const { addTask, toggleTask, moveTask, removeTask } = useTaskActions();
  const today = todayKey();
  const tomorrow = nextKey(today);

  const eff = (t) => t.date || today;
  const open = tasks.filter((t) => !t.done);
  const done = tasks.filter((t) => t.done);

  const overdue = open.filter((t) => eff(t) < today).sort((a, b) => eff(a).localeCompare(eff(b)));

  const byDay = {};
  open.filter((t) => eff(t) >= today).forEach((t) => { (byDay[eff(t)] ||= []).push(t); });
  const dayKeys = [...new Set([today, tomorrow, ...Object.keys(byDay)])].sort();

  const onDragStart = (e, t) => {
    e.dataTransfer.setData("application/x-task", JSON.stringify({ id: t.id, text: t.text }));
    e.dataTransfer.effectAllowed = "move";
  };

  const Row = (t, opts = {}) => (
    <div className={"tk" + (t.done ? " done" : "")} key={t.id} draggable={!t.done} onDragStart={(e) => onDragStart(e, t)}>
      <button className={"rk" + (t.done ? " on" : "")} onClick={() => toggleTask(t)}><Check /></button>
      <span className="tt">{t.text}</span>
      {opts.overdue && <span className="tklate">{overdueLabel(eff(t), today)}</span>}
      {opts.overdue && <button className="tkmove" title="Mover para hoje" onClick={() => moveTask(t.id, today)}>→ hoje</button>}
      <button className="x" onClick={() => removeTask(t.id)}>×</button>
    </div>
  );

  return (
    <div className={"tasklist" + (compact ? " compact" : "")}>
      {overdue.length > 0 && (
        <section className="tasksec overdue">
          <div className="tasksec-h"><span className="tsdot" />Atrasadas <em>{overdue.length}</em></div>
          {overdue.map((t) => Row(t, { overdue: true }))}
        </section>
      )}

      {dayKeys.map((date) => (
        <section className="tasksec" key={date}>
          <div className="tasksec-h">{dayLabel(date, today, tomorrow)}{(byDay[date] || []).length > 0 && <em>{byDay[date].length}</em>}</div>
          {(byDay[date] || []).map((t) => Row(t))}
          <AddRow onAdd={(text) => addTask(text, date)} />
        </section>
      ))}

      {done.length > 0 && (
        <section className="tasksec donesec">
          <div className="tasksec-h muted">Concluídas <em>{done.length}</em></div>
          {done.map((t) => Row(t))}
        </section>
      )}
    </div>
  );
}

function AddRow({ onAdd }) {
  const [text, setText] = useState("");
  const submit = () => { const v = text.trim(); if (v) { onAdd(v); setText(""); } };
  return (
    <div className="tkadd">
      <span className="tkadd-plus">+</span>
      <input
        value={text}
        placeholder="Adicionar tarefa"
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && submit()}
        onBlur={submit}
      />
    </div>
  );
}
