require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const connectDB = require('./config/database');
const { connectRedis } = require('./config/redis');
const { errorHandler, notFound } = require('./middleware/error');

// Routes
const authRoutes = require('./routes/auth');
const listingRoutes = require('./routes/listings');
const escrowRoutes = require('./routes/escrow');
const taskRoutes = require('./routes/tasks');
const rentalRoutes = require('./routes/rentals');
const notificationRoutes = require('./routes/notifications');
const algorandRoutes = require('./routes/algorand');
const adminRoutes = require('./routes/admin');

const app = express();

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(helmet());
app.use(
  cors({
    origin: (origin, cb) => {
      const allowed = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000').split(',');
      if (!origin || allowed.includes(origin)) return cb(null, true);
      cb(new Error('Not allowed by CORS'));
    },
    credentials: true,
  })
);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  message: { success: false, message: 'Too many requests, please try again later' },
});
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, message: 'Too many auth attempts' },
});

app.use('/api/', limiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// ─── Routes ──────────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: '🚀 HENTAI API - Hybrid Escrow-Based Network for Trustless Algorand Infrastructure',
    version: '1.0.0',
    docs: '/api/health',
  });
});

app.get('/api/health', async (req, res) => {
  const { getAlgorandHealth } = require('./config/algorand');
  const { getRedis } = require('./config/redis');
  const mongoose = require('mongoose');

  const algoHealth = await getAlgorandHealth();
  const redis = getRedis();

  res.json({
    success: true,
    status: 'OK',
    timestamp: new Date().toISOString(),
    services: {
      mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
      redis: redis ? 'connected' : 'not available',
      algorand: algoHealth.healthy ? `connected (round ${algoHealth.lastRound})` : 'unavailable',
    },
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/listings', listingRoutes);
app.use('/api/escrow', escrowRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/rentals', rentalRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/algorand', algorandRoutes);
app.use('/api/admin', adminRoutes);

// ─── Error Handling ──────────────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

// ─── Start ───────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await connectDB();
  await connectRedis(); // graceful — won't crash if Redis is unavailable

  app.listen(PORT, () => {
    console.log(`\n🚀 HENTAI Backend running on port ${PORT}`);
    console.log(`📍 Environment: ${process.env.NODE_ENV}`);
    console.log(`🌐 Health check: http://localhost:${PORT}/api/health`);
    console.log(`\n📚 API Routes:`);
    console.log(`   POST   /api/auth/register`);
    console.log(`   POST   /api/auth/login`);
    console.log(`   GET    /api/listings`);
    console.log(`   POST   /api/listings`);
    console.log(`   POST   /api/escrow/create`);
    console.log(`   GET    /api/tasks`);
    console.log(`   POST   /api/tasks`);
    console.log(`   POST   /api/rentals/request`);
    console.log(`   GET    /api/algorand/health`);
    console.log(`   GET    /api/admin/dashboard`);
  });
};

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

module.exports = app;
