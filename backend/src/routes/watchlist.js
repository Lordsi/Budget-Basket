const express = require("express");
const prisma = require("../utils/prisma");
const { authenticate } = require("../middleware/auth");

const router = express.Router();
router.use(authenticate);

/* ── GET /api/watchlist — user's watched products with current prices ── */
router.get("/", async (req, res, next) => {
  try {
    const watches = await prisma.productWatch.findMany({
      where: { userId: req.user.id },
      include: {
        product: {
          include: {
            storePrices: {
              include: { store: { select: { id: true, name: true, location: true } } },
              orderBy: { price: "asc" },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    const enriched = watches
      .filter((w) => w.product)
      .map((w) => {
      const p = w.product;
      const prices = (p.storePrices || []).map((sp) => sp.price);
      const cheapest = prices.length ? Math.min(...prices) : null;
      const highest = prices.length ? Math.max(...prices) : null;
      const cheapestEntry = (p.storePrices || []).find((sp) => sp.price === cheapest);
      return {
        id: w.id,
        productId: p.id,
        product: p,
        cheapestPrice: cheapest,
        maxPrice: highest,
        potentialSaving: cheapest != null && highest != null ? highest - cheapest : 0,
        cheapestStore: cheapestEntry ? cheapestEntry.store : null,
      };
    });
    res.json({ items: enriched });
  } catch (err) {
    next(err);
  }
});

/* ── POST /api/watchlist — add product to watchlist ── */
router.post("/", async (req, res, next) => {
  try {
    const { productId } = req.body;
    if (!productId) return res.status(400).json({ error: "productId required" });
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) return res.status(404).json({ error: "Product not found" });
    const existing = await prisma.productWatch.findUnique({
      where: { userId_productId: { userId: req.user.id, productId } },
    });
    if (existing) return res.json(existing);
    const watch = await prisma.productWatch.create({
      data: { userId: req.user.id, productId },
    });
    res.status(201).json(watch);
  } catch (err) {
    next(err);
  }
});

/* ── DELETE /api/watchlist/:productId ── */
router.delete("/:productId", async (req, res, next) => {
  try {
    await prisma.productWatch.deleteMany({
      where: { userId: req.user.id, productId: req.params.productId },
    });
    res.json({ removed: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
