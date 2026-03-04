const express = require("express");
const prisma = require("../utils/prisma");
const { authenticate, requireAdmin } = require("../middleware/auth");

const router = express.Router();

/* ── GET /api/stores ─────────────────────────────────────── */
router.get("/", async (_req, res, next) => {
  try {
    const stores = await prisma.store.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { storePrices: true } } },
    });
    res.json(stores);
  } catch (err) {
    next(err);
  }
});

/* ── GET /api/stores/:id ─────────────────────────────────── */
router.get("/:id", async (req, res, next) => {
  try {
    const store = await prisma.store.findUnique({
      where: { id: req.params.id },
      include: {
        storePrices: {
          include: { product: true },
          orderBy: { price: "asc" },
        },
      },
    });

    if (!store) {
      return res.status(404).json({ error: "Store not found" });
    }
    res.json(store);
  } catch (err) {
    next(err);
  }
});

/* ── POST /api/stores — admin: create store ──────────────── */
router.post("/", authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { name, location, latitude, longitude, deliveryAvailable, deliveryCost, imageUrl } =
      req.body;

    if (!name || !location) {
      return res.status(400).json({ error: "Name and location are required" });
    }

    const store = await prisma.store.create({
      data: { name, location, latitude, longitude, deliveryAvailable, deliveryCost, imageUrl },
    });
    res.status(201).json(store);
  } catch (err) {
    next(err);
  }
});

/* ── POST /api/stores/:storeId/prices — admin: set price ── */
router.post("/:storeId/prices", authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { storeId } = req.params;
    const { productId, price, inStock } = req.body;

    if (!productId || price == null) {
      return res.status(400).json({ error: "productId and price are required" });
    }

    const storePrice = await prisma.storePrice.upsert({
      where: { productId_storeId: { productId, storeId } },
      update: { price, inStock: inStock ?? true },
      create: { productId, storeId, price, inStock: inStock ?? true },
    });

    res.json(storePrice);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
