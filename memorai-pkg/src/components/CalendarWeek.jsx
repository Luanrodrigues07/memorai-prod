import { useEffect, useRef, useState } from "react";
import { HSTART, HEND, HOURH, DOW, toKey, todayKey, dowIndex, snap, fmt, layout, hourLabel, eventColor } from "../lib/dates";
import { useCalendarActions, useTaskActions } from "../api/hooks";
import QuickAdd from "./QuickAdd";
import EventModal from "./EventModal";

export default function CalendarWeek({ days, events, onOpenDay, targetCalendarId }) {
  const { createEvent, updateEvent, deleteEvent } = useCalendarActions();
  const { removeTask } = useTaskActions();
  const gridRef = useRef(null);
  const scrollRef = useRef(null);
  const [drag, setDrag] = useState(null); // {id,mode,date,start,dur}
  const [ghost, setGhost] = useState(null); // {date,top,height}
  const [quick, setQuick] = useState(null); // {x,y,date,start,dur}
  const [editing, setEditing] = useState(null); // evento aberto no modal
  const [dropDay, setDropDay] = useState(null); // coluna destacada ao arrastar tarefa

  // Soltar uma tarefa (arrastada do painel) na coluna do dia -> cria evento e remove a tarefa.
  const hasTask = (e) => Array.from(e.dataTransfer.types || []).includes("application/x-task");
  function onColDragOver(e) { if (hasTask(e)) e.preventDefault(); }
  function onColDrop(e, dateK) {
    setDropDay(null);
    const raw = e.dataTransfer.getData("application/x-task");
    if (!raw) return;
    e.preventDefault();
    let task;
    try { task = JSON.parse(raw); } catch { return; }
    if (!targetCalendarId) { alert("Escolha um calendário editável em \"Calendários\" para agendar."); return; }
    const rect = e.currentTarget.getBoundingClientRect();
    let start = snap(HSTART * 60 + (e.clientY - rect.top) / HOURH * 60);
    start = Math.max(HSTART * 60, Math.min((HEND + 1) * 60 - 60, start));
    createEvent(targetCalendarId, { text: task.text, date: dateK, start, dur: 60 });
    removeTask(task.id);
  }

  // Abre a agenda rolada pro horário atual (deixa o "agora" ~no meio da tela).
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    requestAnimationFrame(() => {
      const now = new Date();
      const nowMin = now.getHours() * 60 + now.getMinutes();
      const nowTop = ((nowMin - HSTART * 60) / 60) * HOURH;
      const target = nowTop - el.clientHeight * 0.4; // "agora" a ~40% do topo
      el.scrollTop = Math.max(0, target);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days[0] && toKey(days[0])]);

  const cols = () => (gridRef.current ? [...gridRef.current.querySelectorAll(".dcol")] : []);
  const colByDate = (d) => gridRef.current?.querySelector(`.dcol[data-col="${d}"]`);

  // preview override for the dragged event
  const view = events.map((e) => (drag && drag.id === e.id ? { ...e, date: drag.date, start: drag.start, dur: drag.dur } : e));

  function onEventDown(e, ev) {
    if (e.target.closest(".tools")) return;
    if (e.button !== 0) return;
    const locked = !ev.editable; // calendários só-leitura: sem arrastar, só abrir
    e.preventDefault();
    const resizing = !locked && e.target.classList.contains("grip");
    const startCol = colByDate(ev.date);
    const grabMin = HSTART * 60 + (e.clientY - startCol.getBoundingClientRect().top) / HOURH * 60;
    const offset = grabMin - ev.start;
    const sx = e.clientX, sy = e.clientY;
    const cur = { id: ev.id, date: ev.date, start: ev.start, dur: ev.dur, moved: false };

    const onMove = (me) => {
      if (locked) return;
      if (!cur.moved && Math.abs(me.clientX - sx) < 3 && Math.abs(me.clientY - sy) < 3) return;
      if (!cur.moved) { cur.moved = true; document.body.classList.add("dragging"); }
      if (resizing) {
        const col = colByDate(cur.date) || startCol;
        const rect = col.getBoundingClientRect();
        const endMin = snap(HSTART * 60 + (me.clientY - rect.top) / HOURH * 60);
        cur.dur = Math.max(15, Math.min((HEND + 1) * 60 - cur.start, endMin - cur.start));
      } else {
        const col = cols().find((c) => { const r = c.getBoundingClientRect(); return me.clientX >= r.left && me.clientX < r.right; }) || startCol;
        const rect = col.getBoundingClientRect();
        let ns = snap(HSTART * 60 + (me.clientY - rect.top) / HOURH * 60 - offset);
        ns = Math.max(HSTART * 60, Math.min((HEND + 1) * 60 - cur.dur, ns));
        cur.start = ns; cur.date = col.dataset.col;
      }
      setDrag({ ...cur });
    };
    const onUp = () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      document.body.classList.remove("dragging");
      // Clique simples (sem mover) → abre o modal. Arraste → persiste no Google.
      if (!cur.moved) setEditing(ev);
      else updateEvent(ev.calendarId, ev.id, { date: cur.date, start: cur.start, dur: cur.dur });
      setDrag(null);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }

  function onColumnDown(e, dateK) {
    if (e.target.closest(".ev")) return;
    if (e.button !== 0) return;
    const rect0 = e.currentTarget.getBoundingClientRect();
    const s0 = snap(HSTART * 60 + (e.clientY - rect0.top) / HOURH * 60);
    const cur = { lo: s0, hi: s0 + 60, moved: false };
    setGhost({ date: dateK, top: (s0 - HSTART * 60) / 60 * HOURH, height: HOURH });

    const onMove = (me) => {
      cur.moved = true;
      document.body.classList.add("dragging");
      const col = colByDate(dateK);
      const m = snap(HSTART * 60 + (me.clientY - col.getBoundingClientRect().top) / HOURH * 60);
      cur.lo = Math.min(s0, m); cur.hi = Math.max(s0, m);
      setGhost({ date: dateK, top: (cur.lo - HSTART * 60) / 60 * HOURH, height: Math.max(HOURH / 3, (cur.hi - cur.lo) / 60 * HOURH) });
    };
    const onUp = (me) => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      document.body.classList.remove("dragging");
      setGhost(null);
      const lo = Math.max(HSTART * 60, cur.moved ? cur.lo : s0);
      const dur = Math.max(30, (cur.moved ? cur.hi : s0 + 60) - lo);
      setQuick({ x: me.clientX, y: me.clientY, date: dateK, start: lo, dur });
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }

  const commitNew = (text) => {
    if (!targetCalendarId) {
      alert("Escolha um calendário editável em \"Calendários\" para criar eventos.");
      setQuick(null);
      return;
    }
    createEvent(targetCalendarId, { text, date: quick.date, start: quick.start, dur: quick.dur });
    setQuick(null);
  };

  const hours = [];
  for (let h = HSTART; h <= HEND; h++) hours.push(h);
  const nowMin = new Date().getHours() * 60 + new Date().getMinutes();

  return (
    <div className="cal">
      <div className="calhead">
        <div className="gut" />
        {days.map((d) => {
          const k = toKey(d);
          return (
            <div key={k} className={"dh" + (k === todayKey() ? " today" : "")} onClick={() => onOpenDay(d)}>
              <div className="dw">{DOW[dowIndex(d)]}</div>
              <div className="dd">{d.getDate()}</div>
            </div>
          );
        })}
      </div>
      <div className="calscroll" ref={scrollRef}>
        <div className="grid" ref={gridRef}>
          <div className="gutcol">
            {hours.map((h) => (
              <div className="hl" key={h}><span>{hourLabel(h)}</span></div>
            ))}
          </div>
          {days.map((d) => {
            const k = toKey(d);
            const isT = k === todayKey();
            const dayAll = view.filter((e) => e.date === k);
            const allday = dayAll.filter((e) => e.allDay);
            const dayEvents = layout(dayAll.filter((e) => !e.allDay));
            return (
              <div
                key={k}
                className={"dcol" + (isT ? " today" : "") + (dropDay === k ? " dropover" : "")}
                data-col={k}
                onMouseDown={(e) => onColumnDown(e, k)}
                onDragOver={onColDragOver}
                onDragEnter={(e) => hasTask(e) && setDropDay(k)}
                onDrop={(e) => onColDrop(e, k)}
              >
                {hours.map((h) => <div className="hline" key={h} />)}
                {allday.length > 0 && (
                  <div className="alldaystrip">
                    {allday.map((e) => {
                      const c = eventColor(e.id);
                      return (
                        <div key={"a" + e.calendarId + e.id} className="allday" style={{ background: c + "33", borderColor: c + "55", color: c }} title={e.text} onClick={() => setEditing(e)}>
                          {e.text}
                        </div>
                      );
                    })}
                  </div>
                )}
                {isT && nowMin >= HSTART * 60 && nowMin <= (HEND + 1) * 60 && (
                  <div className="now" style={{ top: (nowMin - HSTART * 60) / 60 * HOURH }}>
                    <span className="nowlabel">{fmt(nowMin)}</span>
                  </div>
                )}
                {ghost && ghost.date === k && (
                  <div className="ghost" style={{ top: ghost.top, height: ghost.height, left: 2, right: 2 }} />
                )}
                {dayEvents.map((e) => {
                  const top = (e.start - HSTART * 60) / 60 * HOURH;
                  // 49px = altura mínima de card (igual a um evento de 30 min)
                  const height = Math.max(49, (e.dur / 60) * HOURH - 3);
                  const w = 100 / e._t;
                  const left = e._c * w;
                  const color = eventColor(e.id);
                  const compact = height < 44;
                  return (
                    <div
                      key={e.calendarId + e.id}
                      className={"ev" + (e.editable ? "" : " locked") + (compact ? " compact" : "") + (drag && drag.id === e.id && drag.moved ? " dragging" : "")}
                      style={{ top, height, left: `calc(${left}% + 3px)`, width: `calc(${w}% - 6px)`, background: color + "33", borderColor: color + "55", "--evink": color }}
                      onMouseDown={(ev) => onEventDown(ev, e)}
                      title={e.text}
                    >
                      <span className="et">{e.text}</span>
                      <span className="etm">{fmt(e.start)} - {fmt(e.start + e.dur)}</span>
                      {e.editable && <div className="grip" />}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
      {quick && (
        <QuickAdd data={quick} onCommit={commitNew} onCancel={() => setQuick(null)} />
      )}
      {editing && <EventModal event={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}
