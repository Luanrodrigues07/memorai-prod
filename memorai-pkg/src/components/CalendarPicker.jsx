import { useEffect, useRef, useState } from "react";

// Popover no cabeçalho da Agenda: liga/desliga a exibição de cada calendário
// e escolhe em qual calendário os novos eventos são criados.
export default function CalendarPicker({ calendars, visibleIds, targetId, onToggleVisible, onSetTarget }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const onDown = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  if (!calendars?.length) return null;
  const visibleSet = new Set(visibleIds);

  return (
    <div className="calpick" ref={ref}>
      <button className="tbtn" onClick={() => setOpen((o) => !o)} title="Calendários">
        Calendários ({visibleIds.length})
      </button>
      {open && (
        <div className="calpop">
          <div className="calpop-sec">Exibir</div>
          {calendars.map((c) => (
            <label key={c.id} className="calrow">
              <input type="checkbox" checked={visibleSet.has(c.id)} onChange={() => onToggleVisible(c.id)} />
              <span className="caldot" style={{ background: c.color }} />
              <span className="calname">{c.summary}{c.primary ? " (principal)" : ""}</span>
              {!c.editable && <span className="callock" title="Somente leitura">🔒</span>}
            </label>
          ))}

          <div className="calpop-sec">Criar novos eventos em</div>
          {calendars.filter((c) => c.editable).map((c) => (
            <label key={c.id} className="calrow">
              <input type="radio" name="caltarget" checked={targetId === c.id} onChange={() => onSetTarget(c.id)} />
              <span className="caldot" style={{ background: c.color }} />
              <span className="calname">{c.summary}{c.primary ? " (principal)" : ""}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
