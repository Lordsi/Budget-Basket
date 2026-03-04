# Deploying BudgetBasket to Hostinger

Your live site fails because **only the static HTML/CSS/JS was uploaded**. The **Node.js backend** (which serves products, auth, cart) must also run. Hostinger needs the full project deployed as a **Node.js Web App**.

## Prerequisites

- **Business** or **Cloud** Hostinger plan (Node.js is not on basic shared hosting)
- [Hostinger Node.js guide](https://www.hostinger.com/support/how-to-deploy-a-nodejs-website-in-hostinger/)

---

## Step 1: Switch to MySQL for Production

Local dev uses SQLite. Hostinger uses MySQL.

1. In `backend/prisma/schema.prisma`, change: `provider = "sqlite"` → `provider = "mysql"`
2. Ensure a MySQL migration exists in `prisma/migrations` (create one with `npx prisma migrate dev --name init_mysql` if needed, with MySQL as provider).

---

## Step 2: MySQL Credentials

From Hostinger hPanel → Databases:

| Field | Value |
|-------|-------|
| Database | `u952556677_budget_basket` |
| Username | `u952556677_aether_studio` |
| Password | `;v>^#pN^rF8` |
| Host | From hPanel (often `localhost` when app + DB on same server) |

URL-encoded password: `%3Bv%3E%5E%23pN%5ErF8`

---

## Step 3: Deploy as Node.js App in hPanel

1. **Websites** → **Add Website** → **Node.js Apps**
2. Choose **Upload your website files** or **Import Git Repository**
3. Upload a **zip of the full project** (root with `backend`, `css`, `js`, `index.html`, etc.)
4. **Build settings:**
   - **Root directory:** `.`
   - **Build command:** `cd backend && npm install && npx prisma generate && npx prisma migrate deploy && npm run db:seed`
   - **Start command:** `cd backend && npm start`
   - **Node version:** 18.x or 20.x
5. **Environment variables** (add in hPanel):
   ```
   DATABASE_URL=mysql://u952556677_aether_studio:%3Bv%3E%5E%23pN%5ErF8@YOUR_MYSQL_HOST:3306/u952556677_budget_basket
   JWT_SECRET=your-random-secret-here
   JWT_REFRESH_SECRET=another-random-secret
   PORT=5000
   NODE_ENV=production
   ```
   Replace `YOUR_MYSQL_HOST` with the MySQL host from hPanel.
6. **Deploy**

---

## Step 4: After Deploy

- The app serves both the site and the API from the same domain.
- If products still fail, check the Node.js app logs in hPanel.
- Ensure CORS allows your domain: set `FRONTEND_URL` in env to your live URL if needed.

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| "Products could not be loaded" | Backend not running. Deploy the full project as a Node.js app, not just static files. |
| Plan doesn't support Node.js | Upgrade to Business or Cloud hosting. |
| DB connection error | Verify `DATABASE_URL` and MySQL host in hPanel. |
| CORS errors | Set `FRONTEND_URL` in env to your live domain. |
