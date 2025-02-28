import { Router } from "express";
import { setupLoginRoute } from "./login";
import { setupLogoutRoute } from "./logout";
import { setupRegisterRoute } from "./register";
import { setupUserRoute } from "./user";
import { setupPasswordResetRoute } from "./password-reset";

export function setupAuthRoutes(app: Router) {
  const authRouter = Router();
  
  setupLoginRoute(authRouter);
  setupLogoutRoute(authRouter);
  setupRegisterRoute(authRouter);
  setupUserRoute(authRouter);
  setupPasswordResetRoute(authRouter);
  
  app.use("/auth", authRouter);
  
  return app;
}