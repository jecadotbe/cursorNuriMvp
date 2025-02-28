import { Router } from "express";

export function setupUserRoute(router: Router) {
  router.get("/user", (req, res) => {
    if (req.isAuthenticated()) {
      if (!req.session?.passport?.user) {
        return res.status(401).json({ message: "Session expired" });
      }
      return res.json(req.user);
    }
    res.status(401).json({ message: "Not logged in" });
  });
}
