import { Request, Response, NextFunction } from 'express';
import { db } from '@db';
import { users } from '@db/schema';
import { crypto } from '../../lib/crypto';
import { NotFoundError, ValidationError } from '../../lib/error-handler';
import { eq } from 'drizzle-orm';
import nodemailer from 'nodemailer';

// In-memory token store (should be replaced with a database table in production)
const passwordResetTokens: Record<string, { userId: number, expires: Date }> = {};

// Token expiration time (1 hour)
const TOKEN_EXPIRATION = 60 * 60 * 1000;

/**
 * Forgot password controller
 */
export const forgotPasswordController = async (req: Request, res: Response, next: NextFunction) => {
  const { email } = req.body;
  
  if (!email) {
    throw new ValidationError('Email is required');
  }
  
  try {
    // Find user by email
    const user = await db.query.users.findFirst({
      where: eq(users.email, email)
    });
    
    if (!user) {
      // Don't reveal that the email doesn't exist
      return res.json({ 
        success: true, 
        message: 'If your email is registered, you will receive a password reset link' 
      });
    }
    
    // Generate token
    const token = crypto.generateToken();
    
    // Store token with expiration
    passwordResetTokens[token] = {
      userId: user.id,
      expires: new Date(Date.now() + TOKEN_EXPIRATION)
    };
    
    // Create reset URL
    const resetUrl = `${req.protocol}://${req.get('host')}/reset-password/${token}`;
    
    // Send email
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.example.com',
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER || 'user',
        pass: process.env.SMTP_PASS || 'password'
      }
    });
    
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || 'noreply@nuri.app',
      to: user.email,
      subject: 'Password Reset',
      text: `You requested a password reset. Please click the following link to reset your password: ${resetUrl}`,
      html: `
        <p>You requested a password reset.</p>
        <p>Please click the following link to reset your password:</p>
        <p><a href="${resetUrl}">${resetUrl}</a></p>
        <p>This link will expire in 1 hour.</p>
      `
    });
    
    return res.json({ 
      success: true, 
      message: 'If your email is registered, you will receive a password reset link' 
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Reset password controller
 */
export const resetPasswordController = async (req: Request, res: Response, next: NextFunction) => {
  const { token } = req.params;
  const { password } = req.body;
  
  if (!token || !password) {
    throw new ValidationError('Token and password are required');
  }
  
  try {
    // Check if token exists and is valid
    const tokenData = passwordResetTokens[token];
    
    if (!tokenData || tokenData.expires < new Date()) {
      throw new ValidationError('Invalid or expired token');
    }
    
    // Hash new password
    const hashedPassword = await crypto.hash(password);
    
    // Update user password
    await db.update(users)
      .set({ password: hashedPassword })
      .where(eq(users.id, tokenData.userId));
    
    // Remove token
    delete passwordResetTokens[token];
    
    return res.json({ 
      success: true, 
      message: 'Password reset successful' 
    });
  } catch (error) {
    next(error);
  }
}; 