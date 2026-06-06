import { createClient } from 'redis';

const redisUrl = process.env.REDIS_URL;
let client = null;

async function getClient() {
  if (!client) {
    client = createClient({ url: redisUrl });
    client.on('error', (err) => console.error('Redis Client Error', err));
    await client.connect();
  }
  return client;
}

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (!redisUrl) {
    return res.status(500).json({ error: 'REDIS_URL not configured' });
  }

  try {
    const redis = await getClient();

    if (req.method === 'GET') {
      const { key } = req.query;
      if (!key) {
        return res.status(400).json({ error: 'Missing key parameter' });
      }
      const val = await redis.get(key);
      return res.status(200).json({ result: val });
    }

    if (req.method === 'POST') {
      const { cmd, key, value } = req.body;
      if (!cmd || !key) {
        return res.status(400).json({ error: 'Missing cmd or key' });
      }

      if (cmd === 'SET') {
        await redis.set(key, value);
        return res.status(200).json({ result: 'OK' });
      } else if (cmd === 'DEL') {
        const deleted = await redis.del(key);
        return res.status(200).json({ result: deleted });
      } else {
        return res.status(400).json({ error: `Unsupported command: ${cmd}` });
      }
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message });
  }
}
