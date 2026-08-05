import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma.js";
import { todayKey } from "../lib/dates.js";
import { listCalendars, createCalendarEvent } from "../google.js";

export const tasksRouter = Router();

// GET /api/tasks — ordenadas por criação (como o orderBy("createdAt") do Dexie).
tasksRouter.get("/", async (req, res) => {
  const tasks = await prisma.task.findMany({
    where: { userId: req.userId! },
    orderBy: { createdAt: "asc" },
  });
  res.json(tasks);
});

const dateRe = /^\d{4}-\d{2}-\d{2}$/;

// POST /api/tasks { text, date? } — date default = hoje
tasksRouter.post("/", async (req, res) => {
  const parsed = z
    .object({ text: z.string().trim().min(1), date: z.string().regex(dateRe).optional() })
    .safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Texto obrigatório" });
  const task = await prisma.task.create({
    data: { userId: req.userId!, text: parsed.data.text, date: parsed.data.date ?? todayKey() },
  });
  res.status(201).json(task);
});

// PATCH /api/tasks/:id { done?, text?, date? } — date muda o dia da tarefa
tasksRouter.patch("/:id", async (req, res) => {
  const parsed = z
    .object({
      done: z.boolean().optional(),
      text: z.string().trim().min(1).optional(),
      date: z.string().regex(dateRe).optional(),
    })
    .safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Dados inválidos" });

  const { count } = await prisma.task.updateMany({
    where: { id: req.params.id, userId: req.userId! },
    data: parsed.data,
  });
  if (!count) return res.status(404).json({ error: "Tarefa não encontrada" });
  res.json({ ok: true });
});

// DELETE /api/tasks/:id
tasksRouter.delete("/:id", async (req, res) => {
  await prisma.task.deleteMany({ where: { id: req.params.id, userId: req.userId! } });
  res.json({ ok: true });
});

// POST /api/tasks/:id/schedule { date?, start?, dur?, tz } — task -> evento no Google.
tasksRouter.post("/:id/schedule", async (req, res) => {
  const parsed = z
    .object({
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      start: z.number().int().min(0).max(1440).optional(),
      dur: z.number().int().min(5).max(1440).optional(),
      tz: z.string().min(1).optional(),
    })
    .safeParse(req.body ?? {});
  if (!parsed.success) return res.status(400).json({ error: "Dados inválidos" });

  const task = await prisma.task.findFirst({ where: { id: req.params.id, userId: req.userId! } });
  if (!task) return res.status(404).json({ error: "Tarefa não encontrada" });

  const user = await prisma.user.findUnique({ where: { id: req.userId! } });
  if (!user?.googleRefreshToken) {
    return res.status(400).json({ error: "Conecte o Google Calendar para agendar tarefas" });
  }

  const date = parsed.data.date ?? todayKey();
  const start = parsed.data.start ?? 9 * 60;
  const dur = parsed.data.dur ?? 60;
  const tz = parsed.data.tz ?? "America/Sao_Paulo";

  try {
    // Cria no calendário principal (editável) e remove a tarefa.
    const cals = await listCalendars(user.googleRefreshToken);
    const primary = cals.find((c) => c.primary && c.editable) ?? cals.find((c) => c.editable);
    if (!primary) return res.status(400).json({ error: "Nenhum calendário editável encontrado" });

    const created = await createCalendarEvent(user.googleRefreshToken, primary.id, {
      text: task.text, date, start, dur, tz,
    });
    await prisma.task.delete({ where: { id: task.id } });
    res.status(201).json({ id: created.id, calendarId: primary.id });
  } catch (err) {
    console.error("Erro ao agendar tarefa no Google:", err);
    res.status(502).json({ error: "Falha ao agendar no Google" });
  }
});
