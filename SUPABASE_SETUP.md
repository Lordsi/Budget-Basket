# BudgetBasket – Supabase Setup Guide

Step-by-step guide to set up your BudgetBasket database on Supabase.

---

## Step 1: Open your Supabase project

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard)
2. Log in and select your project **Budget-Basket** (or the project at `bjpdkxjtnpfwtofqgpfj`)
3. If the project is paused, click **Restore project** and wait for it to start

---

## Step 2: Create tables using SQL Editor

1. In the left sidebar, click **SQL Editor**
2. Click **New query**
3. Copy and paste the SQL below into the editor
4. Click **Run** (or press Ctrl+Enter)

```sql
-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "stores" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "delivery_available" BOOLEAN NOT NULL DEFAULT false,
    "delivery_cost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "image_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stores_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "subcategory" TEXT,
    "brand" TEXT,
    "size" TEXT,
    "unit" TEXT,
    "image_url" TEXT,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "store_prices" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "store_id" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "in_stock" BOOLEAN NOT NULL DEFAULT true,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "store_prices_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "carts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "carts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "cart_items" (
    "id" TEXT NOT NULL,
    "cart_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "preferred_store_id" TEXT,

    CONSTRAINT "cart_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "saved_lists" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "saved_lists_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "saved_list_items" (
    "id" TEXT NOT NULL,
    "saved_list_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "saved_list_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "product_watch" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_watch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX "stores_name_key" ON "stores"("name");
CREATE INDEX "products_category_idx" ON "products"("category");
CREATE INDEX "products_name_idx" ON "products"("name");
CREATE INDEX "store_prices_product_id_idx" ON "store_prices"("product_id");
CREATE INDEX "store_prices_store_id_idx" ON "store_prices"("store_id");
CREATE UNIQUE INDEX "store_prices_product_id_store_id_key" ON "store_prices"("product_id", "store_id");
CREATE UNIQUE INDEX "carts_user_id_key" ON "carts"("user_id");
CREATE UNIQUE INDEX "cart_items_cart_id_product_id_key" ON "cart_items"("cart_id", "product_id");
CREATE UNIQUE INDEX "saved_list_items_saved_list_id_product_id_key" ON "saved_list_items"("saved_list_id", "product_id");
CREATE UNIQUE INDEX "product_watch_user_id_product_id_key" ON "product_watch"("user_id", "product_id");

-- AddForeignKey
ALTER TABLE "store_prices" ADD CONSTRAINT "store_prices_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "store_prices" ADD CONSTRAINT "store_prices_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "carts" ADD CONSTRAINT "carts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_cart_id_fkey" FOREIGN KEY ("cart_id") REFERENCES "carts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "saved_lists" ADD CONSTRAINT "saved_lists_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "saved_list_items" ADD CONSTRAINT "saved_list_items_saved_list_id_fkey" FOREIGN KEY ("saved_list_id") REFERENCES "saved_lists"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "saved_list_items" ADD CONSTRAINT "saved_list_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "product_watch" ADD CONSTRAINT "product_watch_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "product_watch" ADD CONSTRAINT "product_watch_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
```

5. You should see **Success. No rows returned**. If you get "relation already exists", the tables were created before – that’s fine.

---

## Step 3: Register Prisma migration (so it won’t recreate tables)

If you used the SQL Editor instead of `prisma migrate deploy`, register the migration so Prisma treats it as applied:

1. In SQL Editor, run a **new query** and paste:

```sql
CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
    "id" VARCHAR(36) PRIMARY KEY,
    "checksum" VARCHAR(64) NOT NULL,
    "finished_at" TIMESTAMPTZ,
    "migration_name" VARCHAR(255) NOT NULL,
    "logs" TEXT,
    "rolled_back_at" TIMESTAMPTZ,
    "started_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "applied_steps_count" INTEGER NOT NULL DEFAULT 0
);

INSERT INTO "_prisma_migrations" ("id", "checksum", "finished_at", "migration_name", "applied_steps_count")
VALUES (
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    'manual-setup',
    now(),
    '20260304000000_init_postgres',
    1
) ON CONFLICT ("id") DO NOTHING;
```

2. Click **Run**

---

## Step 4: Confirm in Table Editor

1. Click **Table Editor** in the left sidebar  
2. You should see: `users`, `stores`, `products`, `store_prices`, `carts`, `cart_items`, `saved_lists`, `saved_list_items`, `product_watch`  
3. Tables are empty; you can load sample data in the next step

---

## Step 5: Seed sample data (optional)

From your project folder, in a terminal:

```bash
cd backend
npm run db:seed
```

This adds demo stores, products, prices, and users.

**Demo logins:**

| Role  | Email                 | Password   |
| ----- | --------------------- | ---------- |
| User  | demo@budgetbasket.mw  | password123 |
| Admin | admin@budgetbasket.mw | admin123   |

---

## Step 6: Check backend `.env`

Confirm `backend/.env` has:

```
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@db.bjpdkxjtnpfwtofqgpfj.supabase.co:5432/postgres?sslmode=require"
```

Replace `YOUR_PASSWORD` with the database password from **Settings → Database** in the Supabase dashboard.

---

## Step 7: Run the backend

```bash
cd backend
npm run dev
```

Open **http://localhost:5000** and verify the app works with Supabase.

---

## Alternative: Prisma migration from your machine

If your network allows outbound connections to Supabase:

```bash
cd backend
npx prisma migrate deploy
npm run db:seed
```

This creates the tables and seeds data without running the SQL manually. Skip Steps 2–4 if you use this approach.
