import { z } from "zod";
import { createRouter, protectedProcedure } from "../middleware";
import { getDb } from "../queries/connection";
import { collections, collectionItems, capsules, tags, capsuleTags } from "@db/schema";
import { eq, and, inArray, desc, asc, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

export const collectionRouter = createRouter({
  // 列出当前用户的所有胶囊集 + 胶囊数
  list: protectedProcedure.query(async ({ ctx }) => {
    const db = getDb();
    const rows = await db
      .select({
        id: collections.id,
        name: collections.name,
        description: collections.description,
        coverColor: collections.coverColor,
        visibility: collections.visibility,
        createdAt: collections.createdAt,
        updatedAt: collections.updatedAt,
        count: sql<number>`count(${collectionItems.capsuleId})`.as("count"),
      })
      .from(collections)
      .leftJoin(collectionItems, eq(collections.id, collectionItems.collectionId))
      .where(eq(collections.userId, ctx.user.id))
      .groupBy(collections.id)
      .orderBy(desc(collections.createdAt));
    return rows;
  }),

  // 获取单个胶囊集详情
  get: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = getDb();
      const [c] = await db
        .select()
        .from(collections)
        .where(and(eq(collections.id, input.id), eq(collections.userId, ctx.user.id)));
      if (!c) throw new TRPCError({ code: "NOT_FOUND", message: "胶囊集不存在" });
      return c;
    }),

  // 获取胶囊集内的胶囊列表（按 sort_order 排序，带 tags）
  items: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = getDb();
      // 校验归属
      const [c] = await db
        .select({ id: collections.id })
        .from(collections)
        .where(and(eq(collections.id, input.id), eq(collections.userId, ctx.user.id)));
      if (!c) throw new TRPCError({ code: "NOT_FOUND", message: "胶囊集不存在" });

      const rows = await db
        .select({
          capsuleId: collectionItems.capsuleId,
          sortOrder: collectionItems.sortOrder,
          addedAt: collectionItems.addedAt,
          id: capsules.id,
          title: capsules.title,
          url: capsules.url,
          description: capsules.description,
          color: capsules.color,
          pinned: capsules.pinned,
          createdAt: capsules.createdAt,
        })
        .from(collectionItems)
        .innerJoin(capsules, eq(collectionItems.capsuleId, capsules.id))
        .where(eq(collectionItems.collectionId, input.id))
        .orderBy(asc(collectionItems.sortOrder));

      // 批量查 tags（复用 capsule.ts 模式）
      const capsuleIds = rows.map((r) => r.capsuleId);
      const tagMap = new Map<
        number,
        { id: number; name: string; color: string | null }[]
      >();
      if (capsuleIds.length > 0) {
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
        for (const t of tagRows) {
          const arr = tagMap.get(t.capsuleId) ?? [];
          arr.push({ id: t.tagId, name: t.tagName, color: t.tagColor });
          tagMap.set(t.capsuleId, arr);
        }
      }

      return rows.map((r) => ({
        ...r,
        tags: tagMap.get(r.capsuleId) ?? [],
      }));
    }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(200),
        description: z.string().max(2000).optional(),
        coverColor: z.string().max(20).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const result = await db.insert(collections).values({
        userId: ctx.user.id,
        name: input.name,
        description: input.description,
        coverColor: input.coverColor,
      });
      return { id: Number(result[0].insertId) };
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1).max(200).optional(),
        description: z.string().max(2000).nullable().optional(),
        coverColor: z.string().max(20).nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const { id, ...updates } = input;
      const [result] = await db
        .update(collections)
        .set(updates)
        .where(and(eq(collections.id, id), eq(collections.userId, ctx.user.id)));
      if (result.affectedRows === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "胶囊集不存在" });
      }
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const [result] = await db
        .delete(collections)
        .where(and(eq(collections.id, input.id), eq(collections.userId, ctx.user.id)));
      if (result.affectedRows === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "胶囊集不存在" });
      }
      return { success: true };
    }),

  // 添加胶囊到集合（防 IDOR：校验胶囊归属 + 集合归属；用 FOR UPDATE 锁行防并发 sortOrder 重复）
  addItem: protectedProcedure
    .input(
      z.object({
        collectionId: z.number(),
        capsuleId: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();

      await db.transaction(async (tx) => {
        // 校验集合并加锁，防止并发添加拿到相同 max sortOrder
        const [locked] = await tx.execute(
          sql`SELECT id FROM collections WHERE id = ${input.collectionId} AND user_id = ${ctx.user.id} FOR UPDATE`
        );
        if (!locked || (Array.isArray(locked) && locked.length === 0)) {
          throw new TRPCError({ code: "NOT_FOUND", message: "胶囊集不存在" });
        }

        // 校验胶囊归属
        const [cap] = await tx
          .select({ id: capsules.id })
          .from(capsules)
          .where(and(eq(capsules.id, input.capsuleId), eq(capsules.userId, ctx.user.id)));
        if (!cap) throw new TRPCError({ code: "NOT_FOUND", message: "胶囊不存在" });

        // 取当前最大 sortOrder + 1
        const [maxRow] = await tx
          .select({
            maxOrder: sql<number>`coalesce(max(${collectionItems.sortOrder}), -1)`.as(
              "maxOrder"
            ),
          })
          .from(collectionItems)
          .where(eq(collectionItems.collectionId, input.collectionId));

        const nextOrder = Number(maxRow?.maxOrder ?? -1) + 1;

        await tx
          .insert(collectionItems)
          .values({
            collectionId: input.collectionId,
            capsuleId: input.capsuleId,
            sortOrder: nextOrder,
          })
          .onDuplicateKeyUpdate({ set: { sortOrder: nextOrder } });
      });

      return { success: true };
    }),

  removeItem: protectedProcedure
    .input(
      z.object({
        collectionId: z.number(),
        capsuleId: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      // 校验集合归属（防越权操作他人集合）
      const [c] = await db
        .select({ id: collections.id })
        .from(collections)
        .where(
          and(
            eq(collections.id, input.collectionId),
            eq(collections.userId, ctx.user.id)
          )
        );
      if (!c) throw new TRPCError({ code: "NOT_FOUND", message: "胶囊集不存在" });

      const [result] = await db
        .delete(collectionItems)
        .where(
          and(
            eq(collectionItems.collectionId, input.collectionId),
            eq(collectionItems.capsuleId, input.capsuleId)
          )
        );
      if (result.affectedRows === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "集合中不存在该胶囊" });
      }
      return { success: true };
    }),

  // 批量重排（拖拽后调用；用 FOR UPDATE 锁行防并发重排冲突）
  reorder: protectedProcedure
    .input(
      z.object({
        collectionId: z.number(),
        items: z.array(
          z.object({
            capsuleId: z.number(),
            sortOrder: z.number(),
          })
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const capsuleIds = input.items.map((item) => item.capsuleId);

      await db.transaction(async (tx) => {
        // 校验集合并加锁，序列化并发重排
        const [locked] = await tx.execute(
          sql`SELECT id FROM collections WHERE id = ${input.collectionId} AND user_id = ${ctx.user.id} FOR UPDATE`
        );
        if (!locked || (Array.isArray(locked) && locked.length === 0)) {
          throw new TRPCError({ code: "NOT_FOUND", message: "胶囊集不存在" });
        }

        // 校验传入的 capsuleId 确实都在当前集合中
        const existingItems = await tx
          .select({ capsuleId: collectionItems.capsuleId })
          .from(collectionItems)
          .where(
            and(
              eq(collectionItems.collectionId, input.collectionId),
              inArray(collectionItems.capsuleId, capsuleIds)
            )
          );
        if (existingItems.length !== input.items.length) {
          const uniqueIds = new Set(capsuleIds);
          const message =
            uniqueIds.size !== capsuleIds.length
              ? "存在重复的胶囊 / Duplicate capsule IDs"
              : "存在不属于该集合的胶囊 / Some capsules are not in this collection";
          throw new TRPCError({
            code: "BAD_REQUEST",
            message,
          });
        }

        for (const item of input.items) {
          await tx
            .update(collectionItems)
            .set({ sortOrder: item.sortOrder })
            .where(
              and(
                eq(collectionItems.collectionId, input.collectionId),
                eq(collectionItems.capsuleId, item.capsuleId)
              )
            );
        }
      });
      return { success: true };
    }),
});
