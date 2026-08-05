import { useState } from "react";
import { useChallengeActions } from "../api/hooks";

export default function ChallengeForm({ onDone, onCancel }) {
  const { createChallenge } = useChallengeActions();
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [days, setDays] = useState(30);
  const [rules, setRules] = useState([""]);

  const setRule = (i, v) => setRules((r) => r.map((x, k) => (k === i ? v : x)));
  const removeRule = (i) => setRules((r) => { const n = r.filter((_, k) => k !== i); return n.length ? n : [""]; });

  const create = async () => {
    const clean = rules.map((r) => r.trim()).filter(Boolean);
    if (!clean.length) { alert("Adicione pelo menos uma regra."); return; }
    await createChallenge({
      name: name.trim() || "Novo desafio",
      description: desc.trim(),
      days: Math.max(1, parseInt(days) || 30),
      rules: clean,
    });
    onDone();
  };

  return (
    <div className="form">
      <h2>Novo desafio</h2>
      <div className="field">
        <label>Nome do desafio</label>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Desafio 30 dias — Alta Performance" />
      </div>
      <div className="field">
        <label>O que é este desafio</label>
        <textarea value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Descreva a missão e por que ele importa..." />
      </div>
      <div className="field">
        <label>Duração</label>
        <div className="durrow">
          <input type="number" min="1" value={days} onChange={(e) => setDays(e.target.value)} />
          <span style={{ color: "var(--muted)", fontSize: 12 }}>dias</span>
          {[7, 21, 30, 90].map((d) => <button key={d} className="chip" onClick={() => setDays(d)}>{d}</button>)}
        </div>
      </div>
      <div className="field">
        <label>Regras do desafio</label>
        {rules.map((r, i) => (
          <div className="rulein" key={i}>
            <input value={r} onChange={(e) => setRule(i, e.target.value)} placeholder={`Regra ${i + 1}`} />
            <button className="rem" onClick={() => removeRule(i)}>×</button>
          </div>
        ))}
        <button className="addrule" onClick={() => setRules((r) => [...r, ""])}>+ Adicionar regra</button>
      </div>
      <div className="formfoot">
        <button className="btn-line" onClick={onCancel}>Cancelar</button>
        <button className="btn-blue" onClick={create}>Criar desafio</button>
      </div>
    </div>
  );
}
