// Hooks de dados baseados em TanStack Query. Substituem o antigo src/db.js
// (Dexie/IndexedDB): agora toda leitura/escrita passa pelo backend.

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "./client";

export const logKey = (challengeId, date) => `${challengeId}:${date}`;

/* ---------------- Tema (claro/escuro) ---------------- */
export function useTheme() {
  const [theme, setTheme] = useState(() => localStorage.getItem("memorai_theme") || "light");
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("memorai_theme", theme);
  }, [theme]);
  const toggle = () => setTheme((t) => (t === "dark" ? "light" : "dark"));
  return { theme, toggle };
}

// Preferência de exibir a aba de Desafios (persistida no navegador).
export function useShowDesafios() {
  const [show, setShow] = useState(() => localStorage.getItem("memorai_show_desafios") !== "false");
  useEffect(() => {
    localStorage.setItem("memorai_show_desafios", String(show));
  }, [show]);
  return { showDesafios: show, toggleDesafios: () => setShow((v) => !v) };
}

/* ---------------- Auth ---------------- */

export function useAuth() {
  const qc = useQueryClient();
  const meQuery = useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      try {
        return await api.get("/auth/me");
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) return null;
        throw e;
      }
    },
    retry: false,
    staleTime: 60_000,
  });

  const onAuthed = (user) => {
    qc.setQueryData(["me"], user);
    // Recarrega tudo do novo usuário.
    qc.invalidateQueries();
  };

  const login = useMutation({
    mutationFn: (creds) => api.post("/auth/login", creds),
    onSuccess: onAuthed,
  });
  const register = useMutation({
    mutationFn: (creds) => api.post("/auth/register", creds),
    onSuccess: onAuthed,
  });
  const logout = useMutation({
    mutationFn: () => api.post("/auth/logout"),
    onSuccess: () => {
      qc.setQueryData(["me"], null);
      qc.clear();
    },
  });

  const updateProfile = useMutation({
    mutationFn: (patch) => api.patch("/auth/profile", patch),
    onSuccess: (user) => qc.setQueryData(["me"], user),
  });

  return {
    user: meQuery.data ?? null,
    loading: meQuery.isLoading,
    login,
    register,
    logout,
    updateProfile,
  };
}

/* ---------------- Tarefas ---------------- */

export function useTasks() {
  return useQuery({ queryKey: ["tasks"], queryFn: () => api.get("/tasks") });
}

export function useTaskActions() {
  const qc = useQueryClient();
  const invTasks = () => qc.invalidateQueries({ queryKey: ["tasks"] });
  const invCalendar = () => qc.invalidateQueries({ queryKey: ["calendar"] });
  return {
    addTask: async (text, date) => { await api.post("/tasks", date ? { text, date } : { text }); invTasks(); },
    toggleTask: async (t) => { await api.patch(`/tasks/${t.id}`, { done: !t.done }); invTasks(); },
    moveTask: async (id, date) => { await api.patch(`/tasks/${id}`, { date }); invTasks(); },
    removeTask: async (id) => { await api.del(`/tasks/${id}`); invTasks(); },
    // Agenda tarefa criando um evento no Google (calendário principal).
    scheduleTask: async (id, opts = {}) => { await api.post(`/tasks/${id}/schedule`, { ...opts, tz: TZ }); invTasks(); invCalendar(); },
  };
}

/* ---------------- Desafios (já enriquecidos com métricas) ---------------- */

export function useChallenges() {
  const q = useQuery({ queryKey: ["challenges"], queryFn: () => api.get("/challenges") });
  return {
    ...q,
    activeId: q.data?.activeId ?? null,
    challenges: q.data?.challenges ?? [],
  };
}

export function useChallengeActions() {
  const qc = useQueryClient();
  const invAll = () => {
    qc.invalidateQueries({ queryKey: ["challenges"] });
    qc.invalidateQueries({ queryKey: ["logs"] });
  };
  return {
    createChallenge: async (payload) => { await api.post("/challenges", payload); invAll(); },
    setActiveChallenge: async (id) => { await api.put("/challenges/active", { id }); invAll(); },
    removeChallenge: async (id) => { await api.del(`/challenges/${id}`); invAll(); },
    toggleRule: async (challengeId, ruleIdx, date) => {
      await api.post(`/challenges/${challengeId}/toggle`, date ? { ruleIdx, date } : { ruleIdx });
      invAll();
    },
  };
}

/* ---------------- Logs (dots do mês) ---------------- */

export function useLogs(from, to) {
  return useQuery({
    queryKey: ["logs", from, to],
    queryFn: () => api.get(`/logs?from=${from}&to=${to}`),
    enabled: Boolean(from && to),
  });
}

/* ---------------- Google Calendar (leitura + escrita) ---------------- */

// Fuso do navegador (ex.: "America/Sao_Paulo") — enviado ao criar/editar.
export const TZ = Intl.DateTimeFormat().resolvedOptions().timeZone;
const enc = encodeURIComponent;

export function useCalendarStatus() {
  return useQuery({ queryKey: ["calendar-status"], queryFn: () => api.get("/calendar/status") });
}

