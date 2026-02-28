const { createClient } = require('redis');

let redisClient = null;

const connectRedis = async () => {
  try {
    const options = process.env.REDIS_URL
      ? { url: process.env.REDIS_URL }
      : {
          socket: {
            host: process.env.REDIS_HOST || '127.0.0.1',
            port: parseInt(process.env.REDIS_PORT) || 6379,
          },
          password: process.env.REDIS_PASSWORD || undefined,
        };

    redisClient = createClient(options);

    redisClient.on('error', (err) => {
      console.warn('⚠️  Redis error (non-fatal):', err.message);
    });

    redisClient.on('connect', () => {
      console.log('✅ Redis Connected');
    });

    await redisClient.connect();
    return redisClient;
  } catch (error) {
    console.warn('⚠️  Redis not available - running without cache:', error.message);
    redisClient = null;
  }
};

const getRedis = () => redisClient;

// Cache helpers with graceful fallback
const cacheGet = async (key) => {
  if (!redisClient) return null;
  try {
    const val = await redisClient.get(key);
    return val ? JSON.parse(val) : null;
  } catch { return null; }
};

const cacheSet = async (key, value, ttlSeconds = 300) => {
  if (!redisClient) return;
  try {
    await redisClient.setEx(key, ttlSeconds, JSON.stringify(value));
  } catch { /* silent fail */ }
};

const cacheDel = async (key) => {
  if (!redisClient) return;
  try {
    await redisClient.del(key);
  } catch { /* silent fail */ }
};

const cacheDelPattern = async (pattern) => {
  if (!redisClient) return;
  try {
    const keys = await redisClient.keys(pattern);
    if (keys.length > 0) await redisClient.del(keys);
  } catch { /* silent fail */ }
};

module.exports = { connectRedis, getRedis, cacheGet, cacheSet, cacheDel, cacheDelPattern };
