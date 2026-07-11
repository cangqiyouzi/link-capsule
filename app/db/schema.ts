import {
  mysqlTable,
  serial,
  varchar,
  text,
  timestamp,
  boolean,
  index,
  bigint,
  int,
  primaryKey,
  uniqueIndex,
} from "drizzle-orm/mysql-core";

/**
 * better-auth 所需核心表
 * 字段命名遵循 better-auth Drizzle adapter 默认约定（snake_case 列名 + camelCase 字段名）。
 */
export const user = mysqlTable("user", {
  id: varchar("id", { length: 255 }).primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: varchar("image", { length: 255 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const session = mysqlTable("session", {
  id: varchar("id", { length: 255 }).primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: varchar("token", { length: 255 }).notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  ipAddress: varchar("ip_address", { length: 255 }),
  userAgent: varchar("user_agent", { length: 255 }),
  userId: varchar("user_id", { length: 255 }).notNull().references(() => user.id),
});

export const account = mysqlTable("account", {
  id: varchar("id", { length: 255 }).primaryKey(),
  accountId: varchar("account_id", { length: 255 }).notNull(),
  providerId: varchar("provider_id", { length: 255 }).notNull(),
  userId: varchar("user_id", { length: 255 }).notNull().references(() => user.id),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: varchar("scope", { length: 255 }),
  password: varchar("password", { length: 255 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const verification = mysqlTable("verification", {
  id: varchar("id", { length: 255 }).primaryKey(),
  identifier: varchar("identifier", { length: 255 }).notNull(),
  value: varchar("value", { length: 255 }).notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

/**
 * 胶囊表（改造）
 * - user_id: 归属用户（旧数据迁移前可为空，迁移脚本回填后即非空）
 * - description: 共享时展示的描述
 * - visibility: private | unlisted | public（Phase 4 启用，本期默认 private）
 * - share_token: unlisted 分享 token，切回 private/public 时置 null
 * - updated_at: 同步与编辑时间戳
 */
export const capsules = mysqlTable(
  "capsules",
  {
    id: serial("id").primaryKey(),
    userId: varchar("user_id", { length: 255 }).references(() => user.id),
    title: varchar("title", { length: 500 }).notNull(),
    url: text("url").notNull(),
    description: text("description"),
    color: varchar("color", { length: 20 }).notNull().default("#00f0ff"),
    pinned: boolean("pinned").notNull().default(false),
    visibility: varchar("visibility", { length: 20 })
      .$type<"private" | "unlisted" | "public">()
      .notNull()
      .default("private"),
    shareToken: varchar("share_token", { length: 64 }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
  },
  (table) => ({
    userIdIdx: index("user_id_idx").on(table.userId),
    visibilityIdx: index("visibility_idx").on(table.visibility),
    shareTokenUniq: uniqueIndex("share_token_idx").on(table.shareToken),
  })
);

/**
 * 标签表（Phase 2）
 * - user_id: 标签私有，按用户隔离
 * - name: 同一用户下唯一
 * - color: 可选，标签颜色
 */
export const tags = mysqlTable(
  "tags",
  {
    id: serial("id").primaryKey(),
    userId: varchar("user_id", { length: 255 }).notNull().references(() => user.id),
    name: varchar("name", { length: 100 }).notNull(),
    color: varchar("color", { length: 20 }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    userTagUniq: uniqueIndex("user_tag_name_idx").on(table.userId, table.name),
  })
);

/**
 * 胶囊-标签关联表（多对多）
 * - 删除胶囊或标签时 cascade 清除关联
 */
export const capsuleTags = mysqlTable(
  "capsule_tags",
  {
    capsuleId: bigint("capsule_id", { mode: "number", unsigned: true }).notNull().references(() => capsules.id, { onDelete: "cascade" }),
    tagId: bigint("tag_id", { mode: "number", unsigned: true }).notNull().references(() => tags.id, { onDelete: "cascade" }),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.capsuleId, table.tagId] }),
  })
);

/**
 * 胶囊集 / 专题（Phase 2 剩余部分）
 * - user_id: 归属用户，按用户隔离
 * - visibility: 预留字段，本期默认 private，Phase 4 启用分享
 * - cover_color: 胶囊集封面色（侧边栏圆点 + 管理页头部）
 */
export const collections = mysqlTable(
  "collections",
  {
    id: serial("id").primaryKey(),
    userId: varchar("user_id", { length: 255 }).notNull().references(() => user.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 200 }).notNull(),
    description: text("description"),
    coverColor: varchar("cover_color", { length: 20 }),
    visibility: varchar("visibility", { length: 20 })
      .$type<"private" | "unlisted" | "public">()
      .notNull()
      .default("private"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
  },
  (table) => ({
    userIdIdx: index("collections_user_idx").on(table.userId),
  })
);

/**
 * 胶囊集-胶囊关联表（多对多，带排序）
 * - sort_order: 集合内顺序，拖拽后重排为 0,1,2...
 * - 删除胶囊集或胶囊时 cascade 清除关联
 */
export const collectionItems = mysqlTable(
  "collection_items",
  {
    collectionId: bigint("collection_id", { mode: "number", unsigned: true }).notNull().references(() => collections.id, { onDelete: "cascade" }),
    capsuleId: bigint("capsule_id", { mode: "number", unsigned: true }).notNull().references(() => capsules.id, { onDelete: "cascade" }),
    addedAt: timestamp("added_at").notNull().defaultNow(),
    sortOrder: int("sort_order").notNull().default(0),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.collectionId, table.capsuleId] }),
  })
);

/**
 * 关注关系表（Phase 4）
 * - PK(follower_id, following_id) 防重复关注
 * - following_idx 支撑「某人被谁关注」查询
 * - 删除用户时 cascade 清除关注关系
 */
export const follows = mysqlTable(
  "follows",
  {
    followerId: varchar("follower_id", { length: 255 }).notNull().references(() => user.id, { onDelete: "cascade" }),
    followingId: varchar("following_id", { length: 255 }).notNull().references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.followerId, table.followingId] }),
    followingIdx: index("follows_following_idx").on(table.followingId),
  })
);

/**
 * 链接健康检测表（Phase 3）
 * - capsule_id 作为 PK（与 capsules 1-1 关系）
 * - status: ok|dead|redirect|slow|unknown
 * - last_checked_at: 用于 1h 缓存判断
 * - 删除胶囊时 cascade 清除检测记录
 */
export const linkHealth = mysqlTable(
  "link_health",
  {
    capsuleId: bigint("capsule_id", { mode: "number", unsigned: true }).primaryKey().references(() => capsules.id, { onDelete: "cascade" }),
    status: varchar("status", { length: 20 })
      .$type<"ok" | "dead" | "redirect" | "slow" | "rate_limited" | "unknown">()
      .notNull()
      .default("unknown"),
    httpCode: int("http_code"),
    finalUrl: text("final_url"),
    lastCheckedAt: timestamp("last_checked_at"),
    checkCount: int("check_count").notNull().default(0),
    lastError: text("last_error"),
  }
);
