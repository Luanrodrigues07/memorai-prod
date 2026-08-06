import { useEffect, useState } from "react";
import { useCalendarActions } from "../api/hooks";
import { fmt, eventColor } from "../lib/dates";

const parseTime = (s) => {
  const [h, m] = s.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
};

const parseGuests = (s) =>
  [...new Set(s.split(/[\s,;]+/).map((x) => x.trim()).filter((x) => x.includes("@")))];

// Modal de edição de um evento do Google Calendar.
export default function EventModal({ event, onClose }) {
  const { updateEvent, deleteEvent } = useCalendarActions();
  const editable = event.editable;
  const color = eventColor(event.id);

  const [title, setTitle] = useState(event.text || "");
  const [date, setDate] = useState(event.date);
  const [startStr, setStartStr] = useState(fmt(event.start));
  const [endStr, setEndStr] = useState(fmt(Math.min(24 * 60, event.start + event.dur)));
  const [location, setLocation] = useState(event.location || "");
  const [guests, setGuests] = useState((event.attendees || []).join(", "));
  const [meetLink, setMeetLink] = useState(event.meetLink || null);
  const [busy, setBusy] = useState(false);

  // Só o organizador (ou evento simples do próprio user) pode mexer em convidados/horário.
  const canManage = editable && event.organizerSelf !== false;

  // Fecha com ESC.
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const save = async () => {
    if (!editable) return onClose();
    const start = parseTime(startStr);
    const dur = Math.max(15, parseTime(endStr) - start);
    const patch = { text: title.trim() || "(sem título)", date, start, dur, location };
    // Só envia convidados se o campo mudou (evita apagar convidados sem querer).
    const originalGuests = (event.attendees || []).join(", ");
    if (canManage && guests.trim() !== originalGuests.trim()) patch.attendees = parseGuests(guests);
    setBusy(true);
    try {
      await updateEvent(event.calendarId, event.id, patch);
      onClose();
    } catch { /* o erro já é avisado */ } finally { setBusy(false); }
  };

  const addMeet = async () => {
    setBusy(true);
    try {
      const res = await updateEvent(event.calendarId, event.id, { addMeet: true });
      if (res?.meetLink) setMeetLink(res.meetLink);
    } finally { setBusy(false); }
  };

  const remove = async () => {
    if (!confirm("Excluir este evento do Google Calendar?")) return;
    setBusy(true);
    try { await deleteEvent(event.calendarId, event.id); onClose(); }
    finally { setBusy(false); }
  };

  return (
    <div className="modalov" onMouseDown={onClose}>
      <div className="modalcard" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modaltop" style={{ background: color + "22" }}>
          <span className="mdot" style={{ background: color }} />
          {editable ? (
            <input className="mtitle" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Título do evento" autoFocus />
          ) : (
            <div className="mtitle ro">{title}</div>
          )}
          <button className="mclose" onClick={onClose} title="Fechar">×</button>
        </div>

        <div className="modalbody">
          {event.recurring && <div className="mrec">🔁 Evento recorrente — a alteração afeta só esta ocorrência.</div>}
          {editable && event.organizerSelf === false && (
            <div className="mrec">Você não é o organizador — talvez não consiga mudar horário ou convidados.</div>
          )}

          <div className="mrow">
            <input type="date" value={date} disabled={!editable} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="mrow">
            <input type="time" value={startStr} disabled={!editable} onChange={(e) => setStartStr(e.target.value)} />
            <span className="mdash">até</span>
            <input type="time" value={endStr} disabled={!editable} onChange={(e) => setEndStr(e.target.value)} />
          </div>
          <div className="mrow">
            <input type="text" value={location} disabled={!editable} onChange={(e) => setLocation(e.target.value)} placeholder="Local (opcional)" />
          </div>
          <div className="mrow">
            <input
              type="text"
              value={guests}
              disabled={!canManage}
              onChange={(e) => setGuests(e.target.value)}
              placeholder="Convidados (e-mails separados por vírgula)"
            />
          </div>

          <div className="mrow meet">
            {meetLink ? (
              <a className="meetjoin" href={meetLink} target="_blank" rel="noreferrer">Entrar no Google Meet</a>
            ) : editable ? (
              <button className="meetadd" onClick={addMeet} disabled={busy}>+ Adicionar Google Meet</button>
            ) : (
              <span className="mmuted">Sem videochamada</span>
            )}
          </div>
        </div>

        {editable && (
          <div className="modalfoot">
            <button className="btn-danger" onClick={remove} disabled={busy}>Excluir</button>
            <div className="spacer" />
            <button className="btn-line" onClick={onClose} disabled={busy}>Cancelar</button>
            <button className="btn-blue" onClick={save} disabled={busy}>{busy ? "..." : "Salvar"}</button>
          </div>
        )}
      </div>
    </div>
  );
}
