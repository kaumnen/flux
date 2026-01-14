import { router } from "@/lib/trpc/server";
import { awsRouter } from "./aws";

export const appRouter = router({
  aws: awsRouter,
});

export type AppRouter = typeof appRouter;
