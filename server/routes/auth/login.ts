import { Router } from "express";
import passport from "passport";
import { type IVerifyOptions } from "passport-local";
import { User } from "../../auth";

export function setupLoginRoute(router: Router) {
  router.post("/login", (req, res, next) => {
    console.log("POST /api/auth/login called");

    if (!req.body.username || !req.body.password) {
      console.log("Missing credentials");
      return res.status(400).json({ 
        message: "Username and password are required" 
      });
    }

    console.log("Attempting authentication for user:", req.body.username);

    // Use custom callback to handle auth response
    passport.authenticate("local", (err: any, user: User | false, info: IVerifyOptions) => {
      if (err) {
        console.error("Authentication error:", err);
        return next(err);
      }

      if (!user) {
        console.log("Authentication failed:", info.message);
        return res.status(401).json({ 
          message: info.message ?? "Authentication failed" 
        });
      }

      // Log in the authenticated user
      req.logIn(user, (err) => {
        if (err) {
          console.error("Login error:", err);
          return next(err);
        }

        // Set up session
        if (req.session) {
          // Handle remember me functionality
          if (req.body.rememberMe) {
            req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
          }
        }

        console.log("User successfully logged in:", user.id);
        return res.json({
          message: "Login successful",
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            profilePicture: user.profilePicture
          }
        });
      });
    })(req, res, next);
  });
}