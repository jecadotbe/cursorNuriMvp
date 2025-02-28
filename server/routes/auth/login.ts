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
    const { rememberMe } = req.body;
    const rememberMeEnabled = rememberMe === true;
    
    console.log("Login attempt", { 
      username: req.body.username,
      rememberMe: rememberMeEnabled,
      ip: req.ip || "unknown"
    });
    
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
        
        console.log("Authentication failed", { 
          username: req.body.username, 
          reason: info?.message || "Unknown reason" 
        });
        
        return res.status(401).json({ message: info?.message || "Invalid credentials" });
      }
      
      // Configure session based on remember-me option
      if (req.session) {
        if (rememberMeEnabled) {
          // Set session to last for 30 days if remember me is checked
          req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
          console.log("Remember me enabled, extending session duration");
        } else {
          // Default session behavior (browser session)
          req.session.cookie.maxAge = undefined; // Session cookie (expires when browser closes)
          console.log("Standard session (expires with browser close)");
        }
      }
      
      // If authentication successful, log in the user
      req.login(user, (err) => {
        if (err) {
          console.error("Session error:", err);
          return res.status(500).json({ message: "Error establishing session" });
        }
        
        console.log("Login successful", { 
          userId: user.id,
          username: user.username,
          sessionID: req.sessionID,
          rememberMe: rememberMeEnabled
        });
        
        // Clear failed attempts counter for this IP
        const ip = req.ip || "unknown";
        clearLoginAttempts(ip);
        
        // Initialize suggestion checks
        if (req.session) {
          // @ts-ignore - Adding custom property to session
          req.session.checkSuggestions = true;
        }
        
        // Set cache-control headers to prevent caching
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        
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