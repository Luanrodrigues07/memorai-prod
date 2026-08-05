import jwt from "jsonwebtoken";
import type { Response } from "express";
import { env } from "../env.js";

const COOKIE_NAME = "memorai_session";
const MAX_AGE_MS = 1000 * 60 * 60 * 24 * 30; // 30 dias

export function signToken(userId: string): string {
  return jwt.sign({ uid: userId }, env.jwtSecret, { expiresIn: "30d" });
}

export function verifyToken(token: string): string | null {
  try {
    const payload = jwt.verify(token, env.jwtSecret) as { uid?: string };
    return payload.uid ?? null;
  } catch {
    return null;
  }
}

export function setSessionCookie(res: Response, userId: string) {
  res.cookie(COOKIE_NAME, signToken(userId), {
    httpOnly: true,
    sameSite: "lax",
    secure: env.isProd,
    maxAge: MAX_AGE_MS,
    path: "/",
  });
}

export function clearSessionCookie(res: Response) {
  res.clearCookie(COOKIE_NAME, { path: "/" });
}

export { COOKIE_NAME };
