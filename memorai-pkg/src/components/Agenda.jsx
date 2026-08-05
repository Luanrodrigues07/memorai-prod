import { useMemo, useState } from "react";
import { useCalendarEvents, useCalendarStatus, useCalendars, useCalendarSelection } from "../api/hooks";
import { DOW, MONTHS, weekDays, dowIndex, toKey } from "../lib/dates";
import CalendarWeek from "./CalendarWeek";
import MonthView from "./MonthView";
import HojePanel from "./HojePanel";
import CalendarPicker from "./CalendarPicker";

export default function Agenda({ challenge, onGoDesafios, hojeOpen = true }) {
  const [view, setView] = useState("semana");
  const [cursor, setCursor] = useState(new Date());
  const calStatus = useCalendarStatus();
  const { data: calData } = useCalendars();
  const calendars = calData?.calendars ?? [];
  const { visibleIds, targetId, setTargetId, toggleVisible } = useCalendarSelection(calendars);

  const days = view === "dia" ? [new Date(cursor)] : weekDays(cursor);
  const first = days[0], last = days[days.length - 1];

  // Intervalo visível (para buscar os eventos do Google).
  const [rangeFrom, rangeTo] = useMemo(() => {
    if (view === "mes") {
      const y = cursor.getFullYear(), m = cursor.getMonth();
      return [toKey(new Date(y, m, 1)), toKey(new Date(y, m + 1, 0))];
    }
    return [toKey(first), toKey(last)];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, toKey(first), toKey(last), cursor.getFullYear(), cursor.getMonth()]);

  const { data: cal } = useCalendarEvents(rangeFrom, rangeTo, visibleIds);
  const events = cal?.events ?? [];

  const step = (dir) => {
    const d = new Date(cursor);
    if (view === "mes") d.setMonth(d.getMonth() + dir);
    else if (view === "dia") d.setDate(d.getDate() + dir);
    else d.setDate(d.getDate() + 7 * dir);
    setCursor(d);
  };
  const openDay = (d) => { setCursor(new Date(d)); setView("dia"); };

  let label;
  if (view === "mes") label = `${MONTHS[cursor.getMonth()]} ${cursor.getFullYear()}`;
  else if (view === "dia") label = `${DOW[dowIndex(first)]}, ${first.getDate()} ${MONTHS[first.getMonth()]}`;
  else label = `${first.getDate()}–${last.getDate()} ${MONTHS[first.getMonth()]}`;

  const configured = calStatus.data?.configured;
  const connected = calStatus.data?.connected;

  return (
    <div className="main">
      <div className="head">
        <h1>Agenda</h1>
        <span className="sub">{label}</span>
        <div className="nav">
          <button onClick={() => step(-1)}>‹</button>
          <button onClick={() => step(1)}>›</button>
        </div>
        <button className="tbtn" onClick={() => setCursor(new Date())}>Hoje</button>
        <div className="spacer" />
        {configured && !connected && (
          <a className="tbtn gconnect" href="/api/auth/google" title="Conectar Google Calendar">
            + Google Calendar
          </a>
        )}
        {configured && connected && (
          <CalendarPicker
            calendars={calendars}
            visibleIds={visibleIds}
            targetId={targetId}
            onToggleVisible={toggleVisible}
            onSetTarget={setTargetId}
          />
        )}
        {challenge && <div className="streak">🔥 {challenge.streak}</div>}
        <div className="seg">
          <button className={view === "dia" ? "active" : ""} onClick={() => setView("dia")}>Dia</button>
          <button className={view === "semana" ? "active" : ""} onClick={() => setView("semana")}>Semana</button>
          <button className={view === "mes" ? "active" : ""} onClick={() => setView("mes")}>Mês</button>
        </div>
      </div>

      {view === "mes" ? (
        <MonthView cursor={cursor} events={events} challenge={challenge} onOpenDay={openDay} />
      ) : (
        <div className="content">
          <CalendarWeek days={days} events={events} onOpenDay={openDay} targetCalendarId={targetId} />
          <HojePanel challenge={challenge} onGoDesafios={onGoDesafios} open={hojeOpen} />
        </div>
      )}
    </div>
  );
}
