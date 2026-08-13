require("dotenv").config();
const express = require("express");
const session = require("express-session");
const path = require("path");
const { pool, initDb } = require("./db");

const app = express();
const PORT = process.env.PORT || 5000;

// Login credentials for the person filling the form
const USERNAME = process.env.APP_USERNAME || "user";
const PASSWORD = process.env.APP_PASSWORD || "test123";

// Separate login for you (admin) to view submitted data
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

app.use(
  session({
    secret: process.env.SECRET_KEY || "please-change-this-secret-key",
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 * 4 }, // 4 hours
  })
);

// ---- Helpers ----
function requireLogin(req, res, next) {
  if (!req.session.loggedIn) return res.redirect("/login");
  next();
}

function requireAdmin(req, res, next) {
  if (!req.session.adminLoggedIn) return res.redirect("/admin");
  next();
}

// ---- Routes ----
app.get("/", (req, res) => res.redirect("/login"));

app.get("/login", (req, res) => {
  res.render("login", { error: null });
});

app.post("/login", (req, res) => {
  const { username, password } = req.body;
  if (username === USERNAME && password === PASSWORD) {
    req.session.loggedIn = true;
    return res.redirect("/form");
  }
  res.render("login", { error: "Galat username ya password. Dobara try karein." });
});

app.get("/form", requireLogin, (req, res) => {
  res.render("form", { success: null });
});

app.post("/form", requireLogin, async (req, res) => {
  const name = (req.body.name || "").trim();
  const address = (req.body.address || "").trim();
  const mobile = (req.body.mobile || "").trim();

  if (!name || !address || !mobile) {
    return res.render("form", { success: null, error: "Sab fields bharna zaroori hai." });
  }

  try {
    await pool.query(
      "INSERT INTO submissions (name, address, mobile) VALUES ($1, $2, $3)",
      [name, address, mobile]
    );
    res.render("form", { success: "Data safaltapoorvak submit ho gaya. Dhanyavaad!" });
  } catch (err) {
    console.error("Insert error:", err);
    res.status(500).render("form", { success: null, error: "Kuch galat ho gaya, dobara try karein." });
  }
});

app.get("/logout", (req, res) => {
  req.session.loggedIn = false;
  res.redirect("/login");
});

app.get("/admin", (req, res) => {
  if (!req.session.adminLoggedIn) {
    return res.render("admin_login", { error: null });
  }
  res.redirect("/admin/data");
});

app.post("/admin", (req, res) => {
  const { username, password } = req.body;
  if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
    req.session.adminLoggedIn = true;
    return res.redirect("/admin/data");
  }
  res.render("admin_login", { error: "Galat admin username ya password." });
});

app.get("/admin/data", requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, name, address, mobile, submitted_at FROM submissions ORDER BY id DESC"
    );
    res.render("admin", { rows: result.rows });
  } catch (err) {
    console.error("Fetch error:", err);
    res.status(500).send("Database error");
  }
});

app.get("/admin/logout", (req, res) => {
  req.session.adminLoggedIn = false;
  res.redirect("/admin");
});

// ---- Start server ----
initDb()
  .then(() => {
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch((err) => {
    console.error("Failed to initialize database:", err);
    process.exit(1);
  });
