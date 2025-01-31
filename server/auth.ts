import passport from "passport";
import { IVerifyOptions, Strategy as LocalStrategy } from "passport-local";
import { type Express } from "express";
import session from "express-session";
import createMemoryStore from "memorystore";
import bcrypt from "bcrypt";
import { users } from "@db/schema";
import { db } from "@db";
import { eq } from "drizzle-orm";
import { randomBytes } from "crypto";

const SALT_ROUNDS = 10;

const crypto = {
  hash: async (password: string) => {
    return bcrypt.hash(password, SALT_ROUNDS);
  },
  compare: async (suppliedPassword: string, storedPassword: string) => {
    return bcrypt.compare(suppliedPassword, storedPassword);
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
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: 'lax',
      path: '/'
    },
    store: new MemoryStore({
      checkPeriod: 86400000, // 24 hours
      ttl: 24 * 60 * 60 * 1000 // 24 hours
    }),
  };

  if (app.get("env") === "production") {
    app.set("trust proxy", 1);
    sessionSettings.cookie!.secure = true;
  }

  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        console.log(`Attempting login for username: ${username}`);
        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.username, username))
          .limit(1);

        if (!user) {
          console.log('User not found');
          return done(null, false, { message: "Incorrect username." });
        }

        const isMatch = await crypto.compare(password, user.password);
        console.log(`Password match result: ${isMatch}`);

        if (!isMatch) {
          return done(null, false, { message: "Incorrect password." });
        }

        // Remove password from user object before passing to done
        const { password: _, ...userWithoutPassword } = user;
        return done(null, userWithoutPassword);
      } catch (err) {
        console.error('Authentication error:', err);
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

      if (!user) {
        return done(new Error('User not found'));
      }

      const { password: _, ...userWithoutPassword } = user;
      done(null, userWithoutPassword);
    } catch (err) {
      done(err);
    }
  });

  // Create global admin if it doesn't exist
  (async () => {
    try {
      const [existingAdmin] = await db
        .select()
        .from(users)
        .where(eq(users.username, 'global_admin'))
        .limit(1);

      if (!existingAdmin) {
        const hashedPassword = await crypto.hash('admin123');
        await db.insert(users).values({
          username: 'global_admin',
          password: hashedPassword,
          email: 'admin@nuri.ai',
          isAdmin: true,
          createdAt: new Date(),
        });
        console.log('Created global admin user');
      }
    } catch (error) {
      console.error('Error creating global admin:', error);
    }
  })();

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
          isAdmin: false, 
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

  app.post("/api/login", (req, res, next) => {
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
}