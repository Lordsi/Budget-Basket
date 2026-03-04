const express = require("express");
const prisma = require("../utils/prisma");
const { authenticate, requireAdmin } = require("../middleware/auth");

const router = express.Router();

/* ── GET /api/products — paginated listing with filters ──── */
router.get("/", async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      category,
      search,
      sort = "name",
      order = "asc",
    } = req.query;

    const skip = (Number(page) - 1) * Number(limit);
    const take = Number(limit);

    const where = {};
    if (category) where.category = category;
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { brand: { contains: search } },
      ];
    }

    const orderBy = {};
    orderBy[sort] = order;

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take,
        orderBy,
        include: {
          storePrices: {
            include: { store: { select: { id: true, name: true, location: true } } },
            orderBy: { price: "asc" },
          },
        },
      }),
      prisma.product.count({ where }),
    ]);

    // Attach cheapest price, store, savings, and % to each product
    const enriched = products.map((p) => {
      const prices = p.storePrices.map((sp) => sp.price);
      const cheapest = prices.length ? Math.min(...prices) : null;
      const mostExpensive = prices.length ? Math.max(...prices) : null;
      const saving = cheapest != null && mostExpensive != null ? mostExpensive - cheapest : 0;
      const savingPercent = mostExpensive > 0 ? Math.round((saving / mostExpensive) * 100) : 0;
      const cheapestEntry = p.storePrices.find((sp) => sp.price === cheapest);
      return {
        ...p,
        cheapestPrice: cheapest,
        maxPrice: mostExpensive,
        potentialSaving: saving,
        savingPercent,
        cheapestStore: cheapestEntry ? cheapestEntry.store : null,
        priceUpdatedAt: cheapestEntry ? cheapestEntry.updatedAt : null,
      };
    });

    res.json({
      products: enriched,
      pagination: {
        page: Number(page),
        limit: take,
        total,
        totalPages: Math.ceil(total / take),
      },
    });
  } catch (err) {
    next(err);
  }
});

/* ── GET /api/products/suggest — auto-suggest for search bar ── */
router.get("/suggest", async (req, res, next) => {
  try {
    const q = (req.query.q || "").trim().toLowerCase();
    if (q.length < 2) {
      return res.json({ suggestions: [] });
    }
    const products = await prisma.product.findMany({
      where: {
        OR: [
          { name: { contains: q } },
          { brand: { contains: q } },
        ],
      },
      select: { id: true, name: true, brand: true, category: true },
      take: 8,
      orderBy: { name: "asc" },
    });
    res.json({ suggestions: products });
  } catch (err) {
    next(err);
  }
});

/* ── GET /api/products/popular — most added to cart by users (top product of the week) ── */
router.get("/popular", async (_req, res, next) => {
  try {
    const rows = await prisma.$queryRaw`
      SELECT product_id as "productId", SUM(quantity) as total
      FROM cart_items
      GROUP BY product_id
      ORDER BY total DESC
      LIMIT 4
    `;
    if (!rows || rows.length === 0) {
      return res.json({ popular: [], topProduct: null });
    }
    const productIds = rows.map((r) => r.productId || r.product_id);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      include: {
        storePrices: {
          include: { store: { select: { id: true, name: true, location: true } } },
          orderBy: { price: "asc" },
        },
      },
    });
    const totals = Object.fromEntries(rows.map((r) => [(r.productId || r.product_id), Number(r.total || 0)]));
    const enriched = products
      .map((p) => {
        const prices = p.storePrices.map((sp) => sp.price);
        const cheapest = prices.length ? Math.min(...prices) : null;
        const mostExpensive = prices.length ? Math.max(...prices) : null;
        const cheapestEntry = p.storePrices.find((sp) => sp.price === cheapest);
        return {
          ...p,
          cartCount: totals[p.id] || 0,
          cheapestPrice: cheapest,
          maxPrice: mostExpensive,
          potentialSaving: mostExpensive != null && cheapest != null ? mostExpensive - cheapest : 0,
          cheapestStore: cheapestEntry ? cheapestEntry.store : null,
        };
      })
      .sort((a, b) => (b.cartCount || 0) - (a.cartCount || 0));
    const topProduct = enriched[0] || null;
    res.json({ popular: enriched, topProduct });
  } catch (err) {
    next(err);
  }
});

