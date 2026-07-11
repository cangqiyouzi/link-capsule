import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { getDb } from "./queries/connection";
import { user, session, account, verification } from "@db/schema";
import { env } from "./lib/env";

/**
 * better-auth 实例。
 * - 使用 Drizzle adapter 接入既有 MySQL schema（user/session/account/verification）。
 * - 启用邮箱 + 密码登录（Phase 0 暂不接 OAuth）。
 * - cookie 通过 baseURL 与 secret 保证跨设备 session 一致。
 */
export const auth = betterAuth({
  database: drizzleAdapter(getDb(), {
    provider: "mysql",
    schema: { user, session, account, verification },
  }),
  baseURL: env.betterAuthUrl,
  secret: env.betterAuthSecret,
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    autoSignIn: false,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 天
    updateAge: 60 * 60 * 24, // 1 天内访问刷新过期
  },
});

export type Auth = typeof auth;
