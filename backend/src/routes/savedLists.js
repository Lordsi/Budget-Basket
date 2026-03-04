const express = require("express");
const prisma = require("../utils/prisma");
const { authenticate } = require("../middleware/auth");

const router = express.Router();
router.use(authenticate);

/* ── GET /api/saved-lists ────────────────────────────────── */
router.get("/", async (req, res, next) => {
  try {
    const lists = await prisma.savedList.findMany({
      where: { userId: req.user.id },
      include: {
        items: { include: { product: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json(lists);
  } catch (err) {
    next(err);
  }
});

/* ── POST /api/saved-lists — create from current basket ────── */
router.post("/", async (req, res, next) => {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ error: "List name is required" });
    }

    const cart = await prisma.cart.findUnique({
      where: { userId: req.user.id },
      include: { items: true },
    });

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ error: "Basket is empty" });
    }

    const savedList = await prisma.savedList.create({
      data: {
        userId: req.user.id,
        name,
        items: {
          create: cart.items.map((ci) => ({
            productId: ci.productId,
            quantity: ci.quantity,
          })),
        },
      },
      include: { items: { include: { product: true } } },
    });

    res.status(201).json(savedList);
  } catch (err) {
    next(err);
  }
});

/* ── GET /api/saved-lists/:id/refresh — re-fetch prices, return best store & totals ── */
router.get("/:id/refresh", async (req, res, next) => {
  try {
    const list = await prisma.savedList.findFirst({
      where: { id: req.params.id, userId: req.user.id },
      include: {
        items: {
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
        },
      },
    });
    if (!list) return res.status(404).json({ error: "List not found" });

    const mode = req.query.mode || "multi_store";
    const allStores = await prisma.store.findMany({ select: { id: true, name: true } });
    const validItems = list.items.filter((item) => item.product && item.product.storePrices);
    const enrichedItems = validItems.map((item) => {
      const prices = item.product.storePrices.map((sp) => ({ storeId: sp.store.id, price: sp.price }));
      const priceList = prices.map((p) => p.price);
      const cheapest = priceList.length ? Math.min(...priceList) : 0;
      const highest = priceList.length ? Math.max(...priceList) : 0;
      const cheapestStore = item.product.storePrices.find((sp) => sp.price === cheapest)?.store;
      return { ...item, _prices: prices, cheapest, highest, cheapestStore };
    });

    let singleStoreTotal = Infinity;
    let singleStoreBest = null;
    if (mode === "single_store" && enrichedItems.length > 0) {
      for (const store of allStores) {
        let total = 0;
        for (const item of enrichedItems) {
          const sp = item._prices.find((p) => p.storeId === store.id);
          total += (sp ? sp.price : Infinity) * item.quantity;
        }
        if (total < singleStoreTotal && total < Infinity) {
          singleStoreTotal = total;
          singleStoreBest = store;
        }
      }
    }

    const multiStoreTotal = enrichedItems.reduce((s, i) => s + i.cheapest * i.quantity, 0);
    const worstTotal = enrichedItems.reduce((s, i) => s + i.highest * i.quantity, 0);
    const bestTotal = mode === "single_store" && singleStoreBest ? singleStoreTotal : multiStoreTotal;

    const items = enrichedItems.map((item) => ({
      productId: item.productId,
      product: item.product,
      quantity: item.quantity,
      cheapestPrice: item.cheapest,
      cheapestStore: item.cheapestStore,
      potentialSaving: (item.highest - item.cheapest) * item.quantity,
    }));

    res.json({
      list: { id: list.id, name: list.name },
      mode,
      items,
      optimizedTotal: bestTotal,
      worstCaseTotal: worstTotal,
      totalSavings: worstTotal - bestTotal,
      bestStore: mode === "single_store" ? singleStoreBest : null,
    });
  } catch (err) {
    next(err);
  }
});

/* ── POST /api/saved-lists/:id/load — load list into basket ── */
router.post("/:id/load", async (req, res, next) => {
  try {
    const list = await prisma.savedList.findFirst({
      where: { id: req.params.id, userId: req.user.id },
      include: { items: true },
    });
    if (!list) return res.status(404).json({ error: "List not found" });

    let cart = await prisma.cart.findUnique({ where: { userId: req.user.id } });
    if (!cart) cart = await prisma.cart.create({ data: { userId: req.user.id } });

    for (const item of list.items) {
      const existing = await prisma.cartItem.findUnique({
        where: { cartId_productId: { cartId: cart.id, productId: item.productId } },
      });
      if (existing) {
        await prisma.cartItem.update({
          where: { id: existing.id },
          data: { quantity: existing.quantity + item.quantity },
        });
      } else {
        await prisma.cartItem.create({
          data: { cartId: cart.id, productId: item.productId, quantity: item.quantity },
        });
      }
    }
    res.json({ loaded: true });
  } catch (err) {
    next(err);
  }
});

/* ── DELETE /api/saved-lists/:id ─────────────────────────── */
router.delete("/:id", async (req, res, next) => {
  try {
    await prisma.savedList.delete({ where: { id: req.params.id } });
    res.json({ deleted: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
