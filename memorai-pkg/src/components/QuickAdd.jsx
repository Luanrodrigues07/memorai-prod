import { useEffect, useRef, useState } from "react";
import { DOW, fromKey, dowIndex, fmt } from "../lib/dates";

export default function QuickAdd({ data, onCommit, onCancel }) {
  const [text, setText] = useState("");
  const ref = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);
  useEffect(() => {
    const onDown = (e) => { if (ref.current && !ref.current.contains(e.target)) onCancel(); };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [onCancel]);

  const commit = () => {
    const v = text.trim();
    if (v) onCommit(v);
    else onCancel();
  };

  const d = fromKey(data.date);
  const left = Math.min(data.x, window.innerWidth - 256);
  const top = Math.min(data.y, window.innerHeight - 130);

  return (
    <div className="pop" ref={ref} style={{ left, top }}>
      <input
        ref={inputRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") commit(); if (e.key === "Escape") onCancel(); }}
        placeholder="O que você vai fazer?"
      />
      <div className="meta">{fmt(data.start)}–{fmt(data.start + data.dur)} · {DOW[dowIndex(d)]} {d.getDate()}</div>
      <div className="row">
        <button className="cancel" onClick={onCancel}>Cancelar</button>
        <button className="ok" onClick={commit}>Adicionar</button>
      </div>
    </div>
  );
}
