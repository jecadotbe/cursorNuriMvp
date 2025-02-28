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

  // Direct route handlers for backwards compatibility with frontend
  app.post("/login", (req, res, next) => {
    // Forward the request to the login route handler
    req.url = "/login";  // Set the URL to match the route in the auth router
    authRouter(req, res, next);  // Pass the request to the auth router
  });
  
  app.post("/logout", (req, res, next) => {
    // Forward the request to the logout route handler
    req.url = "/logout";
    authRouter(req, res, next);
  });
  
  app.post("/register", (req, res, next) => {
    // Forward the request to the register route handler
    req.url = "/register";
    authRouter(req, res, next);
  });

  app.get("/user", (req, res, next) => {
    // Forward the request to the user route handler
    req.url = "/user";
    authRouter(req, res, next);
  });

  // General error fallback
  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    return handleRouteError(res, err, "An unexpected error occurred");
  });
}