import passport from "passport";
import { IVerifyOptions, Strategy as LocalStrategy } from "passport-local";
import { type Express } from "express";
import session from "express-session";
import createMemoryStore from "memorystore";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { users } from "@db/schema";
import { db } from "@db";
import { eq } from "drizzle-orm";
import { loginRateLimiter, clearLoginAttempts } from "./middleware/rate-limit";
import nodemailer from "nodemailer";


const scryptAsync = promisify(scrypt);
const crypto = {
  hash: async (password: string) => {
    const salt = randomBytes(16).toString("hex");
    const buf = (await scryptAsync(password, salt, 64)) as Buffer;
    return `${buf.toString("hex")}.${salt}`;
  },
  compare: async (suppliedPassword: string, storedPassword: string) => {
    const [hashedPassword, salt] = storedPassword.split(".");
    const hashedPasswordBuf = Buffer.from(hashedPassword, "hex");
    const suppliedPasswordBuf = (await scryptAsync(
      suppliedPassword,
      salt,
      64
    )) as Buffer;
    return timingSafeEqual(hashedPasswordBuf, suppliedPasswordBuf);
  },
};

export interface User {
  id: number;
  username: string;
  password: string;
  profilePicture: string | null;
  createdAt: Date;
  email: string;
  isAdmin: boolean;
}

declare global {
  namespace Express {
    interface User {
      id: number;
      username: string;
      profilePicture: string | null;
      createdAt: Date;
      email: string;
      isAdmin: boolean;
    }
  }
}

