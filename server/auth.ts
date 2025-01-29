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

declare global {
  namespace Express {
    interface User extends typeof users.$inferSelect { }
  }
}

export function setupAuth(app: Express) {
  const MemoryStore = createMemoryStore(session);

  // Generate a new session secret on each server start
  const sessionSecret = randomBytes(32).toString('hex');

  const sessionSettings: session.SessionOptions = {
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: app.get("env") === "production",
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: 'lax'
    },
    store: new MemoryStore({
      checkPeriod: 86400000, // prune expired entries every 24h
      stale: false // Don't serve stale sessions
    }),
    name: 'nuri.session', // Custom session cookie name
  };

  if (app.get("env") === "production") {
    app.set("trust proxy", 1);
  }

  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  // Clear all sessions on server start
  const store = sessionSettings.store as ReturnType<typeof createMemoryStore>;
  store.clear();

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

  passport.serializeUser((user: Express.User, done) => {
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
        return done(null, false);
      }
      done(null, user);
    } catch (err) {
      done(err);
    }
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).send("Username and password are required");
      }

      // Check if user already exists
      const [existingUser] = await db
        .select()
        .from(users)
        .where(eq(users.username, username))
        .limit(1);

      if (existingUser) {
        return res.status(400).send("Username already exists");
      }

      const hashedPassword = await crypto.hash(password);

      // Create new user with only required fields
      const [newUser] = await db
        .insert(users)
        .values({
          username,
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
          user: { id: newUser.id, username: newUser.username },
        });
      });
    } catch (error: any) {
      if (error.code === '23502') { // PostgreSQL not-null violation
        return res.status(400).send("Missing required fields");
      }
      next(error);
    }
  });

  app.post("/api/login", (req, res, next) => {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).send("Username and password are required");
    }

    passport.authenticate("local", (err: any, user: Express.User | false, info: IVerifyOptions) => {
      if (err) {
        return next(err);
      }

      if (!user) {
        return res.status(400).send(info.message ?? "Login failed");
      }

      req.login(user, (err) => {
        if (err) {
          return next(err);
        }

        // Set a fresh session cookie
        if (req.session) {
          req.session.regenerate((err) => {
            if (err) return next(err);
            return res.json({
              message: "Login successful",
              user: { id: user.id, username: user.username },
            });
          });
        }
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(200).json({ message: "No active session" });
    }

    const sessionStore = req.sessionStore;
    const sessionID = req.sessionID;

    req.logout((err) => {
      if (err) {
        return res.status(500).send("Logout failed");
      }

      // Destroy the session in the store
      sessionStore.destroy(sessionID, (err) => {
        if (err) {
          return res.status(500).send("Session destruction failed");
        }

        // Regenerate the session
        req.session.regenerate((err) => {
          if (err) {
            return res.status(500).send("Session regeneration failed");
          }

          // Clear the cookie
          res.clearCookie('nuri.session');
          res.json({ message: "Logout successful" });
        });
      });
    });
  });

  app.get("/api/user", (req, res) => {
    if (req.isAuthenticated()) {
      return res.json(req.user);
    }
    res.status(401).send("Not logged in");
  });
}