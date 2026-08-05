import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma.js";
import { todayKey } from "../lib/dates.js";
import { enrichChallenge, logsMap, type ChallengeLike } from "../lib/challengeMetrics.js";

export const challengesRouter = Router();

// Carrega os desafios do usuário + logs, e devolve tudo já com métricas calculadas.
async function loadEnriched(userId: string) {
  const [challenges, logs, user] = await Promise.all([
    prisma.challenge.findMany({ where: { userId }, orderBy: { createdAt: "desc" } }),
    prisma.log.findMany({ where: { userId } }),
    prisma.user.findUnique({ where: { id: userId } }),
  ]);
  const lmap = logsMap(
    logs.map((l) => ({ challengeId: l.challengeId, date: l.date, values: l.values as boolean[] }))
  );
  const activeId = user?.activeChallengeId ?? null;
  const list = challenges.map((c) =>
    enrichChallenge(
      { id: c.id, startDate: c.startDate, days: c.days, rules: c.rules as string[] } as ChallengeLike,
      lmap
    )
  );
  // Re-anexa os campos originais que o enrich não repassa (name/description).
  const byId = new Map(challenges.map((c) => [c.id, c]));
  return {
    activeId,
    challenges: list.map((e) => ({
      ...e,
      name: byId.get(e.id)!.name,
      description: byId.get(e.id)!.description,
      createdAt: byId.get(e.id)!.createdAt,
    })),
  };
}

// GET /api/challenges -> { activeId, challenges: [...enriquecidos] }
challengesRouter.get("/", async (req, res) => {
  res.json(await loadEnriched(req.userId!));
});

const createSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(500).optional().default(""),
  days: z.number().int().min(1).max(3650),
  rules: z.array(z.string().trim().min(1)).min(1),
});

// POST /api/challenges — cria e já torna ativo (como o createChallenge do Dexie).
challengesRouter.post("/", async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });

  const challenge = await prisma.challenge.create({
    data: {
      userId: req.userId!,
      name: parsed.data.name,
      description: parsed.data.description,
      days: parsed.data.days,
      rules: parsed.data.rules,
      startDate: todayKey(),
    },
  });
  await prisma.user.update({
    where: { id: req.userId! },
    data: { activeChallengeId: challenge.id },
  });
  res.status(201).json(challenge);
});

// PUT /api/challenges/active { id }
challengesRouter.put("/active", async (req, res) => {
  const parsed = z.object({ id: z.string() }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "id obrigatório" });
  const owned = await prisma.challenge.findFirst({
    where: { id: parsed.data.id, userId: req.userId! },
  });
  if (!owned) return res.status(404).json({ error: "Desafio não encontrado" });
  await prisma.user.update({
    where: { id: req.userId! },
    data: { activeChallengeId: parsed.data.id },
  });
  res.json({ ok: true });
});

// DELETE /api/challenges/:id — apaga o desafio e seus logs; reajusta o ativo.
challengesRouter.delete("/:id", async (req, res) => {
  const id = req.params.id;
  const owned = await prisma.challenge.findFirst({ where: { id, userId: req.userId! } });
  if (!owned) return res.status(404).json({ error: "Desafio não encontrado" });

  await prisma.challenge.delete({ where: { id } }); // logs caem por cascade

  const user = await prisma.user.findUnique({ where: { id: req.userId! } });
  if (user?.activeChallengeId === id) {
    const next = await prisma.challenge.findFirst({
      where: { userId: req.userId! },
      orderBy: { createdAt: "desc" },
    });
    await prisma.user.update({
      where: { id: req.userId! },
      data: { activeChallengeId: next?.id ?? null },
    });
  }
  res.json({ ok: true });
});

// POST /api/challenges/:id/toggle { ruleIdx, date? } — alterna uma regra (toggleRule).
challengesRouter.post("/:id/toggle", async (req, res) => {
  const parsed = z
    .object({
      ruleIdx: z.number().int().min(0),
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    })
    .safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Dados inválidos" });

  const challenge = await prisma.challenge.findFirst({
    where: { id: req.params.id, userId: req.userId! },
  });
  if (!challenge) return res.status(404).json({ error: "Desafio não encontrado" });

  const rules = challenge.rules as string[];
  const { ruleIdx } = parsed.data;
  if (ruleIdx >= rules.length) return res.status(400).json({ error: "Regra inexistente" });

  const date = parsed.data.date ?? todayKey();
  const existing = await prisma.log.findUnique({
    where: { challengeId_date: { challengeId: challenge.id, date } },
  });

  const values: boolean[] = existing ? [...(existing.values as boolean[])] : Array(rules.length).fill(false);
  while (values.length < rules.length) values.push(false);
  values[ruleIdx] = !values[ruleIdx];

  await prisma.log.upsert({
    where: { challengeId_date: { challengeId: challenge.id, date } },
    create: { userId: req.userId!, challengeId: challenge.id, date, values },
    update: { values },
  });
  res.json({ ok: true });
});
