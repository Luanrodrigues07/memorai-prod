import { useEffect, useState } from "react";
import { useAuth, useChallenges, useTheme, useShowDesafios } from "./api/hooks";
import AuthScreen from "./components/Auth/AuthScreen";
import IconRail from "./components/IconRail";
import RightRail from "./components/RightRail";
import Agenda from "./components/Agenda";
import Tarefas from "./components/Tarefas";
import TarefasPanel from "./components/TarefasPanel";
import Desafios from "./components/Desafios";
import Profile from "./components/Profile";

export default function App() {
  const { user, loading, logout } = useAuth();
  const { theme, toggle: toggleTheme } = useTheme();

  // Ao voltar do OAuth do Google (/?google=ok|erro), limpa a URL.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.has("google")) {
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  if (loading) return <div className="app" />;
  if (!user) return <AuthScreen />;

  return <AuthedApp user={user} onLogout={() => logout.mutate()} theme={theme} onToggleTheme={toggleTheme} />;
}

// Só monta (e busca dados) quando há sessão — evita chamadas 401 na tela de login.
function AuthedApp({ user, onLogout, theme, onToggleTheme }) {
  const [section, setSection] = useState("agenda");
  const [creating, setCreating] = useState(false);
  const [hojeOpen, setHojeOpen] = useState(() => localStorage.getItem("memorai_hoje") !== "false");
  useEffect(() => { localStorage.setItem("memorai_hoje", String(hojeOpen)); }, [hojeOpen]);
  const [tarefasOpen, setTarefasOpen] = useState(() => localStorage.getItem("memorai_tarefas_panel") === "true");
  useEffect(() => { localStorage.setItem("memorai_tarefas_panel", String(tarefasOpen)); }, [tarefasOpen]);
  const { showDesafios, toggleDesafios } = useShowDesafios();

  const { challenges, activeId } = useChallenges();
  const activeChallenge = challenges.find((c) => c.id === activeId) || null;

  const goSection = (s) => { setSection(s); if (s !== "desafios") setCreating(false); };
  const goDesafios = () => { setSection("desafios"); setCreating(true); };

  // Se Desafios estiver escondido, cai na Agenda.
  const active = section === "desafios" && !showDesafios ? "agenda" : section;

  return (
    <div className="app">
      <IconRail section={active} onChange={goSection} user={user} showDesafios={showDesafios} theme={theme} onToggleTheme={onToggleTheme} onLogout={onLogout} />
      {active === "agenda" && <Agenda challenge={activeChallenge} onGoDesafios={goDesafios} hojeOpen={hojeOpen} />}
      {active === "tarefas" && <Tarefas onScheduled={() => setSection("agenda")} />}
      {active === "desafios" && (
        <Desafios challenges={challenges} activeId={activeId} creating={creating} setCreating={setCreating} />
      )}
      {active === "perfil" && <Profile showDesafios={showDesafios} onToggleDesafios={toggleDesafios} />}

      <TarefasPanel open={tarefasOpen} />
      <RightRail
        hojeActive={hojeOpen}
        onToggleHoje={() => setHojeOpen((o) => !o)}
        tarefasActive={tarefasOpen}
        onToggleTarefas={() => setTarefasOpen((o) => !o)}
      />
    </div>
  );
}
