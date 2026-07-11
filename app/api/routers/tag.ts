import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createRouter, protectedProcedure } from "../middleware";
import { getDb } from "../queries/connection";
import { tags, capsuleTags, capsules } from "@db/schema";
import { eq, and, inArray, sql } from "drizzle-orm";

export const tagRouter = createRouter({
  list: protectedProcedure.query(async ({ ctx }) => {
    const db = getDb();
    const rows = await db
      .select({
        id: tags.id,
        name: tags.name,
        color: tags.color,
        count: sql<number>`count(${capsuleTags.capsuleId})`.as("count"),
      })
      .from(tags)
      .leftJoin(capsuleTags, eq(tags.id, capsuleTags.tagId))
      .where(eq(tags.userId, ctx.user.id))
      .groupBy(tags.id)
      .orderBy(tags.name);
    return rows;
  }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100),
        color: z.string().max(20).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const [existing] = await db
        .select({ id: tags.id })
        .from(tags)
        .where(and(eq(tags.userId, ctx.user.id), eq(tags.name, input.name)));
      if (existing) {
        throw new TRPCError({ code: "CONFLICT", message: "同名标签已存在 / Tag name already exists" });
      }
      const result = await db.insert(tags).values({
        userId: ctx.user.id,
        name: input.name,
        color: input.color,
      });
      return { id: Number(result[0].insertId) };
    }),

  rename: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1).max(100),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const [dup] = await db
        .select({ id: tags.id })
        .from(tags)
        .where(and(eq(tags.userId, ctx.user.id), eq(tags.name, input.name)));
      if (dup && dup.id !== input.id) {
        throw new TRPCError({ code: "CONFLICT", message: "同名标签已存在 / Tag name already exists" });
      }
      const [result] = await db
        .update(tags)
        .set({ name: input.name })
        .where(and(eq(tags.id, input.id), eq(tags.userId, ctx.user.id)));
      if (result.affectedRows === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "标签不存在" });
      }
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const [result] = await db
        .delete(tags)
        .where(and(eq(tags.id, input.id), eq(tags.userId, ctx.user.id)));
      if (result.affectedRows === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "标签不存在" });
      }
      return { success: true };
    }),

  setCapsuleTags: protectedProcedure
    .input(
      z.object({
        capsuleId: z.number(),
        tagIds: z.array(z.number()),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();

      await db.transaction(async (tx) => {
        // 验证胶囊归属
        const [capsule] = await tx
          .select({ id: capsules.id })
          .from(capsules)
          .where(and(eq(capsules.id, input.capsuleId), eq(capsules.userId, ctx.user.id)));
        if (!capsule) throw new TRPCError({ code: "NOT_FOUND", message: "胶囊不存在" });

        // 验证所有 tagIds 归属当前用户（防 IDOR）
        if (input.tagIds.length > 0) {
          const ownedTags = await tx
            .select({ id: tags.id })
            .from(tags)
            .where(and(inArray(tags.id, input.tagIds), eq(tags.userId, ctx.user.id)));
          if (ownedTags.length !== input.tagIds.length) {
            throw new TRPCError({ code: "FORBIDDEN", message: "标签归属校验失败" });
          }
        }

        // 替换：先删旧关联，再插新关联
        await tx
          .delete(capsuleTags)
          .where(eq(capsuleTags.capsuleId, input.capsuleId));

        if (input.tagIds.length > 0) {
          await tx.insert(capsuleTags).values(
            input.tagIds.map((tagId) => ({
              capsuleId: input.capsuleId,
              tagId,
            }))
          );
        }
      });

      return { success: true };
    }),
});
