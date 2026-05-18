import Redis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL!;

// Use global caching pattern to survive Next.js HMR in development
let redis: Redis;

if (process.env.NODE_ENV === 'development') {
  const globalWithRedis = global as typeof globalThis & {
    _redis?: Redis;
  };

  if (!globalWithRedis._redis && REDIS_URL) {
    globalWithRedis._redis = new Redis(REDIS_URL, {
      retryStrategy: (times) => Math.min(times * 50, 2000),
      maxRetriesPerRequest: 3,
    });

    globalWithRedis._redis.on('error', (err) => {
      console.error('Redis connection error:', err.message);
    });

    globalWithRedis._redis.on('ready', () => {
      console.log('Successfully connected to Redis');
    });
  }

  redis = globalWithRedis._redis!;
} else {
  redis = new Redis(REDIS_URL, {
    retryStrategy: (times) => Math.min(times * 50, 2000),
    maxRetriesPerRequest: 3,
  });

  redis.on('error', (err) => {
    console.error('Redis connection error:', err.message);
  });

  redis.on('ready', () => {
    console.log('Successfully connected to Redis');
  });
}

export function getRedis() {
  return redis;
}

export async function cacheResponse(key: string, value: any, ttl = 3600) {
  const client = getRedis();
  if (!client) return;
  
  await client.set(key, JSON.stringify(value), 'EX', ttl);
}

export async function getCachedResponse(key: string) {
  const client = getRedis();
  if (!client) return null;
  
  const data = await client.get(key);
  return data ? JSON.parse(data) : null;
}

export async function invalidateCache(key: string) {
  const client = getRedis();
  if (!client) return;
  await client.del(key);
}
