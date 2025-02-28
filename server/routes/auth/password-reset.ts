import { Router, Request, Response } from "express";
import { db } from "@db";
import { users } from "@db/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";
import bcrypt from "bcrypt";
import nodemailer from "nodemailer";
import { handleRouteError } from "../utils/error-handler";

interface PasswordResetToken {
  email: string;
  expires: Date;
}

export function setupPasswordResetRoute(router: Router) {
  // Store tokens in memory
  const passwordResetTokens = new Map<string, PasswordResetToken>();

  // Request password reset
  router.post("/forgot-password", async (req: Request, res: Response) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      // Check if email exists
      const user = await db.query.users.findFirst({
        where: eq(users.email, email),
      });

      if (!user) {
        // Don't reveal if email exists
        return res.json({ message: "If your email is registered, you will receive a password reset link" });
      }

      // Generate token
      const token = crypto.randomBytes(32).toString("hex");
      const expires = new Date();
      expires.setHours(expires.getHours() + 1); // Token valid for 1 hour

      // Store token
      passwordResetTokens.set(token, { email, expires });

      // Create reset link
      const resetLink = `${req.headers.origin}/reset-password/${token}`;

      // TODO: Send email with reset link
      // This is a placeholder for email sending - in production this would use nodemailer
      console.log(`Password reset link for ${email}: ${resetLink}`);

      res.json({ message: "If your email is registered, you will receive a password reset link" });
    } catch (error) {
      handleRouteError(res, error, "Failed to process password reset request");
    }
  });

  // Reset password with token
  router.post("/reset-password/:token", async (req: Request, res: Response) => {
    try {
      const { token } = req.params;
      const { password } = req.body;
      
      if (!password) {
        return res.status(400).json({ message: "Password is required" });
      }

      // Check if token exists and is valid
      const resetData = passwordResetTokens.get(token);
      if (!resetData) {
        return res.status(400).json({ message: "Invalid or expired token" });
      }

      // Check if token is expired
      if (resetData.expires < new Date()) {
        passwordResetTokens.delete(token);
        return res.status(400).json({ message: "Token has expired" });
      }

      // Get user by email
      const user = await db.query.users.findFirst({
        where: eq(users.email, resetData.email),
      });

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Hash password
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // Update user password
      await db
        .update(users)
        .set({ password: hashedPassword })
        .where(eq(users.id, user.id));

      // Remove used token
      passwordResetTokens.delete(token);

      res.json({ message: "Password has been reset successfully" });
    } catch (error) {
      handleRouteError(res, error, "Failed to reset password");
    }
  });

  return router;
}