# BudgetBasket

A price-comparison and budgeting platform that helps users compare grocery prices across multiple stores, build optimized shopping baskets, and save money.

## Tech Stack

| Layer    | Technology                                     |
| -------- | ---------------------------------------------- |
| Frontend | Next.js 16 (App Router) or plain HTML/CSS/JS   |
| Backend  | Node.js, Express, Prisma ORM, PostgreSQL       |
| Auth     | JWT (HTTP-only cookies), bcrypt                 |

## Project Structure

```
Shopping Basket/
├── backend/           # Express API server
│   ├── prisma/        # Schema & seed data
│   └── src/
│       ├── middleware/ # Auth middleware
│       ├── routes/    # API route handlers
│       └── utils/     # Prisma client, JWT helpers
├── frontend/          # Next.js application
│   └── src/
│       ├── app/       # Pages (App Router)
│       ├── components/# UI & layout components
│       ├── lib/       # API client, types, utils
│       └── store/     # Zustand state management
├── html/              # Standalone HTML/CSS/JS app (no build)
│   ├── css/
│   ├── js/
│   ├── auth/
│   └── *.html
└── README.md
```

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL running locally (or a connection URL)

### 1. Backend Setup

```bash
cd backend
npm install

# Copy .env.example to .env and configure DATABASE_URL
cp .env.example .env

# For Supabase: Get your database password from Supabase Dashboard > Settings > Database
# Then set: DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.bjpdkxjtnpfwtofqgpfj.supabase.co:5432/postgres"

# Run database migrations
npx prisma migrate deploy

# Seed the database with sample data (optional)
npm run db:seed

# Start the dev server
npm run dev
```

The API runs on `http://localhost:5000`.

### 2a. HTML Frontend (simplest)

The backend serves the HTML app directly. Once the backend is running, open:

**http://localhost:5000**

No separate frontend server or build step required. Uses placeholder SVG icons (no emojis).

### 2b. Next.js Frontend

```bash
cd frontend
npm install
npm run dev
```

The app runs on `http://localhost:3000`. Set `FRONTEND_URL=http://localhost:3000` in the backend `.env` if using CORS.

### Demo Credentials

| Role  | Email                    | Password    |
| ----- | ------------------------ | ----------- |
| User  | demo@budgetbasket.mw     | password123 |
| Admin | admin@budgetbasket.mw    | admin123    |

## Core Features

- **Product Index** — Browse by category (Food, Cooking Oil, Spices, Vegetables, Beverages, Household, Toiletries)
- **Price Comparison Engine** — See store-by-store pricing with cheapest highlighted
- **Smart Cart** — Optimized total using cheapest-per-item strategy, with savings displayed
- **Checkout** — Delivery toggle, cost summary, payment preparation
- **User Dashboard** — Saved lists, savings stats
- **Behavioral Nudges** — Loss aversion prompts, savings counters, smart identity framing

## API Endpoints

| Method | Endpoint               | Description                        |
| ------ | ---------------------- | ---------------------------------- |
| POST   | /api/auth/register     | Create account                     |
| POST   | /api/auth/login        | Log in                             |
| POST   | /api/auth/refresh      | Refresh access token               |
| POST   | /api/auth/logout       | Log out                            |
| GET    | /api/auth/me           | Current user (protected)           |
| GET    | /api/products          | List products (paginated, filterable) |
| GET    | /api/products/categories | List categories                  |
| GET    | /api/products/:id      | Product detail                     |
| GET    | /api/stores            | List stores                        |
| GET    | /api/compare/:productId | Price comparison for one product  |
| POST   | /api/compare/basket    | Basket optimization                |
| GET    | /api/cart              | User's cart (protected)            |
| POST   | /api/cart/items        | Add to cart                        |
| PATCH  | /api/cart/items/:id    | Update quantity                    |
| DELETE | /api/cart/items/:id    | Remove item                        |
| DELETE | /api/cart              | Clear cart                         |
| GET    | /api/saved-lists       | User's saved lists (protected)     |
| POST   | /api/saved-lists       | Save current cart as list          |
| DELETE | /api/saved-lists/:id   | Delete saved list                  |
