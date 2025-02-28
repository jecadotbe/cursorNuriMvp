import { Router } from "express";
import { setupLoginRoute } from "./login";
import { setupLogoutRoute } from "./logout";
import { setupRegisterRoute } from "./register";
import { setupPasswordResetRoute } from "./password-reset";
import { setupUserRoute } from "./user";

/**
 * Setup all authentication-related routes
 * @param app Express router to attach routes to
 */
export function setupAuthRoutes(app: Router) {
  const authRouter = Router();
  
  // Set up various auth routes
  setupLoginRoute(authRouter);
  setupLogoutRoute(authRouter);
  setupRegisterRoute(authRouter);
  setupPasswordResetRoute(authRouter);
  setupUserRoute(authRouter);

  // Attach the auth router to the main app router
  app.use("/auth", authRouter);
}