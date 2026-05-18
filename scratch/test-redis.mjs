import Redis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL;
console.log('REDIS_URL:', REDIS_URL?.replace(/:[^@]+@/, ':****@'));

if (!REDIS_URL) {
  console.error('REDIS_URL not found');
  process.exit(1);
}

// Test 1: Plain URL (ioredis auto-detects rediss://)
console.log('\n--- Test 1: Plain URL string ---');
const r1 = new Redis(REDIS_URL, {
  maxRetriesPerRequest: 1,
  connectTimeout: 5000,
  retryStrategy: () => null
});

r1.on('error', (err) => {
  console.error('Test 1 Error:', err.message);
  r1.disconnect();

  // Test 2: With explicit servername
  console.log('\n--- Test 2: With explicit TLS servername ---');
  const urlObj = new URL(REDIS_URL);
  const r2 = new Redis(REDIS_URL, {
    tls: { servername: urlObj.hostname },
    maxRetriesPerRequest: 1,
    connectTimeout: 5000,
    retryStrategy: () => null
  });

  r2.on('error', (err2) => {
    console.error('Test 2 Error:', err2.message);
    r2.disconnect();

    // Test 3: Manual config
    console.log('\n--- Test 3: Manual host/port/tls config ---');
    const r3 = new Redis({
      host: urlObj.hostname,
      port: parseInt(urlObj.port, 10),
      username: urlObj.username || 'default',
      password: decodeURIComponent(urlObj.password),
      tls: { servername: urlObj.hostname },
      maxRetriesPerRequest: 1,
      connectTimeout: 5000,
      retryStrategy: () => null
    });

    r3.on('error', (err3) => {
      console.error('Test 3 Error:', err3.message);
      r3.disconnect();
      process.exit(1);
    });
    r3.on('ready', () => {
      console.log('Test 3: SUCCESS!');
      r3.quit().then(() => process.exit(0));
    });
  });

  r2.on('ready', () => {
    console.log('Test 2: SUCCESS!');
    r2.quit().then(() => process.exit(0));
  });
});

r1.on('ready', () => {
  console.log('Test 1: SUCCESS!');
  r1.quit().then(() => process.exit(0));
});
