import { initTRPC, TRPCError } from "@trpc/server";
import { cookies } from "next/headers";
import superjson from "superjson";

export interface AWSCredentials {
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken?: string;
  region: string;
  isSSO: boolean;
}

export interface Session {
  credentials?: AWSCredentials;
}

const sessionStore = new Map<string, Session>();

function generateSessionId(): string {
  return crypto.randomUUID();
}

export async function getSession(): Promise<{
  session: Session;
  sessionId: string;
}> {
  const cookieStore = await cookies();
  let sessionId = cookieStore.get("session_id")?.value;

  if (!sessionId || !sessionStore.has(sessionId)) {
    sessionId = generateSessionId();
    sessionStore.set(sessionId, {});
  }

  return {
    session: sessionStore.get(sessionId) || {},
    sessionId,
  };
}

export async function setSessionCookie(sessionId: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set("session_id", sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24, // 24 hours
  });
}

export function updateSession(sessionId: string, session: Session): void {
  sessionStore.set(sessionId, session);
}

export function clearSession(sessionId: string): void {
  sessionStore.delete(sessionId);
}

export async function createContext() {
  const { session, sessionId } = await getSession();
  return { session, sessionId };
}

export type Context = Awaited<ReturnType<typeof createContext>>;

const t = initTRPC.context<Context>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.session.credentials) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Not authenticated",
    });
  }
  return next({
    ctx: {
      ...ctx,
      credentials: ctx.session.credentials,
    },
  });
});
