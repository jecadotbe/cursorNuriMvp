import { Router, Request, Response, NextFunction } from "express";
import passport from "passport";
import { IVerifyOptions } from "passport-local";
import { User } from "@db/schema";
import { incrementLoginAttempts, clearLoginAttempts, loginRateLimiter } from "../../middleware/rate-limit";

/**
 * Setup login route
 * @param router Express router to attach routes to
 */
export function setupLoginRoute(router: Router) {
  router.post("/login", loginRateLimiter, (req: Request, res: Response, next: NextFunction) => {
    passport.authenticate("local", (err: any, user: User | false, info: IVerifyOptions) => {
      // Handle authentication errors
      if (err) {
        console.error("Login error:", err);
        return res.status(500).json({ message: "Internal server error" });
      }
      
      // If authentication failed
      if (!user) {
        // Increment failed login attempts for rate limiting
        const ip = req.ip || "unknown";
        incrementLoginAttempts(ip);
        
        return res.status(401).json({ message: info?.message || "Invalid credentials" });
      }
      
      // If authentication successful, log in the user
      req.login(user, (err) => {
        if (err) {
          console.error("Session error:", err);
          return res.status(500).json({ message: "Error establishing session" });
        }
        
        // Clear failed attempts counter for this IP
        const ip = req.ip || "unknown";
        clearLoginAttempts(ip);
        
        // Initialize suggestion checks
        if (req.session) {
          // @ts-ignore - Adding custom property to session
          req.session.checkSuggestions = true;
        }
        
        // Return user info without password
        return res.json({
          message: "Login successful",
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            profilePicture: user.profilePicture,
            createdAt: user.createdAt
          }
        });
      });
    })(req, res, next);
  });
}