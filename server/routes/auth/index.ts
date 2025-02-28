import { Router } from "express";
import { setupLoginRoute } from "./login";
import { setupRegisterRoute } from "./register";
import { setupLogoutRoute } from "./logout";
import { setupUserRoute } from "./user";

export function setupAuthRoutes(app: Router) {
  const router = Router();
  
  setupLoginRoute(router);
  setupRegisterRoute(router);
  setupLogoutRoute(router);
  setupUserRoute(router);
  
  return router;
}
