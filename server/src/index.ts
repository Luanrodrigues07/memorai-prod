import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { env } from "./env.js";
import { requireAuth } from "./auth/middleware.js";
import { authRouter } from "./routes/auth.js";
import { tasksRouter } from "./routes/tasks.js";
import { challengesRouter } from "./routes/challenges.js";
import { logsRouter } from "./routes/logs.js";
import { calendarRouter } from "./routes/calendar.js";
import { COOKIE_NAME, verifyToken } from "./auth/jwt.js";

const app = express();

app.use(
  cors({
    origin: env.clientOrigin,
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

// Injeta req.userId quando houver sessão (não bloqueia — usado pelo /auth/google).
app.use((req, _res, next) => {
  const token = req.cookies?.[COOKIE_NAME];
  const uid = token ? verifyToken(token) : null;
  if (uid) req.userId = uid;
  next();
});

app.get("/api/health", (_req, res) => res.json({ ok: true }));

// Auth (público, exceto /me que valida internamente).
app.use("/api/auth", authRouter);

// Recursos protegidos.
app.use("/api/tasks", requireAuth, tasksRouter);
app.use("/api/challenges", requireAuth, challengesRouter);
app.use("/api/logs", requireAuth, logsRouter);
app.use("/api/calendar", requireAuth, calendarRouter);

// Em produção, serve o frontend já buildado (mesma origem que a API).
const clientDist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../memorai-pkg/dist");
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  // SPA fallback: qualquer rota GET que não seja /api devolve o index.html.
  app.use((req, res, next) => {
    if (req.method !== "GET" || req.path.startsWith("/api")) return next();
    res.sendFile(path.join(clientDist, "index.html"));
  });
  console.log("→ Servindo frontend de", clientDist);
}

// Handler de erro genérico.
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "Erro interno" });
});

app.listen(env.port, () => {
  console.log(`API Memorai rodando em http://localhost:${env.port}`);
  if (!env.google.configured) {
    console.log("→ Google OAuth ainda não configurado (.env). Login por e-mail/senha funciona normalmente.");
  }
});
