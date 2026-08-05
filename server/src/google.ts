import { google } from "googleapis";
import { env } from "./env.js";
import { toKey, pad } from "./lib/dates.js";

// Scopes: login (openid/email/profile) + leitura E ESCRITA do calendário
// (criar/editar/apagar eventos e listar calendários).
export const GOOGLE_SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/calendar",
];

export function makeOAuthClient() {
  return new google.auth.OAuth2(
    env.google.clientId,
    env.google.clientSecret,
    env.google.redirectUri
  );
}

// URL de consentimento. `state` carrega se é login novo ou vínculo de conta existente.
export function getAuthUrl(state: string) {
  const client = makeOAuthClient();
  return client.generateAuthUrl({
    access_type: "offline", // necessário para receber refresh_token
    prompt: "consent", // força devolver refresh_token mesmo em re-login
    scope: GOOGLE_SCOPES,
    state,
  });
}

export interface GoogleProfile {
  googleId: string;
  email: string;
  name: string;
  refreshToken: string | null;
}

// Troca o código de autorização por tokens + perfil do usuário.
export async function exchangeCode(code: string): Promise<GoogleProfile> {
  const client = makeOAuthClient();
  const { tokens } = await client.getToken(code);
  client.setCredentials(tokens);

  const oauth2 = google.oauth2({ version: "v2", auth: client });
  const { data } = await oauth2.userinfo.get();

  return {
    googleId: data.id!,
    email: data.email!,
    name: data.name ?? "",
    refreshToken: tokens.refresh_token ?? null,
  };
}

// Cliente do Calendar autenticado a partir do refresh token do usuário.
function calendarClient(refreshToken: string) {
  const client = makeOAuthClient();
  client.setCredentials({ refresh_token: refreshToken });
  return google.calendar({ version: "v3", auth: client });
}

/* ---------------- Calendários ---------------- */

export interface CalendarInfo {
  id: string;
  summary: string;
  primary: boolean;
  color: string;
  editable: boolean;
}

export async function listCalendars(refreshToken: string): Promise<CalendarInfo[]> {
  const calendar = calendarClient(refreshToken);
  const { data } = await calendar.calendarList.list({ maxResults: 250 });
  return (data.items ?? []).map((c) => ({
    id: c.id!,
    summary: c.summaryOverride ?? c.summary ?? c.id!,
    primary: Boolean(c.primary),
    color: c.backgroundColor ?? "#4285F4",
    editable: c.accessRole === "owner" || c.accessRole === "writer",
  }));
}

/* ---------------- Eventos ---------------- */

export interface CalendarEvent {
  id: string;
  calendarId: string;
  text: string;
  date: string; // YYYY-MM-DD
  start: number; // minutos a partir da meia-noite
  dur: number; // minutos
  allDay: boolean;
  recurring: boolean;
  editable: boolean;
  color: string;
  meetLink: string | null;
  location: string;
  description: string;
  source: "google";
}

