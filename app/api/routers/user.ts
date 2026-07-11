import { z } from "zod";
import { createRouter, protectedProcedure, publicQuery } from "../middleware";
import { getDb } from "../queries/connection";
import { capsules, follows, user } from "@db/schema";
import { eq, and, desc, lt, inArray, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

export const userRouter = createRouter({
  // 4.1 公开资料 + public 胶囊（publicQuery，未登录也能看）
  profile: publicQuery
    .input(z.object({ userId: z.string().min(1) }))
    .query(async ({ input, ctx }) => {
      const db = getDb();
      const [u] = await db
        .select({
          id: user.id,
          name: user.name,
          image: user.image,
          createdAt: user.createdAt,
        })
        .from(user)
        .where(eq(user.id, input.userId));
      if (!u) throw new TRPCError({ code: "NOT_FOUND", message: "用户不存在 / User not found" });

      const pubCaps = await db
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
            eq(capsules.userId, input.userId),
            eq(capsules.visibility, "public")
          )
        )
        .orderBy(desc(capsules.createdAt));

      // 若已登录，查是否关注
      let isFollowing = false;
      if (ctx.user) {
        const [f] = await db
          .select()
          .from(follows)
          .where(
            and(
              eq(follows.followerId, ctx.user.id),
              eq(follows.followingId, input.userId)
            )
          );
        isFollowing = !!f;
      }

      // 统计：被关注数
      const [followStats] = await db
        .select({
          followers: sql<number>`count(${follows.followingId})`.as("followers"),
        })
        .from(follows)
        .where(eq(follows.followingId, input.userId));

      return {
        ...u,
        capsules: pubCaps,
        isFollowing,
        followersCount: Number(followStats?.followers ?? 0),
      };
    }),

  // 4.2 关注
  follow: protectedProcedure
    .input(z.object({ userId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      if (input.userId === ctx.user.id)
        throw new TRPCError({ code: "BAD_REQUEST", message: "不能关注自己 / Cannot follow yourself" });
      const db = getDb();
      const [target] = await db
        .select({ id: user.id })
        .from(user)
        .where(eq(user.id, input.userId));
      if (!target)
        throw new TRPCError({ code: "NOT_FOUND", message: "用户不存在 / User not found" });
      await db
        .insert(follows)
        .values({ followerId: ctx.user.id, followingId: input.userId })
        .onDuplicateKeyUpdate({ set: { createdAt: new Date() } });
      return { success: true };
    }),

  // 4.3 取关
  unfollow: protectedProcedure
    .input(z.object({ userId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const [result] = await db
        .delete(follows)
        .where(
          and(
            eq(follows.followerId, ctx.user.id),
            eq(follows.followingId, input.userId)
          )
        );
      if (result.affectedRows === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "未关注该用户 / Not following this user" });
      }
      return { success: true };
    }),

  // 4.4 关注时间线（已关注用户的 public 胶囊，cursor 分页）
  feed: protectedProcedure
    .input(
      z
        .object({
          cursor: z.number().optional(),
          limit: z.number().min(1).max(50).default(20),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const db = getDb();
      const limit = input?.limit ?? 20;
      const followingSub = db
        .select({ id: follows.followingId })
        .from(follows)
        .where(eq(follows.followerId, ctx.user.id));
      const where = [
        eq(capsules.visibility, "public"),
        inArray(capsules.userId, followingSub),
      ];
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
      return { items, nextCursor: hasMore ? items[items.length - 1].id : null };
    }),

  // 4.5 我关注的人列表（用于 /feed 页头部展示）
  following: protectedProcedure.query(async ({ ctx }) => {
    const db = getDb();
    return await db
      .select({
        id: user.id,
        name: user.name,
        image: user.image,
      })
      .from(follows)
      .innerJoin(user, eq(follows.followingId, user.id))
      .where(eq(follows.followerId, ctx.user.id))
      .orderBy(desc(follows.createdAt));
  }),
});
