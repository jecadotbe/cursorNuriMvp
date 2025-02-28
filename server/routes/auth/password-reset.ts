import { Router, Request, Response } from "express";
import { db } from "@db";
import { users } from "@db/schema";
import { eq } from "drizzle-orm";
import { randomBytes } from "crypto";
import { promisify } from "util";
import nodemailer from "nodemailer";
import { scrypt } from "crypto";

const scryptAsync = promisify(scrypt);

interface PasswordResetToken {
  email: string;
  expires: Date;
}

// Store tokens in memory (should be moved to database in production)
const passwordResetTokens = new Map<string, PasswordResetToken>();

/**
 * Hash a password using scrypt with a random salt
 */
async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

/**
 * Setup password reset routes
 * @param router Express router to attach routes to
 */
export function setupPasswordResetRoute(router: Router) {
  // Request a password reset
  router.post("/forgot-password", async (req: Request, res: Response) => {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      // Check if email exists
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      if (!user) {
        // For security reasons, still return success even if email not found
        return res.json({ message: "If your email exists in our system, you will receive a password reset link" });
      }

      // Generate a token
      const token = randomBytes(32).toString("hex");
      const expires = new Date();
      expires.setHours(expires.getHours() + 1); // Token valid for 1 hour

      // Store token (in memory for demo, should be in database for production)
      passwordResetTokens.set(token, { email, expires });

      // Create reset link
      const resetLink = `${req.protocol}://${req.get("host")}/reset-password/${token}`;
      
      // TODO: In production, use a real email service
      console.log(`Reset link for ${email}: ${resetLink}`);
      
      // For demo purposes, we'd normally send an actual email
      const transporter = nodemailer.createTransport({
        host: "smtp.example.com",
        port: 587,
        secure: false,
        auth: {
          user: "username",
          pass: "password",
        },
        // In development, prevent actual sending
        ignoreTLS: true,
        tls: { rejectUnauthorized: false },
      });

      // Log the email content instead of sending in development
      const mailOptions = {
        from: '"Nuri Support" <support@nuri.example.com>',
        to: email,
        subject: "Password Reset Request",
        text: `You requested a password reset. Please click the following link to reset your password: ${resetLink}`,
        html: `<p>You requested a password reset.</p><p>Please click the following link to reset your password:</p><p><a href="${resetLink}">${resetLink}</a></p>`,
      };

      console.log("Email would be sent:", mailOptions);

      return res.json({
        message: "If your email exists in our system, you will receive a password reset link",
      });
    } catch (error) {
      console.error("Password reset request error:", error);
      return res.status(500).json({ message: "Error processing password reset request" });
    }
  });

  // Reset password with token
  router.post("/reset-password/:token", async (req: Request, res: Response) => {
    try {
      const { token } = req.params;
      const { password } = req.body;

      if (!password) {
        return res.status(400).json({ message: "New password is required" });
      }

      // Check if token exists and is valid
      const resetInfo = passwordResetTokens.get(token);
      if (!resetInfo) {
        return res.status(400).json({ message: "Invalid or expired token" });
      }

      // Check if token is expired
      if (resetInfo.expires < new Date()) {
        passwordResetTokens.delete(token);
        return res.status(400).json({ message: "Token has expired" });
      }

      // Find user by email
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, resetInfo.email))
        .limit(1);

      if (!user) {
        return res.status(400).json({ message: "User not found" });
      }

      // Hash the new password
      const hashedPassword = await hashPassword(password);

      // Update user's password
      await db
        .update(users)
        .set({ password: hashedPassword })
        .where(eq(users.id, user.id));

      // Remove used token
      passwordResetTokens.delete(token);

      return res.json({ message: "Password has been reset successfully" });
    } catch (error) {
      console.error("Password reset error:", error);
      return res.status(500).json({ message: "Error processing password reset" });
    }
  });
}