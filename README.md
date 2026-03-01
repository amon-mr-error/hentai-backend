# 🔐 HENTAI - Backend
### Hybrid Escrow-Based Network for Trustless Algorand Infrastructure

<div align="center">

![Version](https://img.shields.io/badge/version-1.0.0--MVP-blue?style=for-the-badge)
![Node](https://img.shields.io/badge/node.js-v18+-green?style=for-the-badge)
![Database](https://img.shields.io/badge/database-mongoDB-brightgreen?style=for-the-badge)
![Blockchain](https://img.shields.io/badge/blockchain-Algorand-black?style=for-the-badge)

**A high-performance Node.js/Express backend servicing a campus P2P marketplace with decentralized escrow and blockchain verification.**

[Overview](#-overview) • [Quick Setup](#-quick-setup) • [API Documentation](#-api-endpoints) • [The Team](#-the-team)

</div>

---

## 🌟 Overview

The **Hentai Backend** is the core engine powering the campus P2P marketplace. It manages a complex state machine for **escrow transactions**, integrates with the **Algorand blockchain** for trustless verification, and provides a robust **Task Management (e-Rand)** system.

> [!IMPORTANT]
> This backend is in its **MVP phase**. It features a hybrid architecture combining traditional NoSQL reliability (MongoDB) with modern decentralized verification (Algorand).

---

## 📁 Project Structure

```bash
src/
├── config/             # Database, Redis, and Algorand SDK configurations
├── models/             # Mongoose schemas (User, Listing, Escrow, Task, etc.)
├── controllers/        # Request handlers and business logic entry points
├── routes/             # Express route definitions
├── middleware/         # Auth (JWT), Validation, and Error handling
├── services/           # Core business logic (Escrow state, Notifications)
└── utils/              # Helper functions and seeder scripts
```

---

## ⚡ Quick Setup

### 1. Installation
```bash
# Navigate to backend directory
cd hentai-backend

# Install dependencies
npm install
```

### 2. Environment Configuration
Create a `.env` file in the root directory:
```env
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key
PORT=5000
NODE_ENV=development
```

### 3. Redis (Optional)
The backend supports Redis for caching, but it is not mandatory.
- **Docker**: `docker run -d -p 6379:6379 --name redis redis:alpine`
- **Linux**: `sudo apt install redis-server`

### 4. Database Seeding
```bash
# Populate the database with test data
npm run seed
```

### 5. Start the Server
```bash
# Development Mode
npm run dev

# Production Mode
npm start
```

---

## 🌐 API Endpoints

<details>
<summary><b>🔐 Authentication</b></summary>

| Method | Route | Description | Auth |
|:--- | :--- | :--- | :--- |
| POST | `/api/auth/register` | Register new user | ❌ |
| POST | `/api/auth/login` | Login | ❌ |
| GET | `/api/auth/me` | Current user info | ✅ |
| PUT | `/api/auth/update-profile` | Update profile | ✅ |

</details>

<details>
<summary><b>🛒 Marketplace & Escrow</b></summary>

| Method | Route | Description | Auth |
|:--- | :--- | :--- | :--- |
| GET | `/api/listings` | Browse listings | ❌ |
| POST | `/api/listings` | Create listing | ✅ |
| POST | `/api/escrow/create` | Initiate escrow | ✅ |
| POST | `/api/escrow/:id/lock` | Lock funds (Buyer) | ✅ |
| POST | `/api/escrow/:id/confirm-delivery`| Release funds | ✅ |

</details>

<details>
<summary><b>⛓️ Blockchain (Algorand)</b></summary>

| Method | Route | Description | Auth |
|:--- | :--- | :--- | :--- |
| GET | `/api/algorand/health` | Network status | ❌ |
| POST | `/api/algorand/create-wallet` | Generate wallet | ✅ |
| POST | `/api/algorand/verify-tx` | On-chain verification | ✅ |

</details>

---

## 👤 The Team

We are a dedicated team building trustless infrastructure for campus communities.

| Developer | Role | Profile |
| :--- | :--- | :--- |
| **Shubhra Ghosh** | Software Developer & Founder | [Lead Architect] |
| **Devaki Nandan Karna** | Backend Developer | [Infrastructure] |

---

## 🏗 Tech Stack

- **Runtime:** Node.js 18+
- **Framework:** Express.js
- **Database:** MongoDB (Mongoose)
- **Blockchain:** Algorand (TestNet)
- **Cache:** Redis (Graceful fallback)
- **Security:** JWT, Bcrypt, Helmet, CORS

---

## 📄 License

This project is proprietary and all rights are reserved.  
© 2026 Hentai Platform Team.

---

<div align="center">
  <sub>Engineered with ❤️ by the Hentai Team</sub>
</div>
