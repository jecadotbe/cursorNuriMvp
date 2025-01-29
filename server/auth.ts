import passport from "passport";
import { IVerifyOptions, Strategy as LocalStrategy } from "passport-local";
import { type Express } from "express";
import session from "express-session";
import PgSession from "connect-pg-simple";
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

// Extend express User type with our schema
declare global {
  namespace Express {
    interface User {
      id: number;
      username: string;
      password: string;
      createdAt: Date;
    }
  }
}

export function setupAuth(app: Express) {
  // Initialize PostgreSQL session store
  const PostgresStore = PgSession(session);

  // Use a stable session secret
  const SESSION_SECRET = process.env.SESSION_SECRET || randomBytes(32).toString('hex');

  const sessionConfig: session.SessionOptions = {
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: new PostgresStore({
      conObject: {
        connectionString: process.env.DATABASE_URL,
      },
      tableName: 'sessions',
      createTableIfMissing: true,
      pruneSessionInterval: 24 * 60 * 60 // Prune expired sessions every 24h
    }),
    name: 'nuri.sid',
    cookie: {
      secure: app.get("env") === "production",
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: 'lax'
    }
  };

  // Enable secure cookies in production
  if (app.get("env") === "production") {
    app.set("trust proxy", 1);
    sessionConfig.cookie!.secure = true;
  }

  app.use(session(sessionConfig));
  app.use(passport.initialize());
  app.use(passport.session());

  // Add debugging middleware
  app.use((req, res, next) => {
    console.log(`[AUTH] ${req.method} ${req.path} - authenticated: ${req.isAuthenticated()}`);
    if (req.user) {
      console.log(`[AUTH] User: ${JSON.stringify(req.user)}`);
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
          console.log(`[AUTH] Login failed: User ${username} not found`);
          return done(null, false, { message: "Incorrect username." });
        }

        const isMatch = await crypto.compare(password, user.password);
        if (!isMatch) {
          console.log(`[AUTH] Login failed: Invalid password for user ${username}`);
          return done(null, false, { message: "Incorrect password." });
        }

        console.log(`[AUTH] Login successful for user ${username}`);
        return done(null, user);
      } catch (err) {
        console.error("[AUTH] Login error:", err);
        return done(err);
      }
    })
  );

  passport.serializeUser((user: Express.User, done) => {
    console.log(`[AUTH] Serializing user: ${user.username}`);
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
        console.log(`[AUTH] Deserialization failed: User ${id} not found`);
        return done(null, false);
      }

      console.log(`[AUTH] Deserialized user: ${user.username}`);
      done(null, user);
    } catch (err) {
      console.error("[AUTH] Deserialization error:", err);
      done(err);
    }
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).send("Username and password are required");
      }

      const [existingUser] = await db
        .select()
        .from(users)
        .where(eq(users.username, username))
        .limit(1);

      if (existingUser) {
        return res.status(400).send("Username already exists");
      }

      const hashedPassword = await crypto.hash(password);

      const [newUser] = await db
        .insert(users)
        .values({
          username,
          password: hashedPassword,
          createdAt: new Date(),
        })
        .returning();

      console.log(`[AUTH] New user registered: ${username}`);

      // Clear any existing session before login
      req.session.destroy((err) => {
        if (err) {
          console.error("[AUTH] Session destruction error:", err);
          return next(err);
        }

        // Create new session and log in
        req.login(newUser, (err) => {
          if (err) {
            return next(err);
          }
          return res.json({
            message: "Registration successful",
            user: { id: newUser.id, username: newUser.username },
          });
        });
      });
    } catch (error: any) {
      console.error("[AUTH] Registration error:", error);
      next(error);
    }
  });

  app.post("/api/login", (req, res, next) => {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).send("Username and password are required");
    }

    // Clear any existing session before authentication
    req.session.destroy((err) => {
      if (err) {
        console.error("[AUTH] Session destruction error:", err);
        return next(err);
      }

      passport.authenticate("local", (err: any, user: Express.User | false, info: IVerifyOptions) => {
        if (err) {
          return next(err);
        }

        if (!user) {
          return res.status(400).send(info.message ?? "Login failed");
        }

        // Create new session and log in
        req.login(user, (err) => {
          if (err) {
            return next(err);
          }

          console.log(`[AUTH] Login successful: ${user.username}`);
          return res.json({
            message: "Login successful",
            user: { id: user.id, username: user.username },
          });
        });
      })(req, res, next);
    });
  });

  app.post("/api/logout", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(200).json({ message: "No active session" });
    }

    const username = req.user?.username;
    console.log(`[AUTH] Logout attempt for user: ${username}`);

    req.logout((err) => {
      if (err) {
        console.error("[AUTH] Logout error:", err);
        return res.status(500).send("Logout failed");
      }

      req.session.destroy((err) => {
        if (err) {
          console.error("[AUTH] Session destruction error:", err);
          return res.status(500).send("Session destruction failed");
        }

        res.clearCookie('nuri.sid');
        console.log(`[AUTH] Logout successful for user: ${username}`);
        res.json({ message: "Logout successful" });
      });
    });
  });

  app.get("/api/user", (req, res) => {
    console.log(`[AUTH] User check - authenticated: ${req.isAuthenticated()}`);
    if (req.isAuthenticated() && req.user) {
      return res.json(req.user);
    }
    res.status(401).send("Not logged in");
  });
}