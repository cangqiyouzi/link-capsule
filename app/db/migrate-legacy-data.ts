/**
 * 旧数据迁移脚本（Phase 0 策略 A）：
 *   1. 创建 legacy 虚拟用户（若不存在）
 *   2. 把所有 user_id 为空的旧胶囊回填到该用户名下
 *
 * 后续认领流程：用户注册新账号后登录 legacy 账号，把旧胶囊转移到新账号（本期暂不实现自动认领）。
 *
 * 幂等：legacy 用户已存在或无孤儿胶囊时跳过。
 */
import "dotenv/config";
import { auth } from "../api/auth";
import { getDb } from "../api/queries/connection";
import { user, capsules } from "@db/schema";
import { eq, isNull } from "drizzle-orm";

const LEGACY_EMAIL = "legacy@linkcapsule.local";
const LEGACY_NAME = "Legacy User";
const LEGACY_PASSWORD = "legacy-claim-me";

async function main() {
  const db = getDb();

  const existing = await db
    .select()
    .from(user)
    .where(eq(user.email, LEGACY_EMAIL))
    .limit(1);
  let legacyUserId: string;

  if (existing.length > 0) {
    legacyUserId = existing[0].id;
    console.log(`[skip] legacy user already exists (id=${legacyUserId})`);
  } else {
    const res = await auth.api.signUpEmail({
      body: {
        name: LEGACY_NAME,
        email: LEGACY_EMAIL,
        password: LEGACY_PASSWORD,
      },
    });
    legacyUserId = res.user.id;
    console.log(`[ok] created legacy user (id=${legacyUserId})`);
    console.log(`     email:    ${LEGACY_EMAIL}`);
    console.log(`     password: ${LEGACY_PASSWORD}`);
    console.log(`     (登录后可认领旧数据，认领完成后请尽快修改密码)`);
  }

  const orphans = await db
    .select({ id: capsules.id })
    .from(capsules)
    .where(isNull(capsules.userId));

  if (orphans.length === 0) {
    console.log("[skip] no orphan capsules to backfill");
    return;
  }

  await db
    .update(capsules)
    .set({ userId: legacyUserId })
    .where(isNull(capsules.userId));
  console.log(`[ok] backfilled ${orphans.length} capsules → legacy user`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
