// Helpers de data no backend — portados de memorai-pkg/src/lib/dates.js.
// Trabalhamos sempre com "keys" no formato YYYY-MM-DD (fuso local do servidor).

export const pad = (n: number) => String(n).padStart(2, "0");

export const toKey = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const todayKey = () => toKey(new Date());

export const fromKey = (k: string) => new Date(k + "T00:00:00");

export const daysBetween = (a: string, b: string) =>
  Math.round((fromKey(b).getTime() - fromKey(a).getTime()) / 86400000);
