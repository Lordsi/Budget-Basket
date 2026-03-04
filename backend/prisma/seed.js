const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding BudgetBasket database...");

  /* Clear existing seed data (order matters for foreign keys) */
  await prisma.cartItem.deleteMany();
  await prisma.cart.deleteMany();
  await prisma.savedListItem.deleteMany();
  await prisma.savedList.deleteMany();
  await prisma.productWatch.deleteMany();
  await prisma.storePrice.deleteMany();
  await prisma.store.deleteMany();
  await prisma.product.deleteMany();
  await prisma.user.deleteMany();

  /* ── Stores ─────────────────────────────────────────────── */
  const stores = await Promise.all([
    prisma.store.create({
      data: {
        name: "Shoprite",
        location: "Lilongwe City Mall",
        latitude: -13.9626,
        longitude: 33.7741,
        deliveryAvailable: true,
        deliveryCost: 1500,
      },
    }),
    prisma.store.create({
      data: {
        name: "Spar",
        location: "Area 47, Lilongwe",
        latitude: -13.9435,
        longitude: 33.7513,
        deliveryAvailable: true,
        deliveryCost: 2000,
      },
    }),
    prisma.store.create({
      data: {
        name: "Game Stores",
        location: "Gateway Mall, Lilongwe",
        latitude: -13.9515,
        longitude: 33.7867,
        deliveryAvailable: false,
        deliveryCost: 0,
      },
    }),
    prisma.store.create({
      data: {
        name: "Peoples Trading Centre",
        location: "Ginnery Corner, Blantyre",
        latitude: -15.786,
        longitude: 35.0085,
        deliveryAvailable: true,
        deliveryCost: 1000,
      },
    }),
    prisma.store.create({
      data: {
        name: "Metro Cash & Carry",
        location: "Chirimba, Blantyre",
        latitude: -15.8112,
        longitude: 35.0343,
        deliveryAvailable: false,
        deliveryCost: 0,
      },
    }),
  ]);

  const [shoprite, spar, game, ptc, metro] = stores;

  /* Product images: Open Food Facts when available, else category-based Unsplash-style placeholders */
  const OFF = (barcode) => {
    const s = String(barcode).padStart(13, "0").slice(0, 13);
    return `https://images.openfoodfacts.org/images/products/${s.slice(0, 3)}/${s.slice(3, 6)}/${s.slice(6, 9)}/${s.slice(9)}/front_en.400.jpg`;
  };
  const PRODUCT_IMAGES = {
    "Coca-Cola": OFF("5449000009067"),
    "Fanta Orange": OFF("5449000214911"),
    "Sprite": OFF("5449000054227"),
    "Orange Juice": OFF("6001087361072"),
    "Instant Coffee": OFF("7613034152884"),
    "Tea Bags": OFF("6001087004226"),
    "Colgate": OFF("3017620422003"),
    "Toothpaste": OFF("3017620422003"),
    "Bar Soap": OFF("6001087118887"),
    "Lifebuoy": OFF("6001087118887"),
    "Body Lotion": OFF("8710443980022"),
    "Vaseline": OFF("8710443980022"),
    "Washing Powder": OFF("6001087310129"),
    "Surf": OFF("6001087310129"),
    "Dishwashing Liquid": OFF("6001087362006"),
    "Sunlight": OFF("6001087362006"),
    "Bleach": OFF("6001087360009"),
    "Jik": OFF("6001087360009"),
    "White Rice": OFF("5410126752092"),
    "Basmati Rice": OFF("6291041505292"),
    "Bread Flour": OFF("6001087361099"),
    "White Sugar": OFF("6001087004523"),
    "Brown Sugar": OFF("6001087004288"),
    "Pasta Spaghetti": OFF("8076809515088"),
    "Macaroni": OFF("8076809515095"),
    "Baked Beans": OFF("6001087362075"),
    "Peanut Butter": OFF("6001087361027"),
    "Margarine": OFF("6001087362038"),
    "Mayonnaise": OFF("6001087362045"),
    "Tomato Sauce": OFF("6001087362008"),
    "Instant Noodles": OFF("8996001340026"),
    "Indomie": OFF("8996001340026"),
    "Oats": OFF("6001087361060"),
    "Cornflakes": OFF("5010028055129"),
    "Kellogg's": OFF("5010028055129"),
    "Milk Powder": OFF("3045320001892"),
    "Nido": OFF("3045320001892"),
    "Condensed Milk": OFF("8710443990021"),
    "Peak": OFF("8710443990021"),
    "Sunflower Cooking Oil": OFF("6001087362015"),
    "Vegetable Oil": OFF("6001087362015"),
    "Olive Oil": OFF("4008400402263"),
    "Curry Powder": OFF("6001087361105"),
    "Black Pepper": OFF("6001087361112"),
    "Shampoo": OFF("4005800034516"),
    "Head & Shoulders": OFF("4005800034516"),
    "Conditioner": OFF("4005800034523"),
    "Dove": OFF("4005800034523"),
    "Toilet Paper": OFF("6001087363003"),
    "UHT Milk": OFF("6001087362002"),
    "Bottled Water": OFF("6001087361008"),
    "Red Kidney Beans": OFF("6001087362052"),
    "Sardines in Tomato": OFF("6001087362069"),
    "Toothpaste Colgate": OFF("3017620422003"),
  };
  const CATEGORY_IMAGES = {
    Food: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&h=400&fit=crop",
    "Cooking Oil": "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=400&h=400&fit=crop",
    Spices: "https://images.unsplash.com/photo-1506368249639-73a05d6f6488?w=400&h=400&fit=crop",
    Vegetables: "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=400&h=400&fit=crop",
    Beverages: "https://images.unsplash.com/photo-1544145945-f90425340c7e?w=400&h=400&fit=crop",
    Household: "https://images.unsplash.com/photo-1563453392212-326f5e854473?w=400&h=400&fit=crop",
    Toiletries: "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400&h=400&fit=crop",
  };
  const img = (pd) => {
    const key = pd.name in PRODUCT_IMAGES ? pd.name : (pd.brand || "") + " " + pd.name;
    const byKey = key.trim() && PRODUCT_IMAGES[key.trim()];
    const byName = PRODUCT_IMAGES[pd.name];
    const byBrand = pd.brand && PRODUCT_IMAGES[pd.brand];
    return byKey || byName || byBrand || CATEGORY_IMAGES[pd.category] || `https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&h=400&fit=crop`;
  };

  /* Helper: price variation per store (shoprite, spar, game, ptc, metro) */
  const pr = (a, b, c, d, e) => [
    { store: shoprite, price: a },
    { store: spar, price: b },
    { store: game, price: c },
    { store: ptc, price: d },
    { store: metro, price: e },
  ];

  /* ── Products & Prices ──────────────────────────────────── */
  const productData = [
    // ── Food / Rice ──
    {
      name: "White Rice",
      category: "Food",
      subcategory: "Rice",
      brand: "Kilombero",
      size: "5kg",
      unit: "bag",
      prices: pr(8500, 9200, 8900, 8100, 7800),
    },
    {
      name: "Basmati Rice",
      category: "Food",
      subcategory: "Rice",
      brand: "Tastic",
      size: "2kg",
      unit: "packet",
      prices: pr(5500, 5800, 5200, 5700, 5100),
    },
    // ── Food / Flour ──
    {
      name: "Bread Flour",
      category: "Food",
      subcategory: "Flour",
      brand: "Bakhresa",
      size: "2kg",
      unit: "packet",
      prices: pr(3200, 3500, 3300, 3100, 2900),
    },
    {
      name: "Maize Flour (Ufa Woyera)",
      category: "Food",
      subcategory: "Flour",
      brand: "Ndamera",
      size: "5kg",
      unit: "bag",
      prices: pr(6800, 7200, 7000, 6500, 6200),
    },
    // ── Food / Sugar ──
    {
      name: "White Sugar",
      category: "Food",
      subcategory: "Sugar",
      brand: "Illovo",
      size: "2kg",
      unit: "packet",
      prices: pr(4500, 4800, 4600, 4400, 4200),
    },
    {
      name: "Brown Sugar",
      category: "Food",
      subcategory: "Sugar",
      brand: "Illovo",
      size: "1kg",
      unit: "packet",
      prices: pr(2800, 3000, 2900, 2700, 2600),
    },
    // ── Cooking Oil ──
    {
      name: "Sunflower Cooking Oil",
      category: "Cooking Oil",
      subcategory: null,
      brand: "Kazinga",
      size: "2L",
      unit: "bottle",
      prices: pr(7500, 7900, 7700, 7200, 6900),
    },
    {
      name: "Vegetable Oil",
      category: "Cooking Oil",
      subcategory: null,
      brand: "Sunseed",
      size: "1L",
      unit: "bottle",
      prices: pr(4200, 4500, 4400, 4000, 3800),
    },
    // ── Spices ──
    {
      name: "Curry Powder",
      category: "Spices",
      subcategory: null,
      brand: "Rajah",
      size: "100g",
      unit: "jar",
      prices: pr(1800, 2100, 1900, 1700, 1600),
    },
    {
      name: "Black Pepper",
      category: "Spices",
      subcategory: null,
      brand: "Rajah",
      size: "50g",
      unit: "jar",
      prices: pr(1500, 1700, 1600, 1400, 1350),
    },
    {
      name: "Mixed Herbs",
      category: "Spices",
      subcategory: null,
      brand: "Ina Paarman",
      size: "200ml",
      unit: "bottle",
      prices: pr(3200, 3500, 3400, 3100, 3000),
    },
    // ── Vegetables ──
    {
      name: "Tomatoes",
      category: "Vegetables",
      subcategory: null,
      brand: null,
      size: "1kg",
      unit: "kg",
      prices: pr(2500, 2800, 2700, 2200, 2000),
    },
    {
      name: "Onions",
      category: "Vegetables",
      subcategory: null,
      brand: null,
      size: "1kg",
      unit: "kg",
      prices: pr(1800, 2000, 1900, 1700, 1500),
    },
    {
      name: "Potatoes",
      category: "Vegetables",
      subcategory: null,
      brand: null,
      size: "2kg",
      unit: "bag",
      prices: pr(3500, 3800, 3600, 3300, 3100),
    },
    {
      name: "Cabbage",
      category: "Vegetables",
      subcategory: null,
      brand: null,
      size: "1 head",
      unit: "piece",
      prices: pr(1200, 1500, 1300, 1100, 1000),
    },
    // ── Beverages ──
    {
      name: "Coca-Cola",
      category: "Beverages",
      subcategory: null,
      brand: "Coca-Cola",
      size: "2L",
      unit: "bottle",
      prices: pr(1800, 1900, 1850, 1750, 1700),
    },
    {
      name: "Orange Juice",
      category: "Beverages",
      subcategory: null,
      brand: "Sobo",
      size: "1L",
      unit: "carton",
      prices: pr(2200, 2500, 2300, 2100, 2000),
    },
    {
      name: "Instant Coffee",
      category: "Beverages",
      subcategory: null,
      brand: "Nescafé",
      size: "200g",
      unit: "jar",
      prices: pr(6500, 7000, 6800, 6300, 6100),
    },
    {
      name: "Tea Bags",
      category: "Beverages",
      subcategory: null,
      brand: "Five Roses",
      size: "100 bags",
      unit: "box",
      prices: pr(3500, 3800, 3600, 3400, 3200),
    },
    // ── Household ──
    {
      name: "Washing Powder",
      category: "Household",
      subcategory: null,
      brand: "Surf",
      size: "2kg",
      unit: "box",
      prices: pr(5500, 5900, 5700, 5200, 5000),
    },
    {
      name: "Dishwashing Liquid",
      category: "Household",
      subcategory: null,
      brand: "Sunlight",
      size: "750ml",
      unit: "bottle",
      prices: pr(2800, 3100, 2900, 2700, 2500),
    },
    {
      name: "Bleach",
      category: "Household",
      subcategory: null,
      brand: "Jik",
      size: "1L",
      unit: "bottle",
      prices: pr(1600, 1800, 1700, 1500, 1400),
    },
    // ── Toiletries ──
    {
      name: "Toothpaste",
      category: "Toiletries",
      subcategory: null,
      brand: "Colgate",
      size: "100ml",
      unit: "tube",
      prices: pr(2200, 2500, 2300, 2100, 2000),
    },
    {
      name: "Bar Soap",
      category: "Toiletries",
      subcategory: null,
      brand: "Lifebuoy",
      size: "175g",
      unit: "bar",
      prices: pr(800, 950, 870, 750, 700),
    },
    {
      name: "Body Lotion",
      category: "Toiletries",
      subcategory: null,
      brand: "Vaseline",
      size: "400ml",
      unit: "bottle",
      prices: pr(4500, 4800, 4700, 4300, 4100),
    },
    // ── Food (continued) ──
    { name: "Pasta Spaghetti", category: "Food", subcategory: "Pasta", brand: "Regal", size: "500g", unit: "pack", prices: pr(1800, 2100, 1950, 1700, 1600) },
    { name: "Macaroni", category: "Food", subcategory: "Pasta", brand: "Purity", size: "400g", unit: "box", prices: pr(1500, 1800, 1650, 1400, 1350) },
    { name: "Baked Beans", category: "Food", subcategory: "Canned", brand: "Koo", size: "410g", unit: "can", prices: pr(2200, 2500, 2350, 2100, 2000) },
    { name: "Sardines in Tomato", category: "Food", subcategory: "Canned", brand: "Mazoe", size: "155g", unit: "can", prices: pr(1800, 2000, 1900, 1700, 1650) },
    { name: "Red Kidney Beans", category: "Food", subcategory: "Legumes", brand: "Ceres", size: "500g", unit: "packet", prices: pr(2500, 2800, 2650, 2400, 2300) },
    { name: "Yellow Split Peas", category: "Food", subcategory: "Legumes", brand: null, size: "1kg", unit: "bag", prices: pr(3500, 3800, 3650, 3300, 3200) },
    { name: "Peanut Butter", category: "Food", subcategory: "Spreads", brand: "Black Cat", size: "400g", unit: "jar", prices: pr(4200, 4500, 4350, 4000, 3900) },
    { name: "Margarine", category: "Food", subcategory: "Spreads", brand: "Rama", size: "500g", unit: "tub", prices: pr(3800, 4100, 3950, 3600, 3500) },
    { name: "Mayonnaise", category: "Food", subcategory: "Condiments", brand: "Heinz", size: "370g", unit: "jar", prices: pr(3200, 3500, 3350, 3000, 2900) },
    { name: "Tomato Sauce", category: "Food", subcategory: "Condiments", brand: "All Gold", size: "400g", unit: "bottle", prices: pr(1850, 2100, 1950, 1750, 1700) },
    { name: "Instant Noodles", category: "Food", subcategory: "Noodles", brand: "Indomie", size: "5 pack", unit: "pack", prices: pr(3500, 3800, 3650, 3300, 3200) },
    { name: "Oats", category: "Food", subcategory: "Cereal", brand: "Jungle", size: "500g", unit: "box", prices: pr(2800, 3100, 2950, 2650, 2550) },
    { name: "Cornflakes", category: "Food", subcategory: "Cereal", brand: "Kellogg's", size: "500g", unit: "box", prices: pr(4500, 4800, 4650, 4300, 4200) },
    { name: "Milk Powder", category: "Food", subcategory: "Dairy", brand: "Nido", size: "400g", unit: "tin", prices: pr(5500, 5900, 5700, 5200, 5100) },
    { name: "Condensed Milk", category: "Food", subcategory: "Dairy", brand: "Peak", size: "397g", unit: "tin", prices: pr(2200, 2500, 2350, 2100, 2050) },
    // ── Cooking Oil (more) ──
    { name: "Palm Cooking Oil", category: "Cooking Oil", subcategory: null, brand: "Bidco", size: "1L", unit: "bottle", prices: pr(2500, 2800, 2650, 2400, 2300) },
    { name: "Olive Oil", category: "Cooking Oil", subcategory: null, brand: "Mazola", size: "500ml", unit: "bottle", prices: pr(6500, 7000, 6750, 6200, 6000) },
    { name: "Sunflower Oil", category: "Cooking Oil", subcategory: null, brand: "Golden Fry", size: "750ml", unit: "bottle", prices: pr(3200, 3500, 3350, 3000, 2900) },
    // ── Spices (more) ──
    { name: "Paprika", category: "Spices", subcategory: null, brand: "Robertsons", size: "50g", unit: "jar", prices: pr(1200, 1400, 1300, 1100, 1050) },
    { name: "Turmeric", category: "Spices", subcategory: null, brand: "Rajah", size: "50g", unit: "jar", prices: pr(950, 1100, 1025, 900, 850) },
    { name: "Cinnamon Stick", category: "Spices", subcategory: null, brand: "Robertsons", size: "50g", unit: "pack", prices: pr(1800, 2100, 1950, 1700, 1650) },
    { name: "Chilli Powder", category: "Spices", subcategory: null, brand: "Rajah", size: "100g", unit: "jar", prices: pr(1400, 1600, 1500, 1300, 1250) },
    { name: "Garlic Powder", category: "Spices", subcategory: null, brand: "Robertsons", size: "50g", unit: "jar", prices: pr(1650, 1900, 1775, 1550, 1500) },
    { name: "Ginger Powder", category: "Spices", subcategory: null, brand: "Rajah", size: "50g", unit: "jar", prices: pr(1350, 1550, 1450, 1250, 1200) },
    { name: "Oregano", category: "Spices", subcategory: null, brand: "Robertsons", size: "20g", unit: "jar", prices: pr(1150, 1350, 1250, 1050, 1000) },
    // ── Vegetables (more) ──
    { name: "Carrots", category: "Vegetables", subcategory: null, brand: null, size: "1kg", unit: "bunch", prices: pr(2200, 2500, 2350, 2100, 2000) },
    { name: "Green Beans", category: "Vegetables", subcategory: null, brand: null, size: "500g", unit: "pack", prices: pr(1800, 2100, 1950, 1700, 1650) },
    { name: "Spinach", category: "Vegetables", subcategory: null, brand: null, size: "250g", unit: "bunch", prices: pr(800, 950, 875, 750, 700) },
    { name: "Green Peppers", category: "Vegetables", subcategory: null, brand: null, size: "500g", unit: "pack", prices: pr(2500, 2800, 2650, 2400, 2300) },
    { name: "Chillies", category: "Vegetables", subcategory: null, brand: null, size: "100g", unit: "pack", prices: pr(600, 750, 675, 550, 500) },
    { name: "Lettuce", category: "Vegetables", subcategory: null, brand: null, size: "1 head", unit: "piece", prices: pr(1000, 1200, 1100, 950, 900) },
    { name: "Cucumber", category: "Vegetables", subcategory: null, brand: null, size: "1kg", unit: "kg", prices: pr(1500, 1800, 1650, 1400, 1300) },
    { name: "Green Peas", category: "Vegetables", subcategory: null, brand: null, size: "500g", unit: "pack", prices: pr(2000, 2300, 2150, 1900, 1850) },
    // ── Beverages (more) ──
    { name: "Fanta Orange", category: "Beverages", subcategory: null, brand: "Coca-Cola", size: "2L", unit: "bottle", prices: pr(1750, 1850, 1800, 1700, 1650) },
    { name: "Sprite", category: "Beverages", subcategory: null, brand: "Coca-Cola", size: "1.5L", unit: "bottle", prices: pr(1500, 1600, 1550, 1450, 1400) },
    { name: "Apple Juice", category: "Beverages", subcategory: null, brand: "Ceres", size: "1L", unit: "carton", prices: pr(2800, 3100, 2950, 2650, 2550) },
    { name: "UHT Milk", category: "Beverages", subcategory: null, brand: "Milkdale", size: "1L", unit: "carton", prices: pr(2200, 2450, 2325, 2100, 2050) },
    { name: "Bottled Water", category: "Beverages", subcategory: null, brand: "Sparkletts", size: "1.5L", unit: "bottle", prices: pr(650, 750, 700, 600, 550) },
    { name: "Energy Drink", category: "Beverages", subcategory: null, brand: "Power Horse", size: "250ml", unit: "can", prices: pr(1200, 1350, 1275, 1150, 1100) },
    { name: "Rooibos Tea", category: "Beverages", subcategory: null, brand: "Five Roses", size: "100g", unit: "box", prices: pr(3200, 3500, 3350, 3000, 2900) },
    { name: "Hot Chocolate", category: "Beverages", subcategory: null, brand: "Cadbury", size: "400g", unit: "tin", prices: pr(4800, 5100, 4950, 4600, 4500) },
    // ── Household (more) ──
    { name: "Toilet Paper", category: "Household", subcategory: null, brand: "Nice N Soft", size: "9 rolls", unit: "pack", prices: pr(4200, 4500, 4350, 4000, 3900) },
    { name: "Kitchen Towels", category: "Household", subcategory: null, brand: "Handy Andy", size: "2 rolls", unit: "pack", prices: pr(2800, 3100, 2950, 2650, 2550) },
    { name: "Sponges", category: "Household", subcategory: null, brand: "Scotch-Brite", size: "3 pack", unit: "pack", prices: pr(1200, 1400, 1300, 1100, 1050) },
    { name: "Garbage Bags", category: "Household", subcategory: null, brand: "Glad", size: "50 pack", unit: "roll", prices: pr(3500, 3800, 3650, 3300, 3200) },
    { name: "Air Freshener", category: "Household", subcategory: null, brand: "Glade", size: "360ml", unit: "spray", prices: pr(2200, 2500, 2350, 2100, 2000) },
    { name: "Fabric Softener", category: "Household", subcategory: null, brand: "Comfort", size: "2L", unit: "bottle", prices: pr(4500, 4800, 4650, 4300, 4200) },
    { name: "Floor Cleaner", category: "Household", subcategory: null, brand: "Handy Andy", size: "2L", unit: "bottle", prices: pr(3200, 3500, 3350, 3000, 2900) },
    { name: "All-Purpose Cleaner", category: "Household", subcategory: null, brand: "Jeyes", size: "750ml", unit: "bottle", prices: pr(1850, 2100, 1975, 1750, 1700) },
    // ── Toiletries (more) ──
    { name: "Shampoo", category: "Toiletries", subcategory: null, brand: "Head & Shoulders", size: "400ml", unit: "bottle", prices: pr(4500, 4800, 4650, 4300, 4200) },
    { name: "Conditioner", category: "Toiletries", subcategory: null, brand: "Dove", size: "400ml", unit: "bottle", prices: pr(4200, 4500, 4350, 4000, 3900) },
    { name: "Deodorant Spray", category: "Toiletries", subcategory: null, brand: "Shield", size: "150ml", unit: "can", prices: pr(2800, 3100, 2950, 2650, 2550) },
    { name: "Hand Soap", category: "Toiletries", subcategory: null, brand: "Lifebuoy", size: "250ml", unit: "bottle", prices: pr(1500, 1700, 1600, 1400, 1350) },
    { name: "Moisturiser", category: "Toiletries", subcategory: null, brand: "Nivea", size: "200ml", unit: "tub", prices: pr(5200, 5500, 5350, 5000, 4900) },
    { name: "Razor Blades", category: "Toiletries", subcategory: null, brand: "Gillette", size: "4 pack", unit: "pack", prices: pr(4500, 4800, 4650, 4300, 4200) },
    { name: "Cotton Wool", category: "Toiletries", subcategory: null, brand: "Johnson's", size: "100 balls", unit: "pack", prices: pr(1200, 1400, 1300, 1100, 1050) },
    { name: "Lip Balm", category: "Toiletries", subcategory: null, brand: "Vaseline", size: "10ml", unit: "tube", prices: pr(850, 950, 900, 800, 750) },
  ];

  for (const pd of productData) {
    const product = await prisma.product.create({
      data: {
        name: pd.name,
        category: pd.category,
        subcategory: pd.subcategory,
        brand: pd.brand,
        size: pd.size,
        unit: pd.unit,
        imageUrl: img(pd),
        description: `${pd.brand ? pd.brand + " " : ""}${pd.name} — ${pd.size}`,
      },
    });

    for (const p of pd.prices) {
      await prisma.storePrice.create({
        data: {
          productId: product.id,
          storeId: p.store.id,
          price: p.price,
          inStock: true,
        },
      });
    }
  }

  /* ── Demo User ──────────────────────────────────────────── */
  const hashedPassword = await bcrypt.hash("password123", 12);
  const user = await prisma.user.create({
    data: {
      name: "Demo User",
      email: "demo@budgetbasket.mw",
      password: hashedPassword,
      role: "USER",
    },
  });
  await prisma.cart.create({ data: { userId: user.id } });

  /* ── Admin User ─────────────────────────────────────────── */
  const adminPassword = await bcrypt.hash("admin123", 12);
  const admin = await prisma.user.create({
    data: {
      name: "Admin",
      email: "admin@budgetbasket.mw",
      password: adminPassword,
      role: "ADMIN",
    },
  });
  await prisma.cart.create({ data: { userId: admin.id } });

  console.log("Seed complete - 82 products, 5 stores, 2 users");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
