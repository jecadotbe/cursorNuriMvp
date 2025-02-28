import { Router, Request, Response, NextFunction } from "express";
import { setupAuthRoutes } from "./auth";
import { setupLoginRoute } from "./auth/login";
import { setupLogoutRoute } from "./auth/logout";
import { setupRegisterRoute } from "./auth/register";
import { setupUserRoute } from "./auth/user";
import { setupChatRouter } from "./chat";
import { setupProfileRouter } from "./profile";
import { setupSuggestionsRouter } from "./suggestions";
import { villageRouter } from "./village";
import { setupOnboardingRoutes } from "./onboarding";
import { handleRouteError } from "./utils/error-handler";

/**
 * Set up all API routes.
 * @param app Express router to attach routes to
 */
export function setupRoutes(app: Router) {
  // Create sub-routers for each feature
  const authRouter = Router();
  const chatRouter = Router();
  const profileRouter = Router();
  const suggestionsRouter = Router();
  const localVillageRouter = Router();
  const onboardingRouter = Router();

  // Set up feature routers
  setupAuthRoutes(authRouter);
  setupChatRouter(chatRouter);
  setupProfileRouter(profileRouter);
  setupSuggestionsRouter(suggestionsRouter);
  // Use the imported villageRouter
  localVillageRouter.use("/", villageRouter);
  setupOnboardingRoutes(onboardingRouter);

  // Attach all sub-routers to the main router
  app.use("/auth", authRouter);
  app.use("/chat", chatRouter);
  app.use("/profile", profileRouter);
  app.use("/suggestions", suggestionsRouter);
  app.use("/village", localVillageRouter);
  app.use("/onboarding", onboardingRouter);

  // Add direct route forwarding for frontend compatibility
  app.post("/login", (req, res, next) => {
    req.url = "/auth/login";
    app.handle(req, res, next);
  });
  
  app.post("/logout", (req, res, next) => {
    req.url = "/auth/logout";
    app.handle(req, res, next);
  });
  
  app.post("/register", (req, res, next) => {
    req.url = "/auth/register";
    app.handle(req, res, next);
  });

  app.get("/user", (req, res, next) => {
    req.url = "/auth/user";
    app.handle(req, res, next);
  });

  // General error fallback
  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    return handleRouteError(res, err, "An unexpected error occurred");
  });
}