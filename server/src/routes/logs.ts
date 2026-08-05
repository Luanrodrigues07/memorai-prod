import { Router } from "express";
import { prisma } from "../prisma.js";

export const logsRouter = Router();

// GET /api/logs?from=YYYY-MM-DD&to=YYYY-MM-DD
// Devolve os logs (para os "dots" da visão de mês). Retorna um mapa
// { `${challengeId}:${date}`: boolean[] } pronto pro frontend.
logsRouter.get("/", async (req, res) => {
  const { from, to } = req.query as { from?: string; to?: string };
  const where: any = { userId: req.userId! };
  if (from && to) where.date = { gte: from, lte: to };

  const logs = await prisma.log.findMany({ where });
  const map: Record<string, boolean[]> = {};
  for (const l of logs) map[`${l.challengeId}:${l.date}`] = l.values as boolean[];
  res.json(map);
});
