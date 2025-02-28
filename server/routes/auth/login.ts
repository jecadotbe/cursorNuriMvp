import { Router, Request, Response } from "express";
import passport from "passport";
import { IVerifyOptions } from "passport-local";
import { User } from "@db/schema";
import { loginRateLimiter, clearLoginAttempts } from "../../middleware/rate-limit";

/**
 * Setup login route
 * @param router Express router to attach routes to
 */
export function setupLoginRoute(router: Router) {
  router.post("/login", loginRateLimiter, (req: Request, res: Response) => {
    passport.authenticate("local", (err: any, user: User | false, info: IVerifyOptions) => {
      if (err) {
        console.error("Authentication error:", err);
        return res.status(500).json({ message: "Authentication error" });
      }

      if (!user) {
        return res.status(401).json({ 
          message: info?.message || "Invalid username or password" 
        });
      }

      req.login(user, (loginErr) => {
        if (loginErr) {
          console.error("Login error:", loginErr);
          return res.status(500).json({ message: "Login error" });
        }
        
        // Clear rate limiting for this IP after successful login
        clearLoginAttempts(req.ip);
        
        // Check for optional redirect or next URL
        const redirectTo = req.query.redirectTo as string;
        
        // Initialize suggestion check flag
        req.session.checkSuggestions = true;
        
        return res.json({
          message: "Logged in successfully",
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            profilePicture: user.profilePicture,
          },
          redirectTo,
        });
      });
    })(req, res);
  });
}