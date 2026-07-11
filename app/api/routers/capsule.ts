import { randomUUID } from "node:crypto";
import { z } from "zod";
import { createRouter, protectedProcedure, publicQuery } from "../middleware";
import { getDb } from "../queries/connection";
import { capsules, capsuleTags, tags, collectionItems, user, linkHealth } from "@db/schema";
import { eq, and, desc, asc, like, or, inArray, lt, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

type HealthStatus = "ok" | "dead" | "redirect" | "slow" | "rate_limited";

interface CheckResult {
  status: HealthStatus;
  httpCode: number | null;
  finalUrl: string | null;
  lastError: string | null;
}

async function checkUrl(url: string): Promise<CheckResult> {
  // 使用浏览器 UA 和 Accept 头，避免被部分站点的反爬虫/限流策略误判为机器人。
  const headers = {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9,zh-CN;q=0.8,zh;q=0.7",
  };

  const fetchWithTimeout = async (method: "HEAD" | "GET") => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
      const start = Date.now();
      const res = await fetch(url, {
        method,
        redirect: "follow",
        signal: controller.signal,
        headers,
      });
      return { res, elapsed: Date.now() - start };
    } finally {
      clearTimeout(timeout);
    }
  };

  let result: { res: Response; elapsed: number };
  try {
    result = await fetchWithTimeout("HEAD");
    // 很多服务器对 HEAD 支持不完整，会返回 4xx/5xx；换 GET 再确认。
    if (result.res.status >= 400) {
      result = await fetchWithTimeout("GET");
    }
  } catch {
    // HEAD 抛异常（超时、连接重置等）时，改用 GET 再试一次。
    try {
      result = await fetchWithTimeout("GET");
    } catch (err) {
      return {
        status: "dead",
        httpCode: null,
        finalUrl: null,
        lastError: err instanceof Error ? (err.name === "AbortError" ? "Timeout (8s)" : err.message) : String(err),
      };
    }
  }

  const { res, elapsed } = result;
  const code = res.status;
  if (code === 429) {
    return { status: "rate_limited", httpCode: code, finalUrl: res.url || null, lastError: "429 Too Many Requests" };
  }
  if (code >= 400) {
    return { status: "dead", httpCode: code, finalUrl: res.url || null, lastError: null };
  }
  const finalUrl = res.url || null;
  let redirected = false;
  if (finalUrl) {
    try {
      const origHost = new URL(url).host;
      const finalHost = new URL(finalUrl).host;
      redirected = origHost !== finalHost;
    } catch {
      // ignore URL parse errors
    }
  }
  if (redirected) {
    return { status: "redirect", httpCode: code, finalUrl, lastError: null };
  }
  if (elapsed > 5000) {
    return { status: "slow", httpCode: code, finalUrl, lastError: null };
  }
  return { status: "ok", httpCode: code, finalUrl, lastError: null };
}

const urlSchema = z
  .string()
  .min(1)
  .refine((u) => {
    try {
      const parsed = new URL(u);
      return parsed.protocol === "http:" || parsed.protocol === "https:";
    } catch {
      return false;
    }
  }, "URL must be a valid http:// or https:// URL");

