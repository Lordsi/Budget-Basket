require("dotenv").config();
const path = require("path");
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");

const authRoutes = require("./routes/auth");
const productRoutes = require("./routes/products");
const storeRoutes = require("./routes/stores");
const cartRoutes = require("./routes/cart");
const comparisonRoutes = require("./routes/comparison");
const savedListRoutes = require("./routes/savedLists");
const watchlistRoutes = require("./routes/watchlist");
const dashboardRoutes = require("./routes/dashboard");

const app = express();
const PORT = process.env.PORT || 5000;

/* ── Global Middleware ────────────────────────────────────── */

app.use(morgan("dev"));
app.use(express.json());
app.use(cookieParser());
var corsOrigins = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(",").map(function(s) { return s.trim(); })
  : ["http://localhost:3000", "http://localhost:5000", "https://darkslategray-jaguar-744762.hostingersite.com"];
app.use(
  cors({
    origin: corsOrigins,
    credentials: true,
  })
);

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later." },
  skip: function(req) {
    var ip = req.ip || req.connection?.remoteAddress || "";
    return ip === "127.0.0.1" || ip === "::1" || ip === "::ffff:127.0.0.1";
  },
});
app.use(limiter);

/* ── Routes ───────────────────────────────────────────────── */

app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/stores", storeRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/compare", comparisonRoutes);
app.use("/api/saved-lists", savedListRoutes);
app.use("/api/watchlist", watchlistRoutes);
app.use("/api/dashboard", dashboardRoutes);

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

/* ── Serve HTML app (same origin, no CORS issues) ─────────────── */
const appRoot = path.join(__dirname, "../..");
app.get("/", (_req, res) => res.sendFile("index.html", { root: appRoot }));
app.get("/products", (_req, res) => res.sendFile("products.html", { root: appRoot }));
app.get("/products.html", (_req, res) => res.sendFile("products.html", { root: appRoot }));
app.get("/cart", (_req, res) => res.sendFile("basket.html", { root: appRoot }));
app.get("/cart.html", (_req, res) => res.sendFile("basket.html", { root: appRoot }));
app.get("/basket", (_req, res) => res.sendFile("basket.html", { root: appRoot }));
app.get("/basket.html", (_req, res) => res.sendFile("basket.html", { root: appRoot }));
app.get("/checkout", (_req, res) => res.sendFile("checkout.html", { root: appRoot }));
app.get("/dashboard", (_req, res) => res.sendFile("dashboard.html", { root: appRoot }));
app.get("/product", (_req, res) => res.sendFile("product.html", { root: appRoot }));
app.get("/product.html", (_req, res) => res.sendFile("product.html", { root: appRoot }));
app.get("/auth/login", (_req, res) => res.sendFile("auth/login.html", { root: appRoot }));
app.get("/auth/register", (_req, res) => res.sendFile("auth/register.html", { root: appRoot }));
app.use(express.static(appRoot));

/* ── Error Handler ────────────────────────────────────────── */

app.use((err, _req, res, _next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: err.message || "Internal server error",
  });
});

app.listen(PORT, () => {
  console.log("BudgetBasket API running on http://localhost:" + PORT);
  console.log("HTML app available at http://localhost:" + PORT);
});