export function useCalendars() {
  return useQuery({ queryKey: ["calendars"], queryFn: () => api.get("/calendar/list") });
}

// Seleção do usuário: quais calendários exibir + em qual criar novos eventos.
// Persistida em localStorage; defaults preenchidos quando a lista chega.
export function useCalendarSelection(calendars) {
  const [visibleIds, setVisibleIds] = useState(() => {
    try { return JSON.parse(localStorage.getItem("memorai_cal_visible")) || null; } catch { return null; }
  });
  const [targetId, setTargetId] = useState(() => localStorage.getItem("memorai_cal_target") || null);

  useEffect(() => {
    if (!calendars?.length) return;
    setVisibleIds((cur) => {
      if (cur && cur.length) return cur.filter((id) => calendars.some((c) => c.id === id));
      return calendars.map((c) => c.id);
    });
    setTargetId((cur) => {
      if (cur && calendars.some((c) => c.id === cur && c.editable)) return cur;
      const p = calendars.find((c) => c.primary && c.editable) || calendars.find((c) => c.editable);
      return p?.id ?? null;
    });
  }, [calendars]);

  useEffect(() => {
    if (visibleIds) localStorage.setItem("memorai_cal_visible", JSON.stringify(visibleIds));
  }, [visibleIds]);
  useEffect(() => {
    if (targetId) localStorage.setItem("memorai_cal_target", targetId);
  }, [targetId]);

  const toggleVisible = (id) =>
    setVisibleIds((cur) => {
      const set = new Set(cur || []);
      if (set.has(id)) set.delete(id); else set.add(id);
      return [...set];
    });

  return { visibleIds: visibleIds || [], targetId, setTargetId, toggleVisible };
}

export function useCalendarEvents(from, to, calendarIds) {
  const idsKey = (calendarIds || []).join(",");
  return useQuery({
    queryKey: ["calendar", from, to, idsKey],
    queryFn: () => api.get(`/calendar/events?from=${from}&to=${to}&calendarIds=${enc(idsKey)}`),
    enabled: Boolean(from && to && idsKey),
  });
}

function onReconnectError(err) {
  if (err?.message === "reconnect") {
    alert("A conexão com o Google precisa ser renovada. Clique em \"Reconectar Google\" na Agenda.");
    return;
  }
  // Mostra o motivo (ex.: sem permissão pra mover a reunião) em vez de falhar em silêncio.
  alert(err?.message || "Não foi possível salvar a alteração no Google Calendar.");
}

// Ações de escrita com update otimista em todas as queries ["calendar", ...].
// Não recarregamos a agenda inteira a cada ação (era lento); a mudança fica no
// cache na hora, e a agenda rebusca do Google só ao navegar de semana/período.
export function useCalendarActions() {
  const qc = useQueryClient();

  const patchCache = (fn) =>
    qc.setQueriesData({ queryKey: ["calendar"] }, (old) =>
      old && old.events ? { ...old, events: fn(old.events) } : old
    );
  const snapshot = () => qc.getQueriesData({ queryKey: ["calendar"] });
  const restore = (snap) => snap.forEach(([key, data]) => qc.setQueryData(key, data));
  const patchOne = (calendarId, eventId, upd) =>
    patchCache((evs) => evs.map((e) => (e.id === eventId && e.calendarId === calendarId ? { ...e, ...upd } : e)));

  return {
    createEvent: async (calendarId, input) => {
      const snap = snapshot();
      const tempId = "temp-" + Math.random().toString(36).slice(2);
      const temp = { id: tempId, calendarId, source: "google", editable: true, color: "#4285F4", allDay: false, recurring: false, ...input };
      patchCache((evs) => [...evs, temp]);
      try {
        const res = await api.post("/calendar/events", { calendarId, ...input, tz: TZ });
        // troca o id temporário pelo real (sem recarregar a agenda)
        patchOne(calendarId, tempId, { id: res?.id || tempId, meetLink: res?.meetLink ?? null });
        return res;
      } catch (err) {
        restore(snap); onReconnectError(err); throw err;
      }
    },
    updateEvent: async (calendarId, eventId, patch) => {
      const snap = snapshot();
      // addMeet não é campo visual; não aplica no cache otimista.
      const visual = { ...patch };
      delete visual.addMeet;
      patchOne(calendarId, eventId, visual);
      try {
        const res = await api.patch(`/calendar/events/${enc(calendarId)}/${enc(eventId)}`, { ...patch, tz: TZ });
        if (res?.meetLink) patchOne(calendarId, eventId, { meetLink: res.meetLink });
        return res;
      } catch (err) {
        restore(snap); onReconnectError(err); throw err;
      }
    },
    deleteEvent: async (calendarId, eventId) => {
      const snap = snapshot();
      patchCache((evs) => evs.filter((e) => !(e.id === eventId && e.calendarId === calendarId)));
      try {
        await api.del(`/calendar/events/${enc(calendarId)}/${enc(eventId)}`);
      } catch (err) {
        restore(snap); onReconnectError(err); throw err;
      }
    },
  };
}
