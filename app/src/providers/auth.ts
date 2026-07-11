import { createAuthClient } from "better-auth/react";

/**
 * better-auth 浏览器客户端。
 * - useSession() 读取当前会话（自动轮询/缓存）
 * - signIn.email / signUp.email / signOut 用于登录注册登出
 * - 默认 baseURL 取 window.location.origin，与后端 /api/auth/* 对接
 */
export const authClient = createAuthClient();

export const { useSession, signIn, signOut, signUp } = authClient;
