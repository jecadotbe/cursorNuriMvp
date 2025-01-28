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
    // eslint-disable-next-line @typescript-eslint/no-empty-interface
    interface User extends Omit<User, "password"> {}
  }
}

export function setupAuth(app: Express) {
  // Create a new MemoryStore instance for each server start
  const MemoryStore = createMemoryStore(session);
  const sessionStore = new MemoryStore({
    checkPeriod: 86400000, // prune expired entries every 24h
    stale: false, // Don't serve stale sessions
    noDisposeOnSet: false, // Dispose old sessions when new ones are set
  });

  // Clear all existing sessions on server start
  sessionStore.clear();

  const sessionSettings: session.SessionOptions = {
    secret: randomBytes(32).toString('hex'), // Generate new secret on each restart
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: app.get("env") === "production",
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: 'lax'
    },
    store: sessionStore,
    rolling: true, // Refresh session with each request
    unset: 'destroy' // Remove session from store when unset
  };

  if (app.get("env") === "production") {
    app.set("trust proxy", 1);
  }

  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  // Clear all sessions periodically (every hour)
  setInterval(() => {
    sessionStore.clear();
  }, 3600000);

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
        return res.status(400).send("Username, password, and email are required");
      }

      const [existingUser] = await db
        .select()
        .from(users)
        .where(eq(users.username, req.body.username))
        .limit(1);

      if (existingUser) {
        return res.status(400).send("Username already exists");
      }

      const hashedPassword = await crypto.hash(req.body.password);

      const [newUser] = await db
        .insert(users)
        .values({
          username: req.body.username,
          password: hashedPassword,
          email: req.body.email,
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
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/login", (req, res, next) => {
    if (!req.body.username || !req.body.password) {
      return res.status(400).send("Username and password are required");
    }

    passport.authenticate("local", (err: any, user: User | false, info: IVerifyOptions) => {
      if (err) {
        return next(err);
      }

      if (!user) {
        return res.status(400).send(info.message ?? "Login failed");
      }

      // Regenerate session before login to prevent session fixation
      req.session.regenerate((err) => {
        if (err) {
          return next(err);
        }

        req.logIn(user, (err) => {
          if (err) {
            return next(err);
          }

          return res.json({
            message: "Login successful",
            user: { id: user.id, username: user.username },
          });
        });
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res) => {
    // Get the session ID before logout
    const sessionId = req.sessionID;

    req.logout((err) => {
      if (err) {
        return res.status(500).send("Logout failed");
      }

      // Destroy the current session
      req.session.destroy((err) => {
        if (err) {
          return res.status(500).send("Session destruction failed");
        }

        // Explicitly remove the session from store
        sessionStore.destroy(sessionId, (err) => {
          if (err) {
            console.error("Error destroying session in store:", err);
          }
          res.json({ message: "Logout successful" });
        });
      });
    });
  });

  app.get("/api/user", (req, res) => {
    if (req.isAuthenticated()) {
      return res.json(req.user);
    }
    res.status(401).send("Not authenticated");
  });
}