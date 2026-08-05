import { DOW, toKey, todayKey, dowIndex } from "../lib/dates";
import { useLogs, logKey } from "../api/hooks";

export default function MonthView({ cursor, events, challenge, onOpenDay }) {
  const y = cursor.getFullYear();
  const m = cursor.getMonth();
  const first = new Date(y, m, 1);
  const startDow = dowIndex(first);
  const daysIn = new Date(y, m + 1, 0).getDate();

  // Busca os logs do mês (para os "dots" de cada dia).
  const { data: lmap = {} } = useLogs(toKey(first), toKey(new Date(y, m, daysIn)));

  const cells = [];
  for (let i = 0; i < startDow; i++) cells.push(<div key={"b" + i} />);
  for (let day = 1; day <= daysIn; day++) {
    const d = new Date(y, m, day);
    const k = toKey(d);
    const ec = events.filter((e) => e.date === k && !e.done).length;
    const values = challenge ? lmap[logKey(challenge.id, k)] : null;
    const dots = [];
    if (challenge) for (let r = 0; r < challenge.rules.length; r++) dots.push(<i key={r} className={values && values[r] ? "on" : ""} />);
    cells.push(
      <div key={k} className={"mcell" + (k === todayKey() ? " today" : "")} onClick={() => onOpenDay(d)}>
        <div className="mtop">
          <span className="mn">{day}</span>
          {ec > 0 && <span className="mec">{ec}</span>}
        </div>
        <div className="mdots">{dots}</div>
      </div>
    );
  }

  return (
    <div className="pagewrap">
      <div className="panel" style={{ maxWidth: 820 }}>
        <div className="mgrid-head">{DOW.map((d) => <span key={d}>{d}</span>)}</div>
        <div className="mgrid">{cells}</div>
      </div>
    </div>
  );
}
