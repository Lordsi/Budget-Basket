const express = require("express");
const prisma = require("../utils/prisma");

const router = express.Router();

/**
 * GET /api/compare/:productId
 *
 * Returns a structured price comparison for a single product across all stores.
 * Highlights the cheapest option and shows savings vs. the most expensive.
 */
router.get("/:productId", async (req, res, next) => {
  try {
    const { productId } = req.params;

    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        storePrices: {
          include: { store: true },
          orderBy: { price: "asc" },
        },
      },
    });

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    if (product.storePrices.length === 0) {
      return res.json({ product, comparison: [], cheapest: null, savings: 0 });
    }

    const prices = product.storePrices.map((sp) => sp.price);
    const cheapestPrice = Math.min(...prices);
    const highestPrice = Math.max(...prices);

    const comparison = product.storePrices.map((sp) => ({
      store: sp.store,
      price: sp.price,
      inStock: sp.inStock,
      updatedAt: sp.updatedAt,
      isCheapest: sp.price === cheapestPrice,
      savingsVsHighest: highestPrice - sp.price,
    }));

    res.json({
      product: {
        id: product.id,
        name: product.name,
        category: product.category,
        brand: product.brand,
        size: product.size,
        imageUrl: product.imageUrl,
      },
      comparison,
      cheapestPrice,
      highestPrice,
      maxSaving: highestPrice - cheapestPrice,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/compare/basket
 *
 * Accepts an array of { productId, quantity } and returns:
 *  - Cost per store (all items from one store)
 *  - Optimized mixed-store total (cheapest per item)
 *  - Total savings
 */
router.post("/basket", async (req, res, next) => {
  try {
    const { items } = req.body; // [{ productId, quantity }]

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "Provide an items array" });
    }

    const productIds = items.map((i) => i.productId);
    const quantityMap = Object.fromEntries(items.map((i) => [i.productId, i.quantity || 1]));

    const storePrices = await prisma.storePrice.findMany({
      where: { productId: { in: productIds }, inStock: true },
      include: { store: true, product: true },
    });

    // Build a map: storeId -> { storeName, items: [{ product, price, qty, subtotal }], total }
    const storeMap = {};
    // Build a map: productId -> cheapest storePrice entry
    const cheapestPerProduct = {};

    for (const sp of storePrices) {
      const qty = quantityMap[sp.productId] || 1;

      // Per-store totals
      if (!storeMap[sp.storeId]) {
        storeMap[sp.storeId] = {
          store: sp.store,
          items: [],
          total: 0,
          hasAllItems: false,
        };
      }
      storeMap[sp.storeId].items.push({
        product: sp.product,
        price: sp.price,
        quantity: qty,
        subtotal: sp.price * qty,
      });
      storeMap[sp.storeId].total += sp.price * qty;

      // Track cheapest per product for mixed-store optimization
      if (
        !cheapestPerProduct[sp.productId] ||
        sp.price < cheapestPerProduct[sp.productId].price
      ) {
        cheapestPerProduct[sp.productId] = sp;
      }
    }

    // Mark stores that carry every requested item
    for (const sid of Object.keys(storeMap)) {
      storeMap[sid].hasAllItems = storeMap[sid].items.length === productIds.length;
    }

    // Optimized basket — cheapest per item across stores
    const optimizedItems = [];
    let optimizedTotal = 0;
    for (const pid of productIds) {
      const best = cheapestPerProduct[pid];
      if (best) {
        const qty = quantityMap[pid] || 1;
        optimizedItems.push({
          product: best.product,
          store: best.store,
          price: best.price,
          quantity: qty,
          subtotal: best.price * qty,
        });
        optimizedTotal += best.price * qty;
      }
    }

    // Highest possible total (worst-case: most expensive per item)
    let highestPossibleTotal = 0;
    for (const pid of productIds) {
      const qty = quantityMap[pid] || 1;
      const allPrices = storePrices
        .filter((sp) => sp.productId === pid)
        .map((sp) => sp.price);
      if (allPrices.length > 0) {
        highestPossibleTotal += Math.max(...allPrices) * qty;
      }
    }

    const totalSavings = highestPossibleTotal - optimizedTotal;

    // Single-store rankings sorted by total cost
    const singleStoreOptions = Object.values(storeMap)
      .filter((s) => s.hasAllItems)
      .sort((a, b) => a.total - b.total);

    res.json({
      optimized: {
        items: optimizedItems,
        total: optimizedTotal,
      },
      singleStoreOptions,
      highestPossibleTotal,
      totalSavings,
      savingsPercentage:
        highestPossibleTotal > 0
          ? Math.round((totalSavings / highestPossibleTotal) * 100)
          : 0,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
