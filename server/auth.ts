import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { type Express } from "express";
import session from "express-session";
import createMemoryStore from "memorystore";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { users } from "@db/schema";
import { db } from "@db";
import { eq } from "drizzle-orm";

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
  password?: string;
  profilePicture: string | null;
  createdAt: Date;
  email: string;
}

declare global {
  namespace Express {
    interface User {
      id: number;
      username: string;
      profilePicture: string | null;
      createdAt: Date;
      email: string;
    }
  }
}

export function setupAuth(app: Express) {
  // Configure session store
  const MemoryStore = createMemoryStore(session);
  const store = new MemoryStore({
    checkPeriod: 86400000, // Prune expired entries every 24h
    ttl: 24 * 60 * 60 * 1000, // Session TTL (24 hours)
  });

  // Configure session middleware
  app.use(session({
    secret: process.env.SESSION_SECRET || randomBytes(32).toString('hex'),
    name: 'nuri.session',
    store: store,
    resave: false,
    saveUninitialized: false,
    rolling: true,
    proxy: app.get("env") === "production",
    cookie: {
      secure: app.get("env") === "production",
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000,
      sameSite: 'lax',
      path: '/'
    }
  }));

  // Initialize Passport and session handling
  app.use(passport.initialize());
  app.use(passport.session());

  // Configure Passport LocalStrategy
  passport.use(new LocalStrategy(async (username, password, done) => {
    try {
      console.log("Authenticating user:", username);

      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.username, username))
        .limit(1);

      if (!user) {
        console.log("User not found:", username);
        return done(null, false, { message: "Incorrect username or password" });
      }

      const isMatch = await crypto.compare(password, user.password);
      if (!isMatch) {
        console.log("Invalid password for user:", username);
        return done(null, false, { message: "Incorrect username or password" });
      }

      // Remove password from user object before serializing
      const { password: _, ...userWithoutPassword } = user;
      console.log("Authentication successful for user:", username);
      return done(null, userWithoutPassword as User);
    } catch (err) {
      console.error("Authentication error:", err);
      return done(err);
    }
  }));

  // User serialization
  passport.serializeUser((user, done) => {
    console.log("Serializing user:", user.id);
    done(null, user.id);
  });

  // User deserialization
  passport.deserializeUser(async (id: number, done) => {
    try {
      console.log("Deserializing user:", id);
      const [user] = await db
        .select({
          id: users.id,
          username: users.username,
          email: users.email,
          profilePicture: users.profilePicture,
          createdAt: users.createdAt
        })
        .from(users)
        .where(eq(users.id, id))
        .limit(1);

      if (!user) {
        console.log("User not found during deserialization:", id);
        return done(null, false);
      }

      console.log("User deserialized successfully:", id);
      done(null, user);
    } catch (err) {
      console.error("Deserialization error:", err);
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
            profilePicture: newUser.profilePicture
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

    passport.authenticate("local", (err: any, user: User | false, info: any) => {
      if (err) {
        return next(err);
      }

      if (!user) {
        return res.status(400).json({ message: info.message ?? "Login failed" });
      }

      // Handle remember me functionality
      if (req.body.rememberMe) {
        req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
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
            profilePicture: user.profilePicture
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

  return app;
}