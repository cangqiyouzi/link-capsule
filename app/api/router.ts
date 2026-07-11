import { createRouter, publicQuery } from "./middleware";
import { capsuleRouter } from "./routers/capsule";
import { tagRouter } from "./routers/tag";
import { collectionRouter } from "./routers/collection";
import { userRouter } from "./routers/user";

export const appRouter = createRouter({
  ping: publicQuery.query(() => ({ ok: true, ts: Date.now() })),
  capsule: capsuleRouter,
  tag: tagRouter,
  collection: collectionRouter,
  user: userRouter,
});

export type AppRouter = typeof appRouter;
