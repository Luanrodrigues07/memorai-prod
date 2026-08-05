import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma.js";
import { env } from "../env.js";
import {
  listCalendars,
  listCalendarEvents,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
} from "../google.js";
import { todayKey } from "../lib/dates.js";

export const calendarRouter = Router();

// Busca o refresh token do usuário; responde 400 se não conectado.
async function tokenFor(userId: string): Promise<string | null> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  return user?.googleRefreshToken ?? null;
}

// Traduz erros do Google em respostas úteis. Retorna true se já respondeu.
async function handleGoogleError(err: any, userId: string, res: any): Promise<boolean> {
  const status = err?.code ?? err?.response?.status;
  const reason = err?.errors?.[0]?.reason ?? err?.response?.data?.error;
  const msg = String(err?.message ?? "");

  // Token revogado/expirado → desconecta e pede reconexão.
  if (reason === "invalid_grant" || msg.includes("invalid_grant")) {
    await prisma.user.update({ where: { id: userId }, data: { googleRefreshToken: null } });
    res.status(401).json({ error: "reconnect" });
    return true;
  }
  // Escopo insuficiente (token antigo só-leitura) → precisa reconectar com novo escopo.
  if (status === 403 && (reason === "insufficientPermissions" || msg.toLowerCase().includes("insufficient"))) {
    res.status(403).json({ error: "reconnect" });
    return true;
  }
  return false;
}

/* ---------------- status / calendários ---------------- */

// GET /api/calendar/status -> { configured, connected }
calendarRouter.get("/status", async (req, res) => {
  const token = await tokenFor(req.userId!);
  res.json({ configured: env.google.configured, connected: Boolean(token) });
});

// GET /api/calendar/list -> calendários do usuário (para o seletor)
calendarRouter.get("/list", async (req, res) => {
  const token = await tokenFor(req.userId!);
  if (!token) return res.json({ connected: false, calendars: [] });
  try {
    const calendars = await listCalendars(token);
    res.json({ connected: true, calendars });
  } catch (err) {
    if (await handleGoogleError(err, req.userId!, res)) return;
    console.error("Erro ao listar calendários:", err);
    res.status(502).json({ error: "Falha ao listar calendários" });
  }
});

/* ---------------- eventos ---------------- */

// GET /api/calendar/events?from&to&calendarIds=a,b
calendarRouter.get("/events", async (req, res) => {
  const token = await tokenFor(req.userId!);
  if (!token) return res.json({ connected: false, events: [] });

  const from = (req.query.from as string) ?? todayKey();
  const to = (req.query.to as string) ?? from;
  const idsParam = (req.query.calendarIds as string) ?? "";
  const calendarIds = idsParam ? idsParam.split(",").filter(Boolean) : undefined;

  try {
    const events = await listCalendarEvents(token, from, to, calendarIds);
    res.json({ connected: true, events });
  } catch (err) {
    if (await handleGoogleError(err, req.userId!, res)) return;
    console.error("Erro ao ler Google Calendar:", err);
    res.status(502).json({ connected: true, events: [], error: "Falha ao ler o Google Calendar" });
  }
});

const eventBody = z.object({
  calendarId: z.string().min(1),
  text: z.string().trim().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  start: z.number().int().min(0).max(1440),
  dur: z.number().int().min(5).max(1440),
  allDay: z.boolean().optional(),
  location: z.string().max(500).optional(),
  description: z.string().max(4000).optional(),
  addMeet: z.boolean().optional(),
  tz: z.string().min(1),
});

// POST /api/calendar/events
calendarRouter.post("/events", async (req, res) => {
  const token = await tokenFor(req.userId!);
  if (!token) return res.status(400).json({ error: "Google não conectado" });
  const parsed = eventBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });

  const { calendarId, ...input } = parsed.data;
  try {
    const created = await createCalendarEvent(token, calendarId, input);
    res.status(201).json({ id: created.id, meetLink: created.hangoutLink ?? null });
  } catch (err) {
    if (await handleGoogleError(err, req.userId!, res)) return;
    console.error("Erro ao criar evento:", err);
    res.status(502).json({ error: "Falha ao criar evento no Google" });
  }
});

const patchBody = z.object({
  text: z.string().trim().min(1).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  start: z.number().int().min(0).max(1440).optional(),
  dur: z.number().int().min(5).max(1440).optional(),
  allDay: z.boolean().optional(),
  location: z.string().max(500).optional(),
  description: z.string().max(4000).optional(),
  addMeet: z.boolean().optional(),
  tz: z.string().min(1),
});

// PATCH /api/calendar/events/:calendarId/:eventId
calendarRouter.patch("/events/:calendarId/:eventId", async (req, res) => {
  const token = await tokenFor(req.userId!);
  if (!token) return res.status(400).json({ error: "Google não conectado" });
  const parsed = patchBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });

  try {
    const updated = await updateCalendarEvent(
      token,
      decodeURIComponent(req.params.calendarId),
      decodeURIComponent(req.params.eventId),
      parsed.data
    );
    res.json({ ok: true, meetLink: updated.hangoutLink ?? null });
  } catch (err) {
    if (await handleGoogleError(err, req.userId!, res)) return;
    console.error("Erro ao editar evento:", err);
    res.status(502).json({ error: "Falha ao editar evento no Google" });
  }
});

// DELETE /api/calendar/events/:calendarId/:eventId
calendarRouter.delete("/events/:calendarId/:eventId", async (req, res) => {
  const token = await tokenFor(req.userId!);
  if (!token) return res.status(400).json({ error: "Google não conectado" });
  try {
    await deleteCalendarEvent(
      token,
      decodeURIComponent(req.params.calendarId),
      decodeURIComponent(req.params.eventId)
    );
    res.json({ ok: true });
  } catch (err) {
    if (await handleGoogleError(err, req.userId!, res)) return;
    console.error("Erro ao apagar evento:", err);
    res.status(502).json({ error: "Falha ao apagar evento no Google" });
  }
});
