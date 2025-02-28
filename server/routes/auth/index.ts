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
  // Create a router for auth routes
  const authRouter = Router();
  
  // Setup individual route modules
  setupLoginRoute(authRouter);
  setupLogoutRoute(authRouter);
  setupRegisterRoute(authRouter);
  setupPasswordResetRoute(authRouter);
  setupUserRoute(authRouter);
  
  // Mount the auth router on the parent router
  app.use(authRouter);
}