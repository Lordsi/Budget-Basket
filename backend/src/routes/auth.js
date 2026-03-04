const express = require("express");
const bcrypt = require("bcryptjs");
const prisma = require("../utils/prisma");
const {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} = require("../utils/jwt");
const { authenticate } = require("../middleware/auth");

const router = express.Router();
const SALT_ROUNDS = 12;

/* Cookie options shared between access & refresh tokens */
const cookieOpts = (maxAgeMs) => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  maxAge: maxAgeMs,
});

/* ── POST /api/auth/register ─────────────────────────────── */
router.post("/register", async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: "Name, email, and password are required" });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ error: "Email already registered" });
    }

    const hashed = await bcrypt.hash(password, SALT_ROUNDS);
    const user = await prisma.user.create({
      data: { name, email, password: hashed },
      select: { id: true, name: true, email: true, role: true },
    });

    // Create an empty cart for the new user
    await prisma.cart.create({ data: { userId: user.id } });

    const accessToken = signAccessToken({ userId: user.id, role: user.role });
    const refreshToken = signRefreshToken({ userId: user.id });

    res.cookie("accessToken", accessToken, cookieOpts(15 * 60 * 1000));
    res.cookie("refreshToken", refreshToken, cookieOpts(7 * 24 * 60 * 60 * 1000));

    res.status(201).json({ user, accessToken });
  } catch (err) {
    next(err);
  }
});

/* ── POST /api/auth/login ────────────────────────────────── */
router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const accessToken = signAccessToken({ userId: user.id, role: user.role });
    const refreshToken = signRefreshToken({ userId: user.id });

    res.cookie("accessToken", accessToken, cookieOpts(15 * 60 * 1000));
    res.cookie("refreshToken", refreshToken, cookieOpts(7 * 24 * 60 * 60 * 1000));

    res.json({
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      accessToken,
    });
  } catch (err) {
    next(err);
  }
});

/* ── POST /api/auth/refresh ──────────────────────────────── */
router.post("/refresh", async (req, res, next) => {
  try {
    const token = req.cookies?.refreshToken;
    if (!token) {
      return res.status(401).json({ error: "Refresh token missing" });
    }

    const decoded = verifyRefreshToken(token);
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, role: true },
    });

    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }

    const accessToken = signAccessToken({ userId: user.id, role: user.role });
    res.cookie("accessToken", accessToken, cookieOpts(15 * 60 * 1000));
    res.json({ accessToken });
  } catch (err) {
    return res.status(401).json({ error: "Invalid refresh token" });
  }
});

/* ── POST /api/auth/logout ───────────────────────────────── */
router.post("/logout", (_req, res) => {
  res.clearCookie("accessToken");
  res.clearCookie("refreshToken");
  res.json({ message: "Logged out" });
});

/* ── GET /api/auth/me ────────────────────────────────────── */
router.get("/me", authenticate, (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
