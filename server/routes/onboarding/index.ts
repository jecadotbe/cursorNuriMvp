import { Router } from "express";
import { setupProgressRoutes } from "./progress";
import { setupCompletionRoutes } from "./completion";

export function setupOnboardingRoutes(router: Router) {
  const onboardingRouter = Router();
  
  setupProgressRoutes(onboardingRouter);
  setupCompletionRoutes(onboardingRouter);
  
  router.use("/onboarding", onboardingRouter);
  
  return router;
}