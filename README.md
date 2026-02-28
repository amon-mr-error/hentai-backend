# 🔐 HENTAI Backend
## Hybrid Escrow-Based Network for Trustless Algorand Infrastructure

A complete Node.js/Express/MongoDB backend for the campus P2P marketplace with blockchain-backed escrow.

---

## 📁 Project Structure

```
hentai-backend/
├── src/
│   ├── config/
│   │   ├── database.js      # MongoDB connection
│   │   ├── redis.js         # Redis connection + cache helpers
│   │   └── algorand.js      # Algorand SDK clients
│   ├── models/
│   │   ├── User.js          # User + reputation
│   │   ├── Listing.js       # Marketplace listings
│   │   ├── Escrow.js        # Escrow state machine
│   │   ├── Task.js          # e-Rand micro-tasks
│   │   ├── Rental.js        # P2P rentals
│   │   └── Notification.js  # In-app notifications
│   ├── controllers/         # Route handlers
│   ├── routes/              # Express routers
│   ├── middleware/
│   │   ├── auth.js          # JWT protect + adminOnly
│   │   ├── error.js         # Global error handler
│   │   └── validate.js      # express-validator helper
│   ├── services/
│   │   ├── escrowService.js     # Core escrow business logic
│   │   ├── notificationService.js
│   │   └── tokenService.js
│   └── utils/
│       └── seed.js          # Test data seeder
├── .env                     # Environment variables
├── .env.example
└── package.json
```

---

## ⚡ Quick Setup

### 1. Install Dependencies

```bash
cd hentai-backend
npm install
```

### 2. Configure Environment

Edit `.env` and fill in your values:

```env
# ⚠️ REQUIRED: Replace with your real MongoDB password
MONGODB_URI=mongodb+srv://keskarna12:YOUR_REAL_PASSWORD@cluster0.kkalafx.mongodb.net/hentai?appName=Cluster0

JWT_SECRET=hentai_super_secret_jwt_key_change_in_production_2024
PORT=5000
NODE_ENV=development
```

### 3. Install & Start Redis

#### Windows (WSL or Docker recommended):
```bash
# Option A — Docker (easiest on Windows)
docker run -d -p 6379:6379 --name redis redis:alpine

# Option B — WSL Ubuntu
sudo apt update && sudo apt install redis-server -y
sudo service redis-server start

# Option C — Redis for Windows (Memurai)
# Download from: https://www.memurai.com/
```

#### macOS:
```bash
brew install redis
brew services start redis
```

#### Ubuntu/Linux:
```bash
sudo apt update && sudo apt install redis-server -y
sudo systemctl start redis-server
sudo systemctl enable redis-server
# Verify
redis-cli ping  # Should return PONG
```

> **Note:** Redis is optional. The backend runs fine without it (caching is disabled gracefully).

### 4. Seed Test Data

```bash
npm run seed
```

### 5. Start the Server

```bash
# Development (auto-restart)
npm run dev

# Production
npm start
```

---

## 🌐 API Endpoints

### Auth
| Method | Route | Description | Auth |
|--------|-------|-------------|------|
| POST | `/api/auth/register` | Register new user | ❌ |
| POST | `/api/auth/login` | Login | ❌ |
| GET | `/api/auth/me` | Get current user | ✅ |
| PUT | `/api/auth/update-profile` | Update profile | ✅ |
| PUT | `/api/auth/change-password` | Change password | ✅ |
| GET | `/api/auth/user/:id` | Public user profile | ❌ |

### Marketplace Listings
| Method | Route | Description | Auth |
|--------|-------|-------------|------|
| GET | `/api/listings` | Browse listings | ❌ |
| GET | `/api/listings/stats` | Platform stats | ❌ |
| GET | `/api/listings/my` | My listings | ✅ |
| GET | `/api/listings/:id` | Single listing | ❌ |
| POST | `/api/listings` | Create listing | ✅ |
| PUT | `/api/listings/:id` | Update listing | ✅ |
| DELETE | `/api/listings/:id` | Delete listing | ✅ |
| POST | `/api/listings/:id/save` | Save/unsave | ✅ |

### Escrow (State Machine)
| Method | Route | Description | Auth |
|--------|-------|-------------|------|
| POST | `/api/escrow/create` | Create escrow | ✅ |
| POST | `/api/escrow/:id/lock` | Lock funds | ✅ (buyer) |
| POST | `/api/escrow/:id/ship` | Mark shipped | ✅ (seller) |
| POST | `/api/escrow/:id/confirm-delivery` | Release funds | ✅ (buyer) |
| POST | `/api/escrow/:id/dispute` | Raise dispute | ✅ |
| POST | `/api/escrow/:id/resolve` | Resolve dispute | 🔐 Admin |
| POST | `/api/escrow/:id/cancel` | Cancel | ✅ |
| POST | `/api/escrow/:id/rate` | Rate transaction | ✅ |
| GET | `/api/escrow/my` | My escrows | ✅ |
| GET | `/api/escrow/stats` | Escrow stats | 🔐 Admin |

