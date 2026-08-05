export const DOW = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
export const MONTHS = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

export const HSTART = 0;
export const HEND = 23;
export const HOURH = 104; // manter igual ao --hourH no styles.css

export const pad = (n) => String(n).padStart(2, "0");

// Rótulo de hora no formato 12h ("8 AM", "12 PM") como na referência.
export const hourLabel = (h) => {
  if (h === 0) return "12 AM";
  if (h === 12) return "12 PM";
  return h < 12 ? `${h} AM` : `${h - 12} PM`;
};

// Paleta viva para variar a cor de cada evento (estável por id).
const EVENT_PALETTE = [
  "#2F6FED", "#7C3AED", "#059669", "#EC4899", "#0891B2",
  "#F59E0B", "#6366F1", "#E11D48", "#14B8A6", "#9333EA",
];
export function eventColor(id) {
  const s = String(id || "");
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return EVENT_PALETTE[h % EVENT_PALETTE.length];
}
export const toKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const todayKey = () => toKey(new Date());
export const fromKey = (k) => new Date(k + "T00:00:00");
export const dowIndex = (d) => (d.getDay() + 6) % 7; // Monday=0

export function mondayOf(d) {
  const x = new Date(d);
  x.setDate(x.getDate() - dowIndex(x));
  x.setHours(0, 0, 0, 0);
  return x;
}
export function weekDays(cursor) {
  const m = mondayOf(cursor);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(m);
    d.setDate(m.getDate() + i);
    return d;
  });
}
export const daysBetween = (a, b) => Math.round((fromKey(b) - fromKey(a)) / 86400000);
export const snap = (m) => Math.round(m / 15) * 15;
export const fmt = (m) => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;

// greedy lane layout for overlapping events in one day
export function layout(evs) {
  const s = [...evs].sort((a, b) => a.start - b.start);
  const colsEnd = [];
  s.forEach((e) => {
    let c = colsEnd.findIndex((end) => end <= e.start);
    if (c < 0) { c = colsEnd.length; colsEnd.push(0); }
    colsEnd[c] = e.start + e.dur;
    e._c = c;
  });
  const total = Math.max(1, colsEnd.length);
  s.forEach((e) => (e._t = total));
  return s;
}
