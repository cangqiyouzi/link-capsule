import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import { auth } from "./auth";

type SessionData = typeof auth.$Infer.Session;

export type TrpcContext = {
  req: Request;
  resHeaders: Headers;
  session: SessionData | null;
  user: SessionData["user"] | null;
};

export async function createContext(
  opts: FetchCreateContextFnOptions,
): Promise<TrpcContext> {
  const session = await auth.api.getSession({ headers: opts.req.headers });
  return {
    req: opts.req,
    resHeaders: opts.resHeaders,
    session: session ?? null,
    user: session?.user ?? null,
  };
}
