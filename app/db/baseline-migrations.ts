/**
 * 一次性基线脚本：把已有 db:push 状态接入 drizzle-kit 受控迁移。
 *
 * 背景：项目此前用 db:push 直接建表，未生成 __drizzle_migrations 记录，
 * 且 0000 迁移 SQL 文件曾缺失。本脚本：
 *   1. 创建 __drizzle_migrations 表（若不存在）
 *   2. 读取 0000_wooden_boomerang.sql 计算 sha256
 *   3. 把 0000 标记为已应用（created_at = journal 中的 when）
 * 之后执行 `npm run db:migrate` 会跳过 0000、仅应用 0001。
 *
 * 幂等：若 0000 已记录，或 __drizzle_migrations 已有其他记录，则跳过。
 */
import "dotenv/config";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import mysql from "mysql2/promise";

const MIGRATION_0000_TAG = "0000_wooden_boomerang";
const MIGRATION_0000_WHEN = 1781490267862; // 取自 meta/_journal.json

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is required");

  const conn = await mysql.createConnection(url);

  try {
    await conn.query(`
      CREATE TABLE IF NOT EXISTS \`__drizzle_migrations\` (
        \`id\` serial AUTO_INCREMENT,
        \`hash\` text NOT NULL,
        \`created_at\` bigint,
        CONSTRAINT \`__drizzle_migrations_id\` PRIMARY KEY (\`id\`)
      )
    `);

    const sqlPath = path.resolve(
      import.meta.dirname,
      "migrations",
      `${MIGRATION_0000_TAG}.sql`
    );
    const sqlContent = fs.readFileSync(sqlPath, "utf-8");
    const hash = crypto.createHash("sha256").update(sqlContent).digest("hex");

    const [existing0000] = await conn.query(
      "SELECT id FROM `__drizzle_migrations` WHERE `created_at` = ? LIMIT 1",
      [MIGRATION_0000_WHEN]
    );
    if (Array.isArray(existing0000) && existing0000.length > 0) {
      console.log(`[skip] migration 0000 already recorded (id=${(existing0000[0] as { id: unknown }).id})`);
      return;
    }

    const [anyExisting] = await conn.query(
      "SELECT id FROM `__drizzle_migrations` LIMIT 1"
    );
    if (Array.isArray(anyExisting) && anyExisting.length > 0) {
      console.log("[skip] __drizzle_migrations already initialized, skipping baseline insert");
      return;
    }

    await conn.query(
      "INSERT INTO `__drizzle_migrations` (`hash`, `created_at`) VALUES (?, ?)",
      [hash, MIGRATION_0000_WHEN]
    );
    console.log(`[ok] recorded baseline migration 0000 (hash=${hash.slice(0, 12)}…)`);
  } finally {
    await conn.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
