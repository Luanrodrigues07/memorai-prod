import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../prisma.js";
import { env } from "../env.js";
import { setSessionCookie, clearSessionCookie } from "../auth/jwt.js";
import { requireAuth } from "../auth/middleware.js";
import { seedForUser } from "../seed.js";
import { getAuthUrl, exchangeCode } from "../google.js";

export const authRouter = Router();

const credsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6, "A senha precisa ter ao menos 6 caracteres"),
  name: z.string().trim().max(80).optional(),
});

function publicUser(u: { id: string; email: string; name: string; avatarUrl: string | null; googleId: string | null; googleRefreshToken: string | null }) {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    avatarUrl: u.avatarUrl,
    googleConnected: Boolean(u.googleId && u.googleRefreshToken),
  };
}

/* ---------- e-mail / senha ---------- */

authRouter.post("/register", async (req, res) => {
  const parsed = credsSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });
  const { email, password, name } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return res.status(409).json({ error: "Já existe uma conta com esse e-mail" });

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { email, name: name ?? "", passwordHash },
  });
  await seedForUser(user.id);

  setSessionCookie(res, user.id);
  res.status(201).json(publicUser(user));
});

authRouter.post("/login", async (req, res) => {
  const parsed = credsSchema.omit({ name: true }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });
  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.passwordHash) {
    return res.status(401).json({ error: "E-mail ou senha inválidos" });
  }
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: "E-mail ou senha inválidos" });

  setSessionCookie(res, user.id);
  res.json(publicUser(user));
});

authRouter.post("/logout", (_req, res) => {
  clearSessionCookie(res);
  res.json({ ok: true });
});

authRouter.get("/me", requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.userId! } });
  if (!user) return res.status(401).json({ error: "Não autenticado" });
  res.json(publicUser(user));
});

// PATCH /api/auth/profile { name?, avatarUrl? } — edita nome/foto do perfil.
const profileSchema = z.object({
  name: z.string().trim().max(80).optional(),
  // data URL de imagem (ou string vazia para remover). Limite ~2MB em base64.
  avatarUrl: z.string().max(2_800_000).nullable().optional(),
});

authRouter.patch("/profile", requireAuth, async (req, res) => {
  const parsed = profileSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });

  const data: { name?: string; avatarUrl?: string | null } = {};
  if (parsed.data.name !== undefined) data.name = parsed.data.name;
  if (parsed.data.avatarUrl !== undefined) data.avatarUrl = parsed.data.avatarUrl || null;

  const user = await prisma.user.update({ where: { id: req.userId! }, data });
  res.json(publicUser(user));
});

/* ---------- Google OAuth ---------- */

// Inicia o fluxo. Se já houver sessão, o state carrega o userId para VINCULAR
// a conta Google (e o calendário) ao usuário logado, em vez de criar outra.
authRouter.get("/google", (req, res) => {
  if (!env.google.configured) {
    return res.status(503).json({ error: "Google OAuth não configurado no servidor (.env)" });
  }
  const linkUserId = req.userId ?? "";
  const state = Buffer.from(JSON.stringify({ link: linkUserId })).toString("base64url");
  res.redirect(getAuthUrl(state));
});

authRouter.get("/google/callback", async (req, res) => {
  const code = String(req.query.code ?? "");
  if (!code) return res.redirect(`${env.clientOrigin}/?google=erro`);

  let linkUserId = "";
  try {
    const state = JSON.parse(Buffer.from(String(req.query.state ?? ""), "base64url").toString());
    linkUserId = state.link ?? "";
  } catch {
    /* state ausente/ inválido — segue como login novo */
  }

  try {
    const profile = await exchangeCode(code);

    // Só sobrescreve o refresh token se o Google mandou um novo nesta troca.
    const tokenData = profile.refreshToken ? { googleRefreshToken: profile.refreshToken } : {};

    let user;
    if (linkUserId) {
      // Vinculando a um usuário já logado (ex.: entrou por e-mail/senha e quer o Calendar).
      user = await prisma.user.update({
        where: { id: linkUserId },
        data: { googleId: profile.googleId, ...tokenData },
      });
    } else {
      // Login/registro por Google: acha por googleId ou por e-mail; senão cria.
      user =
        (await prisma.user.findUnique({ where: { googleId: profile.googleId } })) ??
        (await prisma.user.findUnique({ where: { email: profile.email } }));

      if (user) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { googleId: profile.googleId, ...tokenData },
        });
      } else {
        user = await prisma.user.create({
          data: {
            email: profile.email,
            name: profile.name,
            googleId: profile.googleId,
            ...tokenData,
          },
        });
        await seedForUser(user.id);
      }
    }

    setSessionCookie(res, user.id);
    res.redirect(`${env.clientOrigin}/?google=ok`);
  } catch (err) {
    console.error("Erro no callback do Google:", err);
    res.redirect(`${env.clientOrigin}/?google=erro`);
  }
});
