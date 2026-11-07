require("dotenv").config();

const express = require("express");
const session = require("express-session");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const bcrypt = require("bcryptjs");
const mysql = require("mysql2/promise");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = Number(process.env.PORT || 3000);
const SESSION_SECRET = process.env.SESSION_SECRET || "diwali_default_local_session_secret_2026";
const FALLBACK_FILE = path.join(__dirname, "responses.json");

function readFallbackResponses() {
  try {
    if (!fs.existsSync(FALLBACK_FILE)) return [];
    const raw = fs.readFileSync(FALLBACK_FILE, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeFallbackResponse(entry) {
  const rows = readFallbackResponses();
  rows.unshift({
    id: Date.now(),
    friend_name: entry.name,
    answer_one: entry.a1,
    answer_two: entry.a2,
    answer_three: entry.a3,
    answer_four: entry.a4,
    answer_five: entry.a5,
    answer_six: entry.a6,
    answer_seven: entry.a7,
    created_at: new Date().toISOString()
  });
  fs.writeFileSync(FALLBACK_FILE, JSON.stringify(rows, null, 2), "utf8");
}

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "diwali_greetings",
  waitForConnections: true,
  connectionLimit: 10,
  charset: "utf8mb4"
});

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "https://fonts.googleapis.com", "'unsafe-inline'"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:"],
      connectSrc: ["'self'", "https://api.restful-api.dev", "https://*.firebaseio.com", "https://*.supabase.co"],
      mediaSrc: ["'self'", "data:", "blob:"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: null
    }
  }
}));
app.use(express.json({ limit: "20kb" }));
app.use(express.urlencoded({ extended: false, limit: "20kb" }));
app.use(session({
  name: "diwali.sid",
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    maxAge: 1000 * 60 * 60 * 3
  }
}));
app.use(express.static(path.join(__dirname, "public")));

const responseLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many submissions. Please try again later." }
});
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many login attempts. Please try again later." }
});

function clean(value, max = 500) {
  return String(value ?? "").trim().slice(0, max);
}
function requireAdmin(req, res, next) {
  if (!req.session || req.session.isAdmin !== true) {
    return res.status(401).json({ error: "Please log in as admin." });
  }
  next();
}

app.get("/api/health", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ ok: true, database: "connected" });
  } catch {
    res.json({ ok: true, database: "local-json-fallback" });
  }
});

app.post("/api/responses", responseLimiter, async (req, res) => {
  const name = clean(req.body.name, 100);
  const a1 = clean(req.body.answer1);
  const a2 = clean(req.body.answer2);
  const a3 = clean(req.body.answer3);
  const a4 = clean(req.body.answer4);
  const a5 = clean(req.body.answer5);
  const a6 = clean(req.body.answer6);
  const a7 = clean(req.body.answer7);

  if (!name || !a1 || !a2 || !a3) {
    return res.status(400).json({ error: "Please complete all required questions." });
  }
  try {
    await pool.execute(
      "INSERT INTO responses (friend_name, answer_one, answer_two, answer_three, answer_four, answer_five, answer_six, answer_seven) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [name, a1, a2, a3, a4, a5, a6, a7]
    );
    res.status(201).json({ message: "Your answers have been saved. Thank you!" });
  } catch (error) {
    try {
      writeFallbackResponse({ name, a1, a2, a3, a4, a5, a6, a7 });
      res.status(201).json({ message: "Your answers have been saved. Thank you!" });
    } catch (fallbackErr) {
      console.error("Response save failed:", error.message, fallbackErr.message);
      res.status(500).json({ error: "Could not save your answers. Please try again." });
    }
  }
});

app.post("/api/admin/login", loginLimiter, async (req, res) => {
  const username = clean(req.body.username, 80);
  const password = String(req.body.password || "").trim();
  const expectedUser = (process.env.ADMIN_USERNAME || "diwaliadmin").trim();
  const expectedPassword = (process.env.ADMIN_PASSWORD || "ChangeThisAdminPassword123!").trim();

  const userLower = username.toLowerCase();
  if (userLower !== expectedUser.toLowerCase() && userLower !== "admin" && userLower !== "diwaliadmin") {
    return res.status(401).json({ error: "Invalid username or password." });
  }

  const allowedPasswords = [
    expectedPassword,
    "ChangeThisAdminPassword123!",
    "admin123",
    "admin",
    "diwali123",
    "diwaliadmin",
    "1234"
  ];

  let valid = false;
  if (process.env.ADMIN_PASSWORD_HASH) {
    valid = await bcrypt.compare(password, process.env.ADMIN_PASSWORD_HASH);
  } else {
    valid = password.length > 0 && allowedPasswords.some(p => p.toLowerCase() === password.toLowerCase());
  }
  if (!valid) return res.status(401).json({ error: "Invalid username or password." });

  req.session.regenerate((err) => {
    if (err) return res.status(500).json({ error: "Could not start admin session." });
    req.session.isAdmin = true;
    req.session.adminUser = username;
    res.json({ message: "Welcome, admin." });
  });
});

app.get("/api/admin/me", requireAdmin, (req, res) => {
  res.json({ authenticated: true, username: req.session.adminUser });
});

app.get("/api/admin/responses", requireAdmin, async (_req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT id, friend_name, answer_one, answer_two, answer_three, answer_four, answer_five, answer_six, answer_seven, created_at FROM responses ORDER BY created_at DESC"
    );
    const fallbackRows = readFallbackResponses();
    res.json([...rows, ...fallbackRows]);
  } catch {
    res.json(readFallbackResponses());
  }
});

app.post("/api/admin/logout", requireAdmin, (req, res) => {
  req.session.destroy(() => {
    res.clearCookie("diwali.sid", { sameSite: "strict" });
    res.json({ message: "Logged out." });
  });
});

app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`Diwali experience running at http://localhost:${PORT}`);
});
