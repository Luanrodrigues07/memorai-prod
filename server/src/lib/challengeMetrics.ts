// Métricas puras de desafio — portadas de memorai-pkg/src/db.js.
// Antes rodavam no navegador sobre o IndexedDB; agora rodam no backend
// sobre os logs vindos do Postgres. A UI só renderiza o resultado.

import { toKey, todayKey, daysBetween } from "./dates.js";

export interface ChallengeLike {
  id: string;
  startDate: string;
  days: number;
  rules: string[];
}

export type LogsMap = Record<string, boolean[]>; // key `${challengeId}:${date}` -> values

export const logKey = (challengeId: string, date: string) => `${challengeId}:${date}`;

export function logsMap(logs: { challengeId: string; date: string; values: boolean[] }[]): LogsMap {
  const m: LogsMap = {};
  for (const l of logs) m[logKey(l.challengeId, l.date)] = l.values;
  return m;
}

export function chDayIndex(c: ChallengeLike): number {
  return Math.min(c.days, Math.max(1, daysBetween(c.startDate, todayKey()) + 1));
}

export function chActiveToday(c: ChallengeLike): boolean {
  const i = daysBetween(c.startDate, todayKey());
  return i >= 0 && i < c.days;
}

export function isPerfect(c: ChallengeLike, date: string, lmap: LogsMap): boolean {
  const v = lmap[logKey(c.id, date)];
  return Boolean(v && v.length === c.rules.length && v.every(Boolean));
}

export function chStreak(c: ChallengeLike, lmap: LogsMap): number {
  let n = 0;
  const d = new Date();
  if (!isPerfect(c, toKey(d), lmap)) d.setDate(d.getDate() - 1);
  while (isPerfect(c, toKey(d), lmap)) {
    n++;
    d.setDate(d.getDate() - 1);
  }
  return n;
}

export function ruleStreak(c: ChallengeLike, i: number, lmap: LogsMap): number {
  let n = 0;
  const d = new Date();
  const has = (dd: Date) => {
    const v = lmap[logKey(c.id, toKey(dd))];
    return Boolean(v && v[i]);
  };
  if (!has(d)) d.setDate(d.getDate() - 1);
  while (has(d)) {
    n++;
    d.setDate(d.getDate() - 1);
  }
  return n;
}

export function perfectDays(c: ChallengeLike, lmap: LogsMap): number {
  return Object.keys(lmap).filter(
    (k) => k.startsWith(c.id + ":") && isPerfect(c, k.split(":")[1], lmap)
  ).length;
}

// Enriquece um desafio com as métricas + os valores de hoje, pronto pra UI renderizar.
export function enrichChallenge(c: ChallengeLike, lmap: LogsMap) {
  const today = todayKey();
  const values = lmap[logKey(c.id, today)] || Array(c.rules.length).fill(false);
  return {
    ...c,
    activeToday: chActiveToday(c),
    dayIndex: chDayIndex(c),
    streak: chStreak(c, lmap),
    perfectDays: perfectDays(c, lmap),
    ruleStreaks: c.rules.map((_, i) => ruleStreak(c, i, lmap)),
    today: { date: today, values },
  };
}
