import { Router } from "express";
import { setupVillageSuggestionsRouter } from "./suggestions";

export const villageRouter = Router();

// Setup suggestion routes
setupVillageSuggestionsRouter(villageRouter);

// Export the router
export default villageRouter;
