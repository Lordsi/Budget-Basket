const express = require("express");
const prisma = require("../utils/prisma");
const { authenticate } = require("../middleware/auth");

const router = express.Router();

// All cart routes require authentication
router.use(authenticate);

/* ── GET /api/cart — fetch current user's cart with optimization ── */
router.get("/", async (req, res, next) => {
  try {
    const mode = req.query.mode || "multi_store";
    let cart = await prisma.cart.findUnique({
      where: { userId: req.user.id },
      include: {
        items: {
          include: {
            product: {
              include: {
                storePrices: {
                  include: { store: true },
                  orderBy: { price: "asc" },
                },
              },
            },
          },
        },
      },
    });

    if (!cart) {
      cart = await prisma.cart.create({
        data: { userId: req.user.id },
        include: { items: true },
      });
    }

    const allStores = await prisma.store.findMany({ select: { id: true, name: true, location: true, latitude: true, longitude: true } });

    // Build optimization data for each item
    const itemStorePrices = cart.items.map((item) =>
      item.product.storePrices.map((sp) => ({ storeId: sp.store.id, price: sp.price }))
    );
    let enrichedItems = cart.items.map((item, idx) => {
      const storePrices = itemStorePrices[idx] || [];
      const prices = storePrices.map((sp) => sp.price);
      const cheapest = prices.length ? Math.min(...prices) : 0;
      const highest = prices.length ? Math.max(...prices) : 0;
      const cheapestStore = item.product.storePrices.find((sp) => sp.price === cheapest)?.store || null;

      return {
        id: item.id,
        quantity: item.quantity,
        product: item.product,
        _storePrices: storePrices,
        cheapestPrice: cheapest,
        highestPrice: highest,
        cheapestStore,
        saving: (highest - cheapest) * item.quantity,
      };
    });

    // Single-store mode: pick the store that minimizes total
    if (mode === "single_store" && enrichedItems.length > 0) {
      const storeTotals = allStores.map((store) => {
        let total = 0;
        enrichedItems.forEach((item) => {
          const sp = item._storePrices.find((s) => s.storeId === store.id);
          total += (sp ? sp.price : Infinity) * item.quantity;
        });
        return { store, total };
      });
      const best = storeTotals.reduce((a, b) => (a.total <= b.total ? a : b));
      if (best.store && best.total < Infinity) {
        enrichedItems = enrichedItems.map((item) => {
          const sp = item._storePrices.find((s) => s.storeId === best.store.id);
          const price = sp ? sp.price : item.cheapestPrice;
          return {
            id: item.id,
            quantity: item.quantity,
            product: item.product,
            cheapestPrice: price,
            highestPrice: item.highestPrice,
            cheapestStore: best.store,
            saving: (item.highestPrice - price) * item.quantity,
          };
        });
      }
    }

    enrichedItems = enrichedItems.map(({ _storePrices, ...item }) => item);

    // Compute totals
    const optimizedTotal = enrichedItems.reduce(
      (sum, i) => sum + i.cheapestPrice * i.quantity,
      0
    );
    const worstCaseTotal = enrichedItems.reduce(
      (sum, i) => sum + i.highestPrice * i.quantity,
      0
    );

    res.json({
      id: cart.id,
      items: enrichedItems,
      itemCount: enrichedItems.reduce((sum, i) => sum + i.quantity, 0),
      optimizedTotal,
      worstCaseTotal,
      totalSavings: worstCaseTotal - optimizedTotal,
      mode,
    });
  } catch (err) {
    next(err);
  }
});

/* ── POST /api/cart/items — add item to cart ──────────────── */
router.post("/items", async (req, res, next) => {
  try {
    const { productId, quantity = 1 } = req.body;

    if (!productId) {
      return res.status(400).json({ error: "productId is required" });
    }

    let cart = await prisma.cart.findUnique({ where: { userId: req.user.id } });
    if (!cart) {
      cart = await prisma.cart.create({ data: { userId: req.user.id } });
    }

    // Upsert: if item already in cart, increment quantity
    const existing = await prisma.cartItem.findUnique({
      where: { cartId_productId: { cartId: cart.id, productId } },
    });

    let item;
    if (existing) {
      item = await prisma.cartItem.update({
        where: { id: existing.id },
        data: { quantity: existing.quantity + quantity },
        include: { product: true },
      });
    } else {
      item = await prisma.cartItem.create({
        data: { cartId: cart.id, productId, quantity },
        include: { product: true },
      });
    }

    res.status(201).json(item);
  } catch (err) {
    next(err);
  }
});

/* ── PATCH /api/cart/items/:itemId — update quantity ─────── */
router.patch("/items/:itemId", async (req, res, next) => {
  try {
    const { quantity } = req.body;
    if (quantity == null || quantity < 0) {
      return res.status(400).json({ error: "Valid quantity required" });
    }

    if (quantity === 0) {
      await prisma.cartItem.delete({ where: { id: req.params.itemId } });
      return res.json({ deleted: true });
    }

    const item = await prisma.cartItem.update({
      where: { id: req.params.itemId },
      data: { quantity },
      include: { product: true },
    });
    res.json(item);
  } catch (err) {
    next(err);
  }
});

/* ── DELETE /api/cart/items/:itemId — remove item ────────── */
router.delete("/items/:itemId", async (req, res, next) => {
  try {
    await prisma.cartItem.delete({ where: { id: req.params.itemId } });
    res.json({ deleted: true });
  } catch (err) {
    next(err);
  }
});

/* ── DELETE /api/cart — clear entire cart ─────────────────── */
router.delete("/", async (req, res, next) => {
  try {
    const cart = await prisma.cart.findUnique({ where: { userId: req.user.id } });
    if (cart) {
      await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
    }
    res.json({ cleared: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
