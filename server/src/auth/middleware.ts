import type { Request, Response, NextFunction } from "express";
import { COOKIE_NAME, verifyToken } from "./jwt.js";

// Augmenta o Request do Express com o userId autenticado.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.[COOKIE_NAME];
  const userId = token ? verifyToken(token) : null;
  if (!userId) {
    return res.status(401).json({ error: "Não autenticado" });
  }
  req.userId = userId;
  next();
}