// Converte "YYYY-MM-DD" + minutos-da-meia-noite -> "YYYY-MM-DDTHH:mm:ss" (sem offset;
// o offset vem do timeZone enviado ao Google).
function toDateTime(date: string, minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${date}T${pad(h)}:${pad(m)}:00`;
}

// Soma minutos a um "YYYY-MM-DD"+min, devolvendo {date, minutes} (trata virar o dia).
function addMinutes(date: string, minutes: number, add: number) {
  const base = new Date(`${date}T00:00:00`);
  base.setMinutes(base.getMinutes() + minutes + add);
  return { date: toKey(base), minutes: base.getHours() * 60 + base.getMinutes() };
}

function normalizeEvent(
  ev: any,
  calendarId: string,
  editable: boolean,
  color: string
): CalendarEvent | null {
  if (ev.status === "cancelled") return null;
  const text = ev.summary ?? "(sem título)";
  const recurring = Boolean(ev.recurringEventId);
  const extras = {
    meetLink: ev.hangoutLink ?? null,
    location: ev.location ?? "",
    description: ev.description ?? "",
  };

  if (ev.start?.date) {
    return {
      id: ev.id, calendarId, text, date: ev.start.date, start: 0, dur: 24 * 60,
      allDay: true, recurring, editable, color, ...extras, source: "google",
    };
  }
  if (ev.start?.dateTime && ev.end?.dateTime) {
    const s = new Date(ev.start.dateTime);
    const e = new Date(ev.end.dateTime);
    const start = s.getHours() * 60 + s.getMinutes();
    let dur = Math.round((e.getTime() - s.getTime()) / 60000);
    if (dur <= 0) dur = 30;
    return {
      id: ev.id, calendarId, text, date: toKey(s), start, dur,
      allDay: false, recurring, editable, color, ...extras, source: "google",
    };
  }
  return null;
}

// Lê eventos dos calendários indicados entre from e to (YYYY-MM-DD).
export async function listCalendarEvents(
  refreshToken: string,
  fromKey: string,
  toKey_: string,
  calendarIds?: string[]
): Promise<CalendarEvent[]> {
  const calendar = calendarClient(refreshToken);
  const cals = await listCalendars(refreshToken);
  const chosen = calendarIds?.length
    ? cals.filter((c) => calendarIds.includes(c.id))
    : cals.filter((c) => c.primary);

  const timeMin = new Date(fromKey + "T00:00:00").toISOString();
  const timeMax = new Date(toKey_ + "T23:59:59").toISOString();

  const perCal = await Promise.all(
    chosen.map(async (c) => {
      try {
        const { data } = await calendar.events.list({
          calendarId: c.id,
          timeMin,
          timeMax,
          singleEvents: true, // expande recorrências
          orderBy: "startTime",
          maxResults: 500,
        });
        return (data.items ?? [])
          .map((ev) => normalizeEvent(ev, c.id, c.editable, c.color))
          .filter((e): e is CalendarEvent => e !== null);
      } catch {
        return [];
      }
    })
  );
  return perCal.flat();
}

export interface EventInput {
  text: string;
  date: string;
  start: number;
  dur: number;
  allDay?: boolean;
  location?: string;
  description?: string;
  addMeet?: boolean;
  tz: string;
}

// requestId estável o suficiente para uma criação de conferência.
function meetRequest() {
  return {
    conferenceData: {
      createRequest: {
        requestId: "memorai-" + Date.now() + "-" + Math.floor(Math.random() * 1e6),
        conferenceSolutionKey: { type: "hangoutsMeet" },
      },
    },
  };
}

export async function createCalendarEvent(refreshToken: string, calendarId: string, i: EventInput) {
  const calendar = calendarClient(refreshToken);
  const requestBody: any = buildRequestBody(i);
  if (i.location !== undefined) requestBody.location = i.location;
  if (i.description !== undefined) requestBody.description = i.description;
  const wantMeet = i.addMeet === true;
  if (wantMeet) Object.assign(requestBody, meetRequest());
  const { data } = await calendar.events.insert({
    calendarId,
    requestBody,
    conferenceDataVersion: wantMeet ? 1 : 0,
  });
  return data;
}

export async function updateCalendarEvent(
  refreshToken: string,
  calendarId: string,
  eventId: string,
  patch: Partial<EventInput>
) {
  const calendar = calendarClient(refreshToken);
  const requestBody: any = {};
  if (patch.text !== undefined) requestBody.summary = patch.text;
  if (patch.location !== undefined) requestBody.location = patch.location;
  if (patch.description !== undefined) requestBody.description = patch.description;
  // Se qualquer campo de horário mudou, precisamos reenviar start+end completos.
  if (patch.date !== undefined || patch.start !== undefined || patch.dur !== undefined || patch.allDay !== undefined) {
    Object.assign(requestBody, timeBody(patch as EventInput));
  }
  const wantMeet = patch.addMeet === true;
  if (wantMeet) Object.assign(requestBody, meetRequest());
  const { data } = await calendar.events.patch({
    calendarId,
    eventId,
    requestBody,
    conferenceDataVersion: wantMeet ? 1 : 0,
  });
  return data;
}

export async function deleteCalendarEvent(refreshToken: string, calendarId: string, eventId: string) {
  const calendar = calendarClient(refreshToken);
  await calendar.events.delete({ calendarId, eventId });
}

function timeBody(i: EventInput) {
  if (i.allDay) {
    const end = addMinutes(i.date, 0, 24 * 60);
    return { start: { date: i.date }, end: { date: end.date } };
  }
  const endParts = addMinutes(i.date, i.start, i.dur);
  return {
    start: { dateTime: toDateTime(i.date, i.start), timeZone: i.tz },
    end: { dateTime: toDateTime(endParts.date, endParts.minutes), timeZone: i.tz },
  };
}

function buildRequestBody(i: EventInput) {
  return { summary: i.text, ...timeBody(i) };
}
