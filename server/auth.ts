import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { type Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User } from "@shared/schema";
import connectPgSimple from "connect-pg-simple";
import { pool } from "./db";

const scryptAsync = promisify(scrypt);
const PgSession = connectPgSimple(session);

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedPasswordBuf = Buffer.from(hashed, "hex");
  const suppliedPasswordBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedPasswordBuf, suppliedPasswordBuf);
}

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "revira_secret_key",
    resave: false,
    saveUninitialized: false,
    store: new PgSession({
      pool,
      createTableIfMissing: true,
    }),
    cookie: {
      // secure: app.get("env") === "production",
      secure: false,
      maxAge: 1000 * 60 * 60 * 24, // 1 day
    },
  };

  // if (app.get("env") === "production") {
  //   app.set("trust proxy", 1);
  // }

  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user || !(await comparePasswords(password, user.password))) {
          return done(null, false);
        } else {
          return done(null, user);
        }
      } catch (err) {
        return done(err);
      }
    }),
  );

  passport.serializeUser((user, done) => done(null, (user as User).id));
  passport.deserializeUser(async (id, done) => {
    try {
      const user = await storage.getUser(id as number);
      done(null, user);
    } catch (err) {
      done(err);
    }
  });

  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) return next(err);
      if (!user)
        return res.status(401).json({ message: "Invalid credentials" });
      req.login(user, (err: any) => {
        if (err) return next(err);
        return res.status(200).json(user);
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated())
      return res.status(401).json({ message: "Unauthorized" });
    res.json(req.user);
  });

  app.post("/api/default-user", async (req, res, next) => {
    const existing = await storage.getUserByUsername("admin@reviranexgen.com");
    if (!existing) {
      const hashedPassword = await hashPassword("Admin@121");
      await storage.createUser({
        username: "admin@reviranexgen.com",
        password: hashedPassword,
        name: "Admin User",
        role: "Administrator"
      });
      console.log("Admin user seeded");
    }
    res.sendStatus(200);
  });

  // (async () => {
  //   const existing = await storage.getUserByUsername("admin@reviranexgen.com");
  //   if (!existing) {
  //     const hashedPassword = await hashPassword("Admin@121");
  //     await storage.createUser({
  //       username: "admin@reviranexgen.com",
  //       password: hashedPassword,
  //       name: "Admin User",
  //     });
  //     console.log("Admin user seeded");
  //   }
  // })();
}