/* ── GET /api/products/deals — top price drops (biggest savings) ── */
router.get("/deals", async (_req, res, next) => {
  try {
    const products = await prisma.product.findMany({
      take: 30,
      include: {
        storePrices: {
          include: { store: { select: { id: true, name: true, location: true } } },
          orderBy: { price: "asc" },
        },
      },
    });
    const enriched = products
      .map((p) => {
        const prices = p.storePrices.map((sp) => sp.price);
        const cheapest = prices.length ? Math.min(...prices) : null;
        const mostExpensive = prices.length ? Math.max(...prices) : null;
        const saving = cheapest != null && mostExpensive != null ? mostExpensive - cheapest : 0;
        const cheapestEntry = p.storePrices.find((sp) => sp.price === cheapest);
        return {
          ...p,
          cheapestPrice: cheapest,
          maxPrice: mostExpensive,
          potentialSaving: saving,
          cheapestStore: cheapestEntry ? cheapestEntry.store : null,
        };
      })
      .filter((p) => p.potentialSaving > 0)
      .sort((a, b) => b.potentialSaving - a.potentialSaving)
      .slice(0, 4);
    res.json({ deals: enriched });
  } catch (err) {
    next(err);
  }
});

/* ── GET /api/products/ticker — sample live savings for hero ticker ── */
router.get("/ticker", async (_req, res, next) => {
  try {
    const products = await prisma.product.findMany({
      take: 15,
      include: {
        storePrices: {
          include: { store: true },
          orderBy: { price: "asc" },
        },
      },
    });
    const items = products
      .map((p) => {
        const prices = p.storePrices.map((sp) => sp.price);
        if (prices.length < 2) return null;
        const cheapest = Math.min(...prices);
        const highest = Math.max(...prices);
        const saving = highest - cheapest;
        const cheapestSp = p.storePrices.find((sp) => sp.price === cheapest);
        const highestSp = p.storePrices.find((sp) => sp.price === highest);
        return {
          name: p.name,
          saving,
          cheapestAt: cheapestSp?.store?.name,
          expensiveAt: highestSp?.store?.name,
        };
      })
      .filter(Boolean)
      .filter((x) => x.saving > 0)
      .sort((a, b) => b.saving - a.saving)
      .slice(0, 5);
    res.json({ items });
  } catch (err) {
    next(err);
  }
});

/* ── GET /api/products/categories ────────────────────────── */
router.get("/categories", async (_req, res, next) => {
  try {
    const categories = await prisma.product.findMany({
      select: { category: true },
      distinct: ["category"],
      orderBy: { category: "asc" },
    });
    res.json(categories.map((c) => c.category));
  } catch (err) {
    next(err);
  }
});

/* ── GET /api/products/:id ───────────────────────────────── */
router.get("/:id", async (req, res, next) => {
  try {
    const product = await prisma.product.findUnique({
      where: { id: req.params.id },
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

    const prices = product.storePrices.map((sp) => sp.price);
    const cheapest = Math.min(...prices);
    const mostExpensive = Math.max(...prices);

    res.json({
      ...product,
      cheapestPrice: prices.length ? cheapest : null,
      maxPrice: prices.length ? mostExpensive : null,
      potentialSaving: prices.length ? mostExpensive - cheapest : 0,
    });
  } catch (err) {
    next(err);
  }
});

/* ── POST /api/products — admin: create product ──────────── */
router.post("/", authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { name, category, subcategory, brand, size, unit, imageUrl, description } =
      req.body;

    if (!name || !category) {
      return res.status(400).json({ error: "Name and category are required" });
    }

    const product = await prisma.product.create({
      data: { name, category, subcategory, brand, size, unit, imageUrl, description },
    });
    res.status(201).json(product);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