**Escrow State Flow:**
```
PENDING → LOCKED → IN_TRANSIT → DELIVERED
                              → DISPUTED → RESOLVED
              → CANCELLED
              → TIMEOUT_REFUND (auto)
```

### e-Rand Tasks
| Method | Route | Description | Auth |
|--------|-------|-------------|------|
| GET | `/api/tasks` | Browse tasks | ❌ |
| GET | `/api/tasks/my` | My tasks | ✅ |
| GET | `/api/tasks/:id` | Single task | ❌ |
| POST | `/api/tasks` | Post task | ✅ |
| POST | `/api/tasks/:id/apply` | Apply as runner | ✅ |
| POST | `/api/tasks/:id/accept/:runnerId` | Accept runner | ✅ (poster) |
| POST | `/api/tasks/:id/start` | Start task | ✅ (runner) |
| POST | `/api/tasks/:id/complete` | Mark complete | ✅ (poster) |
| POST | `/api/tasks/:id/cancel` | Cancel task | ✅ |
| POST | `/api/tasks/:id/rate` | Rate | ✅ |

### Rentals
| Method | Route | Description | Auth |
|--------|-------|-------------|------|
| GET | `/api/rentals/my` | My rentals | ✅ |
| GET | `/api/rentals/:id` | Single rental | ✅ |
| POST | `/api/rentals/request` | Request rental | ✅ |
| POST | `/api/rentals/:id/approve` | Approve rental | ✅ (owner) |
| POST | `/api/rentals/:id/return` | Confirm return | ✅ (owner) |

### Algorand
| Method | Route | Description | Auth |
|--------|-------|-------------|------|
| GET | `/api/algorand/health` | Network health | ❌ |
| GET | `/api/algorand/params` | TX params | ❌ |
| GET | `/api/algorand/account/:address` | Account info | ✅ |
| GET | `/api/algorand/tx/:txId` | Transaction info | ✅ |
| POST | `/api/algorand/create-wallet` | Generate wallet | ✅ |
| POST | `/api/algorand/verify-tx` | Verify tx on-chain | ✅ |

### Admin
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/admin/dashboard` | Dashboard stats |
| GET | `/api/admin/users` | All users |
| GET | `/api/admin/disputes` | Active disputes |
| GET | `/api/admin/analytics` | Analytics data |
| PUT | `/api/admin/users/:id/verify` | Verify user |
| PUT | `/api/admin/users/:id/toggle-status` | Activate/deactivate |
| POST | `/api/admin/process-timeouts` | Run auto-refunds |

### Notifications
| Method | Route | Description | Auth |
|--------|-------|-------------|------|
| GET | `/api/notifications` | My notifications | ✅ |
| PUT | `/api/notifications/read-all` | Mark all read | ✅ |
| PUT | `/api/notifications/:id/read` | Mark one read | ✅ |
| DELETE | `/api/notifications/:id` | Delete one | ✅ |

---

## 🧪 Example API Calls

### Register
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@campus.in","password":"test1234","campus":"IIT Delhi"}'
```

### Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"rahul@iitdelhi.ac.in","password":"password123"}'
```

### Get Listings
```bash
curl "http://localhost:5000/api/listings?category=Electronics&type=sell"
```

### Create Escrow (buy item)
```bash
curl -X POST http://localhost:5000/api/escrow/create \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"listingId":"LISTING_ID_HERE"}'
```

### Get Algorand Health
```bash
curl http://localhost:5000/api/algorand/health
```

---

## 🔑 Test Credentials (after seeding)

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@iitdelhi.ac.in | admin123 |
| Student 1 | rahul@iitdelhi.ac.in | password123 |
| Student 2 | priya@iitdelhi.ac.in | password123 |
| Student 3 | arjun@iitdelhi.ac.in | password123 |

---

## 🏗 Tech Stack

- **Runtime:** Node.js 18+
- **Framework:** Express.js
- **Database:** MongoDB (Mongoose ODM)
- **Cache:** Redis (graceful fallback if unavailable)
- **Blockchain:** Algorand (TestNet via AlgoNode)
- **Auth:** JWT + bcryptjs
- **Validation:** express-validator
- **Security:** helmet, express-rate-limit, CORS

---

## ⚠️ Common Issues

**MongoDB connection fails:**
- Ensure your IP is whitelisted in MongoDB Atlas → Network Access → Add IP Address → `0.0.0.0/0`
- Double-check the password in MONGODB_URI

**Redis not connecting:**
- Backend works without Redis (cache is disabled gracefully)
- Check if Redis is running: `redis-cli ping`

**Port already in use:**
- Change `PORT=5000` in `.env` to another port like `5001`
