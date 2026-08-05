import { useRef, useState } from "react";
import { useAuth } from "../api/hooks";

// Redimensiona/comprime a imagem escolhida para um quadrado ~256px (JPEG),
// gerando um data URL pequeno para guardar no banco.
function fileToAvatar(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const size = 256;
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        // recorte central (cover)
        const min = Math.min(img.width, img.height);
        const sx = (img.width - min) / 2;
        const sy = (img.height - min) / 2;
        ctx.drawImage(img, sx, sy, min, min, 0, 0, size, size);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

export default function Profile({ showDesafios, onToggleDesafios }) {
  const { user, updateProfile, logout } = useAuth();
  const [name, setName] = useState(user?.name || "");
  const [avatar, setAvatar] = useState(user?.avatarUrl || null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const fileRef = useRef(null);

  const initial = (name || user?.email || "?").trim().charAt(0).toUpperCase();
  const dirty = name.trim() !== (user?.name || "") || (avatar || null) !== (user?.avatarUrl || null);

  const pickFile = () => fileRef.current?.click();

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) { setMsg("Escolha um arquivo de imagem."); return; }
    try {
      setBusy(true);
      const dataUrl = await fileToAvatar(file);
      setAvatar(dataUrl);
      setMsg("");
    } catch {
      setMsg("Não consegui ler essa imagem.");
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    setBusy(true);
    setMsg("");
    try {
      await updateProfile.mutateAsync({ name: name.trim(), avatarUrl: avatar });
      setMsg("Perfil salvo!");
    } catch (err) {
      setMsg(err?.message || "Não foi possível salvar.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="main">
      <div className="head">
        <h1>Perfil</h1>
      </div>
      <div className="pagewrap">
        <div className="panel" style={{ maxWidth: 460 }}>
          <div className="profcard">
            <div className="profavatar" onClick={pickFile} title="Trocar foto">
              {avatar ? <img src={avatar} alt="Foto de perfil" /> : <span>{initial}</span>}
            </div>
            <div className="profhint">
              <button className="btn-line" onClick={pickFile} disabled={busy}>Trocar foto</button>
              {avatar && <button className="btn-line" onClick={() => setAvatar(null)} disabled={busy}>Remover</button>}
            </div>
            <input ref={fileRef} type="file" accept="image/*" onChange={onFile} hidden />

            <div className="field">
              <label>Nome</label>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Seu nome" />
            </div>
            <div className="field">
              <label>E-mail</label>
              <input value={user?.email || ""} disabled />
            </div>
            <div className="field">
              <label>Google Calendar</label>
              <div className="profgoogle">
                {user?.googleConnected
                  ? <span className="profok">Conectado</span>
                  : <a className="btn-line" href="/api/auth/google">Conectar</a>}
              </div>
            </div>

            <div className="field">
              <label>Preferências</label>
              <button type="button" className="profpref" onClick={onToggleDesafios}>
                <span>Mostrar aba de Desafios</span>
                <span className={"um-switch" + (showDesafios ? " on" : "")}><i /></span>
              </button>
            </div>

            {msg && <div className="profmsg">{msg}</div>}

            <div className="proffoot">
              <button className="btn-danger" onClick={() => logout.mutate()}>Sair da conta</button>
              <div className="spacer" />
              <button className="btn-blue" onClick={save} disabled={busy || !dirty}>{busy ? "..." : "Salvar"}</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