export function setupAuth(app: Express) {
  const MemoryStore = createMemoryStore(session);

  // Add security headers
  app.use((req, res, next) => {
    res.set({
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
      'X-Frame-Options': 'SAMEORIGIN',
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      'Surrogate-Control': 'no-store'
    });
    next();
  });

  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || randomBytes(32).toString('hex'),
    resave: false,
    saveUninitialized: false,
    name: 'nuri.session',
    rolling: true,
    cookie: {
      secure: app.get("env") === "production",
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000,
      sameSite: 'lax',
      path: '/'
    },
    store: new MemoryStore({
      checkPeriod: 86400000,
      ttl: 24 * 60 * 60 * 1000
    }),
  };

  if (app.get("env") === "production") {
    app.set("trust proxy", 1);
    sessionSettings.cookie!.secure = true;
  }

  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  app.use((req, res, next) => {
    if (req.path.startsWith('/api/') && !req.path.startsWith('/api/login') && !req.path.startsWith('/api/register') && !req.path.startsWith('/api/reset-password') && !req.path.startsWith('/api/reset-password/')) {
      if (!req.session || !req.session.passport) {
        if (req.xhr || req.path.startsWith('/api/')) {
          return res.status(401).json({ message: "Session expired" });
        }
        return res.redirect('/');
      }
    }
    next();
  });

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.username, username))
          .limit(1);

        if (!user) {
          return done(null, false, { message: "Incorrect username." });
        }
        const isMatch = await crypto.compare(password, user.password);
        if (!isMatch) {
          return done(null, false, { message: "Incorrect password." });
        }
        return done(null, user);
      } catch (err) {
        return done(err);
      }
    })
  );

  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, id))
        .limit(1);
      done(null, user);
    } catch (err) {
      done(err);
    }
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      if (!req.body.username || !req.body.password || !req.body.email) {
        return res.status(400).json({ message: "Username, email, and password are required" });
      }

      const [existingUser] = await db
        .select()
        .from(users)
        .where(eq(users.username, req.body.username))
        .limit(1);

      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }

      const hashedPassword = await crypto.hash(req.body.password);
      const [newUser] = await db
        .insert(users)
        .values({
          username: req.body.username,
          email: req.body.email,
          password: hashedPassword,
          createdAt: new Date(),
        })
        .returning();

      req.login(newUser, (err) => {
        if (err) {
          return next(err);
        }
        return res.json({
          message: "Registration successful",
          user: {
            id: newUser.id,
            username: newUser.username,
            email: newUser.email,
            profilePicture: newUser.profilePicture,
            isAdmin: newUser.isAdmin
          },
        });
      });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/login", loginRateLimiter, (req, res, next) => {
    if (!req.body.username || !req.body.password) {
      return res.status(400).json({ message: "Username and password are required" });
    }

    passport.authenticate("local", (err: any, user: User | false, info: IVerifyOptions) => {
      if (err) {
        return next(err);
      }

      if (!user) {
        return res.status(400).json({ message: info.message ?? "Login failed" });
      }

      // Clear rate limiting on successful login
      clearLoginAttempts(req.ip);

      // Handle remember me functionality
      if (req.body.rememberMe) {
        req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
      }

      req.session.checkSuggestions = true;

      req.logIn(user, (err) => {
        if (err) {
          return next(err);
        }

        return res.json({
          message: "Login successful",
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            profilePicture: user.profilePicture,
            isAdmin: user.isAdmin
          },
        });
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(400).json({ message: "Not logged in" });
    }

    req.logout((err) => {
      if (err) {
        return res.status(500).json({ message: "Logout failed" });
      }

      res.clearCookie('nuri.session', {
        path: '/',
        httpOnly: true,
        secure: app.get("env") === "production",
        sameSite: 'lax'
      });

      res.json({ message: "Logout successful" });
    });
  });

  app.get("/api/user", (req, res) => {
    if (req.isAuthenticated()) {
      if (!req.session?.passport?.user) {
        return res.status(401).json({ message: "Session expired" });
      }
      return res.json(req.user);
    }
    res.status(401).json({ message: "Not logged in" });
  });

  // Setup email transporter
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  // Store reset tokens (in production, this should be in the database)
  const passwordResetTokens = new Map<string, { email: string; expires: Date }>();

  app.post("/api/reset-password", async (req, res) => {
    try {
      const { email } = req.body;

      // Check if user exists
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      if (!user) {
        // For security, still return success even if email doesn't exist
        return res.json({ message: "If an account exists with this email, you will receive reset instructions." });
      }

      // Generate reset token
      const token = randomBytes(32).toString("hex");
      const expires = new Date(Date.now() + 3600000); // 1 hour expiry

      // Store token (in production, store in database)
      passwordResetTokens.set(token, { email, expires });

      // Send reset email
      const resetUrl = `${req.protocol}://${req.get("host")}/reset-password/${token}`;

      await transporter.sendMail({
        from: process.env.SMTP_FROM || "noreply@nuri.app",
        to: email,
        subject: "Reset your Nuri password",
        html: `
          <h1>Reset Your Password</h1>
          <p>Click the link below to reset your password. This link will expire in 1 hour.</p>
          <a href="${resetUrl}">Reset Password</a>
          <p>If you didn't request this, please ignore this email.</p>
        `,
      });

      res.json({ message: "If an account exists with this email, you will receive reset instructions." });
    } catch (error) {
      console.error("Password reset error:", error);
      res.status(500).json({ message: "Failed to process password reset request" });
    }
  });

  app.post("/api/reset-password/:token", async (req, res) => {
    try {
      const { token } = req.params;
      const { password } = req.body;

      const resetData = passwordResetTokens.get(token);
      if (!resetData || resetData.expires < new Date()) {
        return res.status(400).json({ message: "Invalid or expired reset token" });
      }

      // Update user's password
      const hashedPassword = await crypto.hash(password);
      await db
        .update(users)
        .set({ password: hashedPassword })
        .where(eq(users.email, resetData.email));

      // Remove used token
      passwordResetTokens.delete(token);

      res.json({ message: "Password successfully reset" });
    } catch (error) {
      console.error("Password reset error:", error);
      res.status(500).json({ message: "Failed to reset password" });
    }
  });
}