import { Router, Request, Response } from "express";
import { db } from "@db";
import { users } from "@db/schema";
import { eq } from "drizzle-orm";
import { randomBytes, scrypt } from "crypto";
import { promisify } from "util";
import nodemailer from "nodemailer";

const scryptAsync = promisify(scrypt);

// Store for password reset tokens
interface PasswordResetToken {
  email: string;
  expires: Date;
}

// In-memory token store (in production, this should be in a database)
const passwordResetTokens = new Map<string, PasswordResetToken>();

// Token expiration time (1 hour)
const TOKEN_EXPIRY = 60 * 60 * 1000;

// Configure nodemailer with a test account (for demonstration)
// In production, use a real email service
let transporter: nodemailer.Transporter;

async function setupEmailTransporter() {
  // Create a test account if not in production
  if (process.env.NODE_ENV !== 'production') {
    const testAccount = await nodemailer.createTestAccount();
    
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass
      }
    });
    
    console.log('Nodemailer configured with test account:', testAccount.user);
  } else {
    // Configure with real email service credentials in production
    transporter = nodemailer.createTransport({
      // Configure with actual email service (Gmail, SendGrid, etc.)
      service: process.env.EMAIL_SERVICE,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      }
    });
  }
}

// Initialize email transporter
setupEmailTransporter().catch(console.error);

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
  // Request password reset
  router.post("/forgot-password", async (req: Request, res: Response) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }
      
      // Check if user exists
      const user = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);
      
      if (!user || user.length === 0) {
        // Don't reveal if the email exists for security
        return res.json({ 
          message: "If that email address is in our database, we will send a password reset link"
        });
      }
      
      // Generate a random token
      const token = randomBytes(20).toString('hex');
      
      // Store token with expiry
      const expires = new Date(Date.now() + TOKEN_EXPIRY);
      passwordResetTokens.set(token, { email, expires });
      
      // Reset link (would use frontend URL in production)
      const resetUrl = `${req.protocol}://${req.get('host')}/reset-password/${token}`;
      
      // Email content
      const mailOptions = {
        from: '"Nuri Support" <support@nuri.com>',
        to: email,
        subject: 'Password Reset Request',
        text: `You requested a password reset. Please use the following link to reset your password: ${resetUrl}. This link will expire in 1 hour.`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Password Reset Request</h2>
            <p>You requested a password reset for your Nuri account.</p>
            <p>Please click the button below to reset your password:</p>
            <p style="text-align: center;">
              <a href="${resetUrl}" 
                 style="background-color: #4A5568; color: white; padding: 10px 20px; 
                        text-decoration: none; border-radius: 5px; display: inline-block;">
                Reset Password
              </a>
            </p>
            <p>This link will expire in 1 hour.</p>
            <p>If you didn't request a password reset, please ignore this email.</p>
          </div>
        `
      };
      
      // Send email
      if (transporter) {
        const info = await transporter.sendMail(mailOptions);
        console.log('Password reset email sent:', info.response);
        
        if (process.env.NODE_ENV !== 'production') {
          // For development, log preview URL for the test email
          console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
        }
      } else {
        console.warn('Email transporter not configured. Would have sent reset email to:', email);
      }
      
      // Don't reveal if the email exists for security
      return res.json({ 
        message: "If that email address is in our database, we will send a password reset link"
      });
      
    } catch (error) {
      console.error("Password reset request error:", error);
      return res.status(500).json({ message: "Server error" });
    }
  });
  
  // Process password reset
  router.post("/reset-password/:token", async (req: Request, res: Response) => {
    try {
      const { token } = req.params;
      const { password } = req.body;
      
      if (!password) {
        return res.status(400).json({ message: "Password is required" });
      }
      
      // Validate password strength
      if (password.length < 8) {
        return res.status(400).json({ message: "Password must be at least 8 characters long" });
      }
      
      // Check if token exists and is valid
      const resetData = passwordResetTokens.get(token);
      
      if (!resetData) {
        return res.status(400).json({ message: "Invalid or expired password reset token" });
      }
      
      // Check if token is expired
      if (new Date() > resetData.expires) {
        // Remove expired token
        passwordResetTokens.delete(token);
        return res.status(400).json({ message: "Password reset token has expired" });
      }
      
      // Hash the new password
      const hashedPassword = await hashPassword(password);
      
      // Update the user's password
      await db
        .update(users)
        .set({ password: hashedPassword })
        .where(eq(users.email, resetData.email));
      
      // Remove the used token
      passwordResetTokens.delete(token);
      
      return res.json({ message: "Password has been successfully reset" });
      
    } catch (error) {
      console.error("Password reset error:", error);
      return res.status(500).json({ message: "Server error" });
    }
  });
}