const express = require("express");
const prisma = require("../utils/prisma");
const { authenticate } = require("../middleware/auth");

const router = express.Router();
router.use(authenticate);

/* ── GET /api/dashboard/stats — cumulative savings, leaderboard, etc ── */
router.get("/stats", async (req, res, next) => {
  try {
    const lists = await prisma.savedList.findMany({
      where: { userId: req.user.id },
      include: { items: { include: { product: { include: { storePrices: true } } } } },
    });
    let totalSaved = 0;
    let monthSaved = 0;
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    for (const list of lists) {
      for (const item of list.items) {
        const prices = (item.product?.storePrices || []).map((sp) => sp.price);
        if (prices.length >= 2) {
          const high = Math.max(...prices);
          const low = Math.min(...prices);
          const saving = (high - low) * item.quantity;
          totalSaved += saving;
          if (new Date(list.createdAt) >= monthStart) monthSaved += saving;
        }
      }
    }

    const cart = await prisma.cart.findUnique({
      where: { userId: req.user.id },
      include: { items: { include: { product: { include: { storePrices: true } } } } },
    });
    let cartOptimized = 0;
    let cartWorst = 0;
    if (cart && cart.items.length > 0) {
      for (const item of cart.items) {
        const prices = (item.product?.storePrices || []).map((sp) => sp.price);
        if (prices.length > 0) {
          cartOptimized += Math.min(...prices) * item.quantity;
          cartWorst += Math.max(...prices) * item.quantity;
        }
      }
    }

    res.json({
      totalSaved: Math.round(totalSaved),
      monthSaved: Math.round(monthSaved),
      savedListsCount: lists.length,
      cartOptimized,
      cartWorst,
    });
  } catch (err) {
    next(err);
  }
});

/* ── GET /api/dashboard/leaderboard — cheapest store ranking ── */
router.get("/leaderboard", async (req, res, next) => {
  try {
    const cart = await prisma.cart.findUnique({
      where: { userId: req.user.id },
      include: { items: { include: { product: { include: { storePrices: true } } } } },
    });
    const lists = await prisma.savedList.findMany({
      where: { userId: req.user.id },
      include: { items: { include: { product: { include: { storePrices: true } } } } },
    });

    const productIds = new Set();
    if (cart) cart.items.forEach((i) => productIds.add(i.productId));
    lists.forEach((l) => l.items.forEach((i) => productIds.add(i.productId)));

    if (productIds.size === 0) {
      return res.json({ leaderboard: [] });
    }

    const products = await prisma.product.findMany({
      where: { id: { in: Array.from(productIds) } },
      include: { storePrices: { include: { store: true } } },
    });

    const storeTotals = {};
    for (const p of products) {
      for (const sp of p.storePrices) {
        const sid = sp.store.id;
        if (!storeTotals[sid]) storeTotals[sid] = { store: sp.store, total: 0 };
        storeTotals[sid].total += sp.price;
      }
    }
    const ranking = Object.values(storeTotals)
      .sort((a, b) => a.total - b.total)
      .map((s, i) => ({ rank: i + 1, store: s.store, total: s.total }));

    res.json({ leaderboard: ranking });
  } catch (err) {
    next(err);
  }
});

/* ── GET /api/dashboard/price-alerts — price drop style deals + watchlist ── */
router.get("/price-alerts", async (req, res, next) => {
  try {
    const deals = await prisma.product.findMany({
      take: 20,
      include: {
        storePrices: {
          include: { store: { select: { id: true, name: true } } },
          orderBy: { price: "asc" },
        },
      },
    });
    const enriched = deals
      .map((p) => {
        const prices = p.storePrices.map((sp) => sp.price);
        if (prices.length < 2) return null;
        const low = Math.min(...prices);
        const high = Math.max(...prices);
        const saving = high - low;
        const cheapestSp = p.storePrices.find((sp) => sp.price === low);
        return {
          productId: p.id,
          name: p.name,
          brand: p.brand,
          wasPrice: high,
          nowPrice: low,
          saving,
          cheapestAt: cheapestSp?.store?.name,
        };
      })
      .filter(Boolean)
      .filter((x) => x.saving > 0)
      .sort((a, b) => b.saving - a.saving)
      .slice(0, 6);

    res.json({ alerts: enriched });
  } catch (err) {
    next(err);
  }
});

/* ── GET /api/dashboard/trending — most searched / popular in city ── */
router.get("/trending", async (req, res, next) => {
  try {
    const rows = await prisma.$queryRaw`
      SELECT product_id as "productId", SUM(quantity) as total
      FROM cart_items GROUP BY product_id ORDER BY total DESC LIMIT 5
    `;
    if (!rows || rows.length === 0) return res.json({ items: [] });
    const ids = rows.map((r) => r.productId || r.product_id).filter(Boolean);
    if (ids.length === 0) return res.json({ items: [] });
    const products = await prisma.product.findMany({
      where: { id: { in: ids } },
      include: {
        storePrices: {
          include: { store: { select: { name: true } } },
          orderBy: { price: "asc" },
        },
      },
    });
    const totals = Object.fromEntries(rows.map((r) => [(r.productId || r.product_id), Number(r.total || 0)]));
    const items = products.map((p) => {
      const prices = p.storePrices.map((sp) => sp.price);
      const cheapest = prices.length ? Math.min(...prices) : null;
      const cheapestSp = p.storePrices.find((sp) => sp.price === cheapest);
      return {
        productId: p.id,
        name: p.name,
        cheapestPrice: cheapest,
        cheapestAt: cheapestSp?.store?.name,
        cartCount: totals[p.id] || 0,
      };
    });
    res.json({ items });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
