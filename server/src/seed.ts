import { prisma } from "./prisma.js";
import { todayKey } from "./lib/dates.js";

// Portado de memorai-pkg/src/db.js (DEFAULT_RULES / SEED_TASKS / _seed).
const DEFAULT_RULES = [
  "Acordar antes das 7:30",
  "Treinar pelo menos 1h",
  "30 min de leitura",
  "Seguir dieta saudável",
  "Beber 2L de água",
  "1h de estudos",
  "Registrar no diário",
];

const SEED_TASKS = [
  "Fazer benchmark pra saber por que existimos",
  "Gravar o vídeo do McDonald's",
  "Integrar slides com roteiro da apresentação",
  "Organizar o webinário",
];

// Cria dados iniciais para uma conta nova, pra tela não nascer vazia.
export async function seedForUser(userId: string) {
  const tk = todayKey();

  await prisma.task.createMany({
    data: SEED_TASKS.map((text) => ({ userId, text, done: false, date: tk })),
  });

  // Obs.: a agenda agora é o Google Calendar (não semeamos eventos locais).

  const challenge = await prisma.challenge.create({
    data: {
      userId,
      name: "Desafio 30 dias — Alta Performance",
      description: "Manter os pilares diários de disciplina por 30 dias. Sem quebrar a corrente.",
      startDate: tk,
      days: 30,
      rules: DEFAULT_RULES,
    },
  });

  await prisma.user.update({
    where: { id: userId },
    data: { activeChallengeId: challenge.id },
  });
}
