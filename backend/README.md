# PC Master DZ — Backend API

Backend REST API for an Algerian PC components e-commerce store. Built with **Node.js**, **Express**, **MongoDB Atlas**, **Mongoose**, **JWT**, and **Cloudinary**.

## Features

- User registration / login with JWT authentication
- Product catalog with search, filtering, sorting, and pagination
- Image upload to Cloudinary (up to 5 images per product)
- Order creation with server-side price recalculation (never trusts client prices)
- Algerian shipping rules (400 DA for wilayas 1–48, 800 DA otherwise, free above 150 000 DA)
- Admin dashboard: product CRUD, order management, sales statistics
- Soft-delete for products (isActive flag)

## Prerequisites

- Node.js ≥ 18
- A [MongoDB Atlas](https://www.mongodb.com/atlas) cluster
- A [Cloudinary](https://cloudinary.com) account

## Installation

```bash
cd backend
npm install
```

## Environment Variables

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

| Variable | Description |
|---|---|
| `PORT` | Server port (default 5000) |
| `MONGODB_URI` | MongoDB Atlas connection string |
| `JWT_SECRET` | Secret key for signing JWTs |
| `JWT_EXPIRES_IN` | Token lifetime (e.g. `7d`) |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret |
| `CLIENT_URL` | Frontend origin for CORS |
| `NODE_ENV` | `development` or `production` |

## Run Locally

```bash
# development (auto-restart with nodemon)
npm run dev

# production
npm start
```

Server starts at `http://localhost:5000`.

## Health Check

```bash
curl http://localhost:5000/api/health
# → {"success":true,"data":{"status":"ok"}}
```

## API Endpoints

All responses follow the shape: `{ success: boolean, data?: any, message?: string }`

### Auth

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | — | Create account |
| POST | `/api/auth/login` | — | Login |
| GET | `/api/auth/me` | Bearer | Current user |
| PUT | `/api/auth/profile` | Bearer | Update profile |

**Register**
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"أمين","email":"amine@store.dz","password":"secret123"}'
```

**Login**
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"amine@store.dz","password":"secret123"}'
```

### Products (public)

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/products` | List products |
| GET | `/api/products/categories` | Categories with counts |
| GET | `/api/products/:id` | Product by id or slug |

**Query params for GET /api/products:** `category`, `brand`, `minPrice`, `maxPrice`, `search`, `sort` (`price_asc` \| `price_desc` \| `newest`), `page`, `limit`

```bash
curl "http://localhost:5000/api/products?category=GPU&sort=price_asc&page=1&limit=12"
```

### Orders (authenticated)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/orders` | Bearer | Create order |
| GET | `/api/orders/my` | Bearer | My orders |
| GET | `/api/orders/:id` | Bearer | Order detail (owner or admin) |

**Create order** (prices are recalculated server-side):
```bash
curl -X POST http://localhost:5000/api/orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{
    "items": [{"product":"<PRODUCT_ID>","quantity":1}],
    "shippingAddress": {
      "fullName":"أمين ب.",
      "phone":"0550123456",
      "wilaya":"16 — الجزائر",
      "address":"حي الرمال، باب الزوار"
    },
    "paymentMethod":"cod"
  }'
```

### Admin (Bearer + admin role)

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/admin/products` | Create product (multipart, field `images`) |
| PUT | `/api/admin/products/:id` | Update product (optional new images) |
| DELETE | `/api/admin/products/:id` | Soft-delete product |
| GET | `/api/admin/orders` | All orders (`status`, `fromDate`, `toDate`, `page`, `limit`) |
| PUT | `/api/admin/orders/:id/status` | Update order status |
| GET | `/api/admin/stats` | Total sales, order counts, top products |

**Create an admin user** (one-time, via MongoDB shell or Compass):
```js
db.users.updateOne(
  { email: "admin@store.dz" },
  { $set: { role: "admin" } }
)
```

## Deploy to Render

1. Push the `backend/` folder to a GitHub repository.
2. On [Render](https://render.com): **New → Web Service**.
3. Connect the repo; set **Root Directory** to `backend` (if the repo contains the frontend too).
4. Build command: `npm install`
5. Start command: `npm start`
6. Add all environment variables from `.env` in the Render dashboard (set `NODE_ENV=production`, `CLIENT_URL` to your frontend URL).
7. Deploy. Health check URL: `https://<your-app>.onrender.com/api/health`

## Project Structure

```
backend/
├── config/          # DB + Cloudinary connections
├── controllers/     # Route handlers (auth, product, order)
├── middleware/      # JWT auth, image upload, error handler
├── models/          # Mongoose schemas (User, Product, Order)
├── routes/          # Express routers (auth, product, order, admin)
├── utils/           # JWT token generator
├── .env.example     # Environment variable template
├── package.json
└── server.js        # Entry point
```
