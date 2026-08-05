import { useChallengeActions } from "../api/hooks";
import Check from "./Check";

// challenge já vem enriquecido do backend: today.values, ruleStreaks, dayIndex, activeToday.
export default function HojePanel({ challenge, onGoDesafios, open = true }) {
  const { toggleRule } = useChallengeActions();
  const cls = "hoje" + (open ? "" : " closed");

  if (!challenge || !challenge.activeToday) {
    return (
      <aside className={cls}>
        <div className="emptybox">
          Nenhum desafio ativo hoje.
          <br />
          <button onClick={onGoDesafios}>Criar um desafio</button>
        </div>
      </aside>
    );
  }

  const values = challenge.today?.values || Array(challenge.rules.length).fill(false);
  const done = values.filter(Boolean).length;

  return (
    <aside className={cls}>
      <div className="cname">{challenge.name}</div>
      <div className="cday">Dia {challenge.dayIndex} de {challenge.days} · {done}/{challenge.rules.length} hoje</div>
      <div className="prog"><i style={{ width: (done / challenge.rules.length) * 100 + "%" }} /></div>
      {challenge.rules.map((r, i) => {
        const on = values[i];
        const st = challenge.ruleStreaks?.[i] ?? 0;
        return (
          <div className={"rule" + (on ? " done" : "")} key={i}>
            <button className={"rk" + (on ? " on" : "")} onClick={() => toggleRule(challenge.id, i)}><Check /></button>
            <span className="rt">{r}</span>
            {st > 0 && <span className={"rs" + (st >= 3 ? " hot" : "")}>{st >= 3 ? "🔥" : ""}{st}d</span>}
          </div>
        );
      })}
    </aside>
  );
}
