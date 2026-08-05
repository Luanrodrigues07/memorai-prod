// Segunda barra lateral (à direita). Botões que abrem/fecham painéis à direita.
// Pronta para receber outros painéis depois.
export default function RightRail({ hojeActive, onToggleHoje, tarefasActive, onToggleTarefas }) {
  return (
    <nav className="rail rail-right">
      <button className={"navbtn" + (tarefasActive ? " active" : "")} onClick={onToggleTarefas} title="Tarefas">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
        </svg>
        <span className="tip">Tarefas</span>
      </button>
      <button className={"navbtn" + (hojeActive ? " active" : "")} onClick={onToggleHoje} title="Desafios do dia">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1.5" fill="currentColor" />
        </svg>
        <span className="tip">Desafios</span>
      </button>
      <div className="railspace" />
    </nav>
  );
}
