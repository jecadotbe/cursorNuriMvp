import { Router, Request, Response } from "express";
import passport from "passport";
import { IVerifyOptions } from "passport-local";
import { User } from "../../auth";
import { loginRateLimiter, clearLoginAttempts } from "../../middleware/rate-limit";
import { handleRouteError } from "../utils/error-handler";

export function setupLoginRoute(router: Router) {
  // Login route
  router.post("/login", loginRateLimiter, (req: Request, res: Response) => {
    try {
      passport.authenticate("local", (err: any, user: User | false, info: IVerifyOptions) => {
        if (err) {
          console.error("Authentication error:", err);
          return res.status(500).json({ message: "Internal authentication error" });
        }
        
        if (!user) {
          return res.status(401).json({ message: info.message || "Invalid username or password" });
        }
        
        req.login(user, (loginErr) => {
          if (loginErr) {
            console.error("Login error:", loginErr);
            return res.status(500).json({ message: "Error logging in" });
          }
          
          // Clear rate limiting after successful login
          clearLoginAttempts(req.ip);
          
          // Return user info without password
          const { password, ...userWithoutPassword } = user;
          return res.json({
            message: "Login successful",
            user: userWithoutPassword,
          });
        });
      })(req, res);
    } catch (error) {
      handleRouteError(res, error, "Login failed");
    }
  });

  return router;
}