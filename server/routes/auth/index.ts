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
  // Set up individual auth-related routes
  setupLoginRoute(app);
  setupLogoutRoute(app);
  setupRegisterRoute(app);
  setupPasswordResetRoute(app);
  setupUserRoute(app);
}