export const capsuleRouter = createRouter({
  list: protectedProcedure
    .input(
      z
        .object({
          search: z.string().optional(),
          pinnedOnly: z.boolean().optional(),
          sort: z.enum(["newest", "oldest", "title"]).optional(),
          tagId: z.number().optional(),
          collectionId: z.number().optional(),
          healthStatus: z
            .enum(["all", "ok", "dead", "redirect", "slow", "unknown", "rate_limited"])
            .optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const db = getDb();

      const where = [eq(capsules.userId, ctx.user.id)];
      if (input?.pinnedOnly) where.push(eq(capsules.pinned, true));
      if (input?.search) {
        const p = `%${input.search}%`;
        const searchCond = or(
          like(capsules.title, p),
          like(capsules.url, p),
          like(capsules.description, p)
        );
        if (searchCond) where.push(searchCond);
      }
      if (input?.tagId) {
        const tagSub = db
          .select({ id: capsuleTags.capsuleId })
          .from(capsuleTags)
          .where(eq(capsuleTags.tagId, input.tagId));
        where.push(inArray(capsules.id, tagSub));
      }
      if (input?.collectionId) {
        const collSub = db
          .select({ id: collectionItems.capsuleId })
          .from(collectionItems)
          .where(eq(collectionItems.collectionId, input.collectionId));
        where.push(inArray(capsules.id, collSub));
      }

      const orderBy =
        input?.sort === "oldest"
          ? [desc(capsules.pinned), asc(capsules.createdAt)]
          : input?.sort === "title"
            ? [desc(capsules.pinned), asc(capsules.title)]
            : [desc(capsules.pinned), desc(capsules.createdAt)];

      const capsuleRows = await db
        .select()
        .from(capsules)
        .where(and(...where))
        .orderBy(...orderBy);

      if (capsuleRows.length === 0) return [];

      // 批量查询标签关联
      const capsuleIds = capsuleRows.map((c) => c.id);
      const tagRows = await db
        .select({
          capsuleId: capsuleTags.capsuleId,
          tagId: tags.id,
          tagName: tags.name,
          tagColor: tags.color,
        })
        .from(capsuleTags)
        .innerJoin(tags, eq(capsuleTags.tagId, tags.id))
        .where(inArray(capsuleTags.capsuleId, capsuleIds));

      const tagMap = new Map<number, { id: number; name: string; color: string | null }[]>();
      for (const t of tagRows) {
        const arr = tagMap.get(t.capsuleId) ?? [];
        arr.push({ id: t.tagId, name: t.tagName, color: t.tagColor });
        tagMap.set(t.capsuleId, arr);
      }

      // 批量查询链接健康状态
      const healthRows = await db
        .select()
        .from(linkHealth)
        .where(inArray(linkHealth.capsuleId, capsuleIds));

      const healthMap = new Map<
        number,
        {
          status: HealthStatus | "unknown";
          httpCode: number | null;
          finalUrl: string | null;
          lastCheckedAt: Date | null;
          lastError: string | null;
        }
      >();
      for (const h of healthRows) {
        healthMap.set(h.capsuleId, {
          status: h.status,
          httpCode: h.httpCode,
          finalUrl: h.finalUrl,
          lastCheckedAt: h.lastCheckedAt,
          lastError: h.lastError,
        });
      }

      const result = capsuleRows.map((c) => ({
        ...c,
        tags: tagMap.get(c.id) ?? [],
        health: healthMap.get(c.id) ?? null,
      }));

      // healthStatus 过滤（unknown 表示从未检测或状态为 unknown）
      const statusFilter = input?.healthStatus ?? "all";
      if (statusFilter === "all") return result;
      if (statusFilter === "unknown") {
        return result.filter((c) => !c.health || c.health.status === "unknown");
      }
      return result.filter((c) => c.health?.status === statusFilter);
    }),

  create: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1).max(500),
        url: urlSchema,
        color: z.string().min(1).max(20),
        description: z.string().max(2000).optional(),
        tagIds: z.array(z.number()).optional(),
        visibility: z.enum(["private", "unlisted", "public"]).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const visibility = input.visibility ?? "private";
      const shareToken =
        visibility === "unlisted" ? randomUUID() : null;
      const capsuleId = await db.transaction(async (tx) => {
        const result = await tx.insert(capsules).values({
          userId: ctx.user.id,
          title: input.title,
          url: input.url,
          color: input.color,
          description: input.description,
          visibility,
          shareToken,
        });
        const newId = Number(result[0].insertId);

        if (input.tagIds && input.tagIds.length > 0) {
          // 校验标签归属
          const owned = await tx
            .select({ id: tags.id })
            .from(tags)
            .where(and(inArray(tags.id, input.tagIds), eq(tags.userId, ctx.user.id)));
          if (owned.length !== input.tagIds.length) {
            throw new TRPCError({ code: "FORBIDDEN", message: "标签归属校验失败" });
          }
          await tx.insert(capsuleTags).values(
            input.tagIds.map((tagId) => ({ capsuleId: newId, tagId }))
          );
        }
        return newId;
      });
      return { id: capsuleId };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const [result] = await db
        .delete(capsules)
        .where(and(eq(capsules.id, input.id), eq(capsules.userId, ctx.user.id)));
      if (result.affectedRows === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "胶囊不存在" });
      }
      return { success: true };
    }),

  pin: protectedProcedure
    .input(z.object({ id: z.number(), pinned: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const [result] = await db
        .update(capsules)
        .set({ pinned: input.pinned })
        .where(and(eq(capsules.id, input.id), eq(capsules.userId, ctx.user.id)));
      if (result.affectedRows === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "胶囊不存在" });
      }
      return { success: true };
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        title: z.string().min(1).max(500).optional(),
        url: urlSchema.optional(),
        description: z.string().max(2000).nullable().optional(),
        color: z.string().min(1).max(20).optional(),
        tagIds: z.array(z.number()).optional(),
        visibility: z.enum(["private", "unlisted", "public"]).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const { id, tagIds, visibility, ...updates } = input;

      await db.transaction(async (tx) => {
        // 处理 visibility 切换 + shareToken 联动
        if (visibility) {
          let shareToken: string | null = null;
          if (visibility === "unlisted") {
            // 保留已有 token，没有则生成
            const [row] = await tx
              .select({ shareToken: capsules.shareToken })
              .from(capsules)
              .where(and(eq(capsules.id, id), eq(capsules.userId, ctx.user.id)));
            if (!row) throw new TRPCError({ code: "NOT_FOUND" });
            shareToken = row.shareToken ?? randomUUID();
          }
          const [visibilityResult] = await tx
            .update(capsules)
            .set({ visibility, shareToken })
            .where(and(eq(capsules.id, id), eq(capsules.userId, ctx.user.id)));
          if (visibilityResult.affectedRows === 0) {
            throw new TRPCError({ code: "NOT_FOUND", message: "胶囊不存在" });
          }
        }

        if (Object.keys(updates).length > 0) {
          const [result] = await tx
            .update(capsules)
            .set(updates)
            .where(and(eq(capsules.id, id), eq(capsules.userId, ctx.user.id)));
          if (result.affectedRows === 0) {
            throw new TRPCError({ code: "NOT_FOUND", message: "胶囊不存在" });
          }
        }

        if (tagIds) {
          // 校验胶囊归属
          const [capsule] = await tx
            .select({ id: capsules.id })
            .from(capsules)
            .where(and(eq(capsules.id, id), eq(capsules.userId, ctx.user.id)));
          if (!capsule) throw new TRPCError({ code: "NOT_FOUND", message: "胶囊不存在" });

          // 校验标签归属
          if (tagIds.length > 0) {
            const owned = await tx
              .select({ id: tags.id })
              .from(tags)
              .where(and(inArray(tags.id, tagIds), eq(tags.userId, ctx.user.id)));
            if (owned.length !== tagIds.length) {
              throw new TRPCError({ code: "FORBIDDEN", message: "标签归属校验失败" });
            }
          }

          await tx.delete(capsuleTags).where(eq(capsuleTags.capsuleId, id));
          if (tagIds.length > 0) {
            await tx.insert(capsuleTags).values(
              tagIds.map((tagId) => ({ capsuleId: id, tagId }))
            );
          }
        }
      });
      return { success: true };
    }),

  setVisibility: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        visibility: z.enum(["private", "unlisted", "public"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      let shareToken: string | null = null;
      if (input.visibility === "unlisted") {
        const [row] = await db
          .select({ shareToken: capsules.shareToken })
          .from(capsules)
          .where(and(eq(capsules.id, input.id), eq(capsules.userId, ctx.user.id)));
        if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "胶囊不存在" });
        shareToken = row.shareToken ?? randomUUID();
      }
      const [result] = await db
        .update(capsules)
        .set({ visibility: input.visibility, shareToken })
        .where(and(eq(capsules.id, input.id), eq(capsules.userId, ctx.user.id)));
      if (result.affectedRows === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "胶囊不存在" });
      }
      return { visibility: input.visibility, shareToken };
    }),

  getSharedByToken: publicQuery
    .input(z.object({ token: z.string().min(1) }))
    .query(async ({ input }) => {
      const db = getDb();
      const [row] = await db
        .select({
          id: capsules.id,
          title: capsules.title,
          url: capsules.url,
          description: capsules.description,
          color: capsules.color,
          createdAt: capsules.createdAt,
          userId: capsules.userId,
          userName: user.name,
          userImage: user.image,
        })
        .from(capsules)
        .innerJoin(user, eq(capsules.userId, user.id))
        .where(
          and(
            eq(capsules.shareToken, input.token),
            eq(capsules.visibility, "unlisted")
          )
        );
      if (!row)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "分享链接无效或已失效 / Share link invalid or expired",
        });
      return row;
    }),

  discover: publicQuery
    .input(
      z
        .object({
          cursor: z.number().optional(),
          limit: z.number().min(1).max(50).default(20),
        })
        .optional()
    )
    .query(async ({ input }) => {
      const db = getDb();
      const limit = input?.limit ?? 20;
      const where = [eq(capsules.visibility, "public")];
      if (input?.cursor) where.push(lt(capsules.id, input.cursor));
      const rows = await db
        .select({
          id: capsules.id,
          title: capsules.title,
          url: capsules.url,
          description: capsules.description,
          color: capsules.color,
          createdAt: capsules.createdAt,
          userId: capsules.userId,
          userName: user.name,
          userImage: user.image,
        })
        .from(capsules)
        .innerJoin(user, eq(capsules.userId, user.id))
        .where(and(...where))
        .orderBy(desc(capsules.createdAt), desc(capsules.id))
        .limit(limit + 1);
      const hasMore = rows.length > limit;
      const items = hasMore ? rows.slice(0, limit) : rows;
      const nextCursor = hasMore ? items[items.length - 1].id : null;
      return { items, nextCursor };
    }),

  checkHealth: protectedProcedure
    .input(z.object({ id: z.number(), force: z.boolean().optional() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      // 校验胶囊归属
      const [capsule] = await db
        .select({ id: capsules.id, url: capsules.url })
        .from(capsules)
        .where(and(eq(capsules.id, input.id), eq(capsules.userId, ctx.user.id)));
      if (!capsule) {
        throw new TRPCError({ code: "NOT_FOUND", message: "胶囊不存在" });
      }

      // 1h 缓存：非 force 模式下，若上次检测在 1 小时内则直接复用
      if (!input.force) {
        const [cached] = await db
          .select()
          .from(linkHealth)
          .where(eq(linkHealth.capsuleId, input.id));
        if (cached?.lastCheckedAt) {
          const age = Date.now() - cached.lastCheckedAt.getTime();
          if (age < 60 * 60 * 1000) {
            return {
              status: cached.status,
              httpCode: cached.httpCode,
              finalUrl: cached.finalUrl,
              lastCheckedAt: cached.lastCheckedAt,
              lastError: cached.lastError,
              cached: true as const,
            };
          }
        }
      }

      // 执行检测
      const result = await checkUrl(capsule.url);
      const now = new Date();
      await db
        .insert(linkHealth)
        .values({
          capsuleId: input.id,
          status: result.status,
          httpCode: result.httpCode,
          finalUrl: result.finalUrl,
          lastCheckedAt: now,
          lastError: result.lastError,
          checkCount: 1,
        })
        .onDuplicateKeyUpdate({
          set: {
            status: result.status,
            httpCode: result.httpCode,
            finalUrl: result.finalUrl,
            lastCheckedAt: now,
            lastError: result.lastError,
            checkCount: sql`${linkHealth.checkCount} + 1`,
          },
        });

      return {
        status: result.status,
        httpCode: result.httpCode,
        finalUrl: result.finalUrl,
        lastCheckedAt: now,
        lastError: result.lastError,
        cached: false as const,
      };
    }),

  export: protectedProcedure.query(async ({ ctx }) => {
    const db = getDb();
    const result = await db
      .select()
      .from(capsules)
      .where(eq(capsules.userId, ctx.user.id))
      .orderBy(desc(capsules.pinned), desc(capsules.createdAt));
    return {
      version: "1.0",
      exportedAt: new Date().toISOString(),
      app: "LinkCapsule",
      count: result.length,
      data: result.map((item) => ({
        title: item.title,
        url: item.url,
        description: item.description,
        color: item.color,
        pinned: item.pinned,
        visibility: item.visibility,
        createdAt: item.createdAt,
      })),
    };
  }),

  import: protectedProcedure
    .input(
      z.object({
        items: z
          .array(
            z.object({
              title: z.string().min(1).max(500),
              url: urlSchema,
              color: z.string().min(1).max(20).optional(),
              description: z.string().max(2000).optional(),
              pinned: z.boolean().optional(),
              createdAt: z.iso.datetime().optional(),
            })
          )
          .min(1, "Cannot import an empty array")
          .max(1000, "Cannot import more than 1000 items at once"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const defaultColors = [
        "#00f0ff", "#5200ff", "#ff1b8d",
        "#00ff88", "#ffaa00", "#cc00ff",
      ];

      const values = input.items.map((item, idx) => ({
        userId: ctx.user.id,
        title: item.title,
        url: item.url,
        description: item.description,
        color: item.color ?? defaultColors[idx % defaultColors.length],
        pinned: item.pinned ?? false,
        visibility: "private" as const,
        createdAt: item.createdAt ? new Date(item.createdAt) : new Date(),
      }));

      await db.transaction(async (tx) => {
        await tx.insert(capsules).values(values);
      });

      return { inserted: values.length };
    }),
});
