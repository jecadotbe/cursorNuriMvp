import { Router, Request, Response } from "express";
import passport from "passport";
import { IVerifyOptions } from "passport-local";
import { User } from "../../auth";
import { loginRateLimiter, clearLoginAttempts } from "../../middleware/rate-limit";

/**
 * Setup login route
 * @param router Express router to attach routes to
 */
export function setupLoginRoute(router: Router) {
  router.post("/login", loginRateLimiter, (req: Request, res: Response) => {
    if (!req.body.username || !req.body.password) {
      return res.status(400).json({ message: "Username and password are required" });
    }

    passport.authenticate("local", (err: any, user: User | false, info: IVerifyOptions) => {
      if (err) {
        return res.status(500).json({ message: "Authentication error" });
      }

      if (!user) {
        return res.status(400).json({ message: info.message ?? "Login failed" });
      }

      // Clear rate limiting on successful login
      if (req.ip) {
        clearLoginAttempts(req.ip);
      }

      // Handle remember me functionality
      if (req.body.rememberMe) {
        req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
      }

      req.session.checkSuggestions = true;

      // Log in the user
      req.login(user, (loginErr) => {
        if (loginErr) {
          return res.status(500).json({ message: "Login error" });
        }
        
        return res.json({
          message: "Login successful",
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            profilePicture: user.profilePicture
          },
        });
      });
    })(req, res);
  });
}