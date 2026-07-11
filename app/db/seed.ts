import { randomUUID } from "node:crypto";
import { getDb } from "../api/queries/connection";
import { auth } from "../api/auth";
import { user, capsules, tags, capsuleTags, collections, collectionItems } from "./schema";
import { eq, and } from "drizzle-orm";

const DEMO_EMAIL = "demo@linkcapsule.local";
const DEMO_PASSWORD = "Demo1234!";
const DEMO_NAME = "Demo User";

const SEED_CAPSULES = [
  { title: "React", url: "https://react.dev", description: "The library for web and native user interfaces.", color: "#00f0ff", visibility: "public" as const, pinned: true },
  { title: "TypeScript", url: "https://www.typescriptlang.org", description: "TypeScript is JavaScript with syntax for types.", color: "#5200ff", visibility: "public" as const, pinned: false },
  { title: "MDN Web Docs", url: "https://developer.mozilla.org", description: "Resources for developers, by developers.", color: "#ff1b8d", visibility: "public" as const, pinned: false },
  { title: "Vite", url: "https://vitejs.dev", description: "Next generation frontend tooling.", color: "#00ff88", visibility: "public" as const, pinned: false },
  { title: "tRPC", url: "https://trpc.io", description: "End-to-end typesafe APIs made easy.", color: "#ffaa00", visibility: "unlisted" as const, pinned: false },
  { title: "Drizzle ORM", url: "https://orm.drizzle.team", description: "Headless TypeScript ORM with a head.", color: "#cc00ff", visibility: "public" as const, pinned: false },
  { title: "Tailwind CSS", url: "https://tailwindcss.com", description: "A utility-first CSS framework for rapid UI development.", color: "#00f0ff", visibility: "public" as const, pinned: false },
  { title: "better-auth", url: "https://www.better-auth.com", description: "The most comprehensive authentication library for TypeScript.", color: "#5200ff", visibility: "private" as const, pinned: false },
  { title: "GitHub", url: "https://github.com", description: "Where the world builds software.", color: "#ff1b8d", visibility: "public" as const, pinned: true },
  { title: "Lucide Icons", url: "https://lucide.dev", description: "Beautiful & consistent icon toolkit.", color: "#00ff88", visibility: "private" as const, pinned: false },
];

const SEED_TAGS = [
  { name: "Tools", color: "#00f0ff" },
  { name: "Learning", color: "#00ff88" },
  { name: "Inspiration", color: "#ff1b8d" },
];

async function seed() {
  const db = getDb();
  console.log("Seeding database...");

  // 1. Create or find demo user
  const [existing] = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.email, DEMO_EMAIL));

  let userId: string;

  if (existing) {
    console.log(`Demo user already exists (id=${existing.id}), skipping creation.`);
    userId = existing.id;
  } else {
    console.log("Creating demo user...");
    const result = await auth.api.signUpEmail({
      body: { email: DEMO_EMAIL, password: DEMO_PASSWORD, name: DEMO_NAME },
    });
    userId = result.user.id;
    console.log(`Created demo user: ${DEMO_EMAIL} / ${DEMO_PASSWORD} (id=${userId})`);
  }

  // 2. Create tags (skip if already exist)
  const tagIds: number[] = [];
  for (const t of SEED_TAGS) {
    const [existingTag] = await db
      .select({ id: tags.id })
      .from(tags)
      .where(and(eq(tags.name, t.name), eq(tags.userId, userId)));
    if (existingTag) {
      tagIds.push(existingTag.id);
    } else {
      const res = await db.insert(tags).values({
        userId,
        name: t.name,
        color: t.color,
      });
      tagIds.push(Number(res[0].insertId));
    }
  }
  console.log(`Tags ready: ${SEED_TAGS.map((t, i) => `${t.name}(${tagIds[i]})`).join(", ")}`);

  // 3. Create capsules (skip if user already has capsules)
  const existingCapsules = await db
    .select({ id: capsules.id })
    .from(capsules)
    .where(eq(capsules.userId, userId));

  let capsuleIds: number[];

  if (existingCapsules.length > 0) {
    console.log(`User already has ${existingCapsules.length} capsules, skipping capsule creation.`);
    capsuleIds = existingCapsules.map((c) => c.id);
  } else {
    console.log("Creating capsules...");
    const createdIds: number[] = [];
    for (const c of SEED_CAPSULES) {
      const shareToken = c.visibility === "unlisted" ? randomUUID() : null;
      const res = await db.insert(capsules).values({
        userId,
        title: c.title,
        url: c.url,
        description: c.description,
        color: c.color,
        pinned: c.pinned,
        visibility: c.visibility,
        shareToken,
      });
      createdIds.push(Number(res[0].insertId));
    }
    capsuleIds = createdIds;
    console.log(`Created ${createdIds.length} capsules.`);
  }

  // 4. Associate tags with capsules (only if capsules were freshly created)
  if (existingCapsules.length === 0) {
    console.log("Associating tags with capsules...");
    // Tools: React, Vite, tRPC, Drizzle, GitHub (indices 0,3,4,5,8)
    // Learning: TypeScript, MDN, Tailwind (indices 1,2,6)
    // Inspiration: React, better-auth, Lucide (indices 0,7,9)
    const tagMap: Record<number, number[]> = {
      0: [tagIds[0], tagIds[2]], // React → Tools, Inspiration
      1: [tagIds[1]],            // TypeScript → Learning
      2: [tagIds[1]],            // MDN → Learning
      3: [tagIds[0]],            // Vite → Tools
      4: [tagIds[0]],            // tRPC → Tools
      5: [tagIds[0]],            // Drizzle → Tools
      6: [tagIds[1]],            // Tailwind → Learning
      7: [tagIds[2]],            // better-auth → Inspiration
      8: [tagIds[0]],            // GitHub → Tools
      9: [tagIds[2]],            // Lucide → Inspiration
    };
    for (const [idx, tIds] of Object.entries(tagMap)) {
      const capsuleId = capsuleIds[Number(idx)];
      if (!capsuleId) continue;
      await db.insert(capsuleTags).values(
        tIds.map((tagId) => ({ capsuleId, tagId }))
      );
    }
    console.log("Tag associations created.");
  }

  // 5. Create a collection (skip if exists)
  const [existingCollection] = await db
    .select({ id: collections.id })
    .from(collections)
    .where(eq(collections.userId, userId));

  if (!existingCollection && capsuleIds.length >= 3) {
    console.log("Creating 'Favorites' collection...");
    const collRes = await db.insert(collections).values({
      userId,
      name: "Favorites",
      description: "Top picks from the demo user.",
      coverColor: "#00f0ff",
      visibility: "public",
    });
    const collectionId = Number(collRes[0].insertId);

    // Add first 3 capsules to the collection
    for (let i = 0; i < 3 && i < capsuleIds.length; i++) {
      await db.insert(collectionItems).values({
        collectionId,
        capsuleId: capsuleIds[i],
        sortOrder: i,
      });
    }
    console.log(`Created 'Favorites' collection with 3 capsules.`);
  } else if (existingCollection) {
    console.log("Collection already exists, skipping.");
  }

  console.log("\nSeed complete!");
  console.log(`  Login: ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
  console.log("Done.");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
