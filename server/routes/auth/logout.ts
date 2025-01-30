import { Router } from "express";

export function setupLogoutRoute(router: Router) {
  router.post("/logout", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(400).json({ message: "Not logged in" });
    }

    req.logout((err) => {
      if (err) {
        return res.status(500).json({ message: "Logout failed" });
      }

      res.clearCookie('nuri.session', {
        path: '/',
        httpOnly: true,
        secure: req.app.get("env") === "production",
        sameSite: 'lax'
      });

      res.json({ message: "Logout successful" });
    });
  });
}
