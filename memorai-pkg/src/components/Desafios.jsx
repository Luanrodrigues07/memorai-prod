import { useChallengeActions } from "../api/hooks";
import ChallengeForm from "./ChallengeForm";
import Check from "./Check";

export default function Desafios({ challenges, activeId, creating, setCreating, onClose }) {
  return (
    <div className="main">
      <div className="head">
        <h1>Desafios</h1>
        <div className="spacer" />
        {!creating && (
          <button className="tbtn" style={{ background: "var(--blue)", color: "#fff" }} onClick={() => setCreating(true)}>
            + Novo desafio
          </button>
        )}
        {onClose && <button className="drawerclose" onClick={onClose} title="Fechar">×</button>}
      </div>
      <div className="pagewrap">
        <div className="panel">
          {creating ? (
            <ChallengeForm onDone={() => setCreating(false)} onCancel={() => setCreating(false)} />
          ) : challenges.length === 0 ? (
            <div className="emptybox" style={{ maxWidth: "none" }}>
              Você ainda não criou nenhum desafio.
              <br />
              <button onClick={() => setCreating(true)}>Criar meu primeiro desafio</button>
            </div>
          ) : (
            challenges.map((c) => (
              <ChallengeCard key={c.id} c={c} active={c.id === activeId && c.activeToday} isActiveId={c.id === activeId} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// c já vem enriquecido: streak, perfectDays, dayIndex, activeToday, today.values.
function ChallengeCard({ c, active, isActiveId }) {
  const { toggleRule, setActiveChallenge, removeChallenge } = useChallengeActions();
  const values = c.today?.values || Array(c.rules.length).fill(false);
  const badge = active ? `Ativo · Dia ${c.dayIndex}/${c.days}` : c.activeToday ? "Em pausa" : "Encerrado";
  return (
    <div className={"chcard" + (active ? " active" : "")}>
      <span className="badge">{badge}</span>
      <h2>{c.name}</h2>
      {c.description && <div className="desc">{c.description}</div>}
      <div className="chstats">
        <div className="chstat"><div className="v">{c.streak}</div><div className="l">sequência 🔥</div></div>
        <div className="chstat"><div className="v">{c.perfectDays}</div><div className="l">dias perfeitos</div></div>
        <div className="chstat"><div className="v">{c.rules.length}</div><div className="l">regras</div></div>
      </div>
      <div className="chrules">
        {c.rules.map((r, i) => {
          const on = active && values[i];
          return (
            <div className="crule" key={i}>
              <button className={"rk" + (on ? " on" : "")} style={active ? undefined : { cursor: "default" }} onClick={() => active && toggleRule(c.id, i)}><Check /></button>
              <span>{r}</span>
            </div>
          );
        })}
      </div>
      <div className="chactions">
        {!isActiveId && <button className="btn-blue" onClick={() => setActiveChallenge(c.id)}>Tornar ativo</button>}
        <button className="btn-danger" onClick={() => { if (confirm("Excluir este desafio?")) removeChallenge(c.id); }}>Excluir</button>
      </div>
    </div>
  );
}
