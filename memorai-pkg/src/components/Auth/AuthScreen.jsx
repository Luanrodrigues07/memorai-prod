import { useState } from "react";
import { useAuth } from "../../api/hooks";
import AuthBg from "../AuthBg";

// Tela de login/registro. Mostrada quando não há sessão.
export default function AuthScreen() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState("login"); // "login" | "register"
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const busy = login.isPending || register.isPending;
  const isRegister = mode === "register";

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      if (isRegister) {
        await register.mutateAsync({ name: name.trim(), email: email.trim(), password });
      } else {
        await login.mutateAsync({ email: email.trim(), password });
      }
    } catch (err) {
      setError(err?.message || "Não foi possível entrar");
    }
  };

  return (
    <div className="authwrap">
      <AuthBg />
      <div className="authcard">
        <div className="authbrand">Memorai</div>
        <div className="authsub">
          {isRegister ? "Crie sua conta" : "Entre na sua conta"}
        </div>

        <form onSubmit={submit} className="authform">
          {isRegister && (
            <div className="field">
              <label>Nome</label>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Seu nome" autoComplete="name" />
            </div>
          )}
          <div className="field">
            <label>E-mail</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@email.com" autoComplete="email" required />
          </div>
          <div className="field">
            <label>Senha</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="mínimo 6 caracteres" autoComplete={isRegister ? "new-password" : "current-password"} required />
          </div>

          {error && <div className="autherr">{error}</div>}

          <button className="btn-blue authbtn" type="submit" disabled={busy}>
            {busy ? "..." : isRegister ? "Criar conta" : "Entrar"}
          </button>
        </form>

        <div className="authdiv"><span>ou</span></div>

        <a className="googlebtn" href="/api/auth/google">
          <GoogleG /> Entrar com Google
        </a>

        <div className="authswitch">
          {isRegister ? "Já tem conta?" : "Ainda não tem conta?"}{" "}
          <button type="button" onClick={() => { setMode(isRegister ? "login" : "register"); setError(""); }}>
            {isRegister ? "Entrar" : "Criar agora"}
          </button>
        </div>
      </div>
    </div>
  );
}

function GoogleG() {
  return (
    <svg viewBox="0 0 18 18" width="18" height="18" aria-hidden>
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.71-1.57 2.68-3.89 2.68-6.62z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.83.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z" />
      <path fill="#FBBC05" d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.47.9 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z" />
    </svg>
  );
}
