import { useEffect, useRef, useState } from "react";

const ICONS = {
  agenda: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M3 10h18M8 2v4M16 2v4" />
    </svg>
  ),
  tarefas: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  ),
  desafios: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1.5" fill="currentColor" />
    </svg>
  ),
};
const LABELS = { agenda: "Agenda", tarefas: "Tarefas", desafios: "Desafios" };

export default function IconRail({ section, onChange, user, showDesafios = true, theme, onToggleTheme, onLogout }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const initial = (user?.name || user?.email || "?").trim().charAt(0).toUpperCase();
  const sections = ["agenda", "tarefas", ...(showDesafios ? ["desafios"] : [])];

  useEffect(() => {
    const onDown = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const go = (s) => { onChange(s); setOpen(false); };

  return (
    <nav className="rail">
      {sections.map((s) => (
        <button key={s} className={"navbtn" + (section === s ? " active" : "")} onClick={() => onChange(s)}>
          {ICONS[s]}
          <span className="tip">{LABELS[s]}</span>
        </button>
      ))}
      <div className="railspace" />
      {user && (
        <div className="usermenu-wrap" ref={ref}>
          <button
            className={"navbtn profbtn" + (open || section === "perfil" ? " active" : "")}
            onClick={() => setOpen((o) => !o)}
            title="Conta"
          >
            <span className="avatar">
              {user.avatarUrl ? <img src={user.avatarUrl} alt="Perfil" /> : initial}
            </span>
          </button>

          {open && (
            <div className="usermenu">
              <div className="um-head">
                <span className="um-av">
                  {user.avatarUrl ? <img src={user.avatarUrl} alt="" /> : initial}
                </span>
                <div className="um-id">
                  <div className="um-name">{user.name || "Sem nome"}</div>
                  <div className="um-mail">{user.email}</div>
                </div>
              </div>

              <button className="um-item" onClick={() => go("perfil")}>
                Perfil
              </button>

              <button className="um-item" onClick={onToggleTheme}>
                Modo escuro
                <span className={"um-switch" + (theme === "dark" ? " on" : "")}><i /></span>
              </button>

              <div className="um-div" />

              <button className="um-item danger" onClick={() => { setOpen(false); onLogout(); }}>
                Sair da conta
              </button>
            </div>
          )}
        </div>
      )}
    </nav>
  );
}
