import { getTrip, updateTrip, deleteTrip } from '../lib/trip-store.js';

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    req.on('end', () => {
      try {
        const raw = Buffer.concat(chunks).toString();
        resolve(raw ? JSON.parse(raw) : {});
      } catch (error) {
        reject(error);
      }
    });
    req.on('error', reject);
  });
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { tripId } = req.query;

  if (req.method === 'GET') {
    const trip = getTrip(tripId);
    if (!trip) {
      res.status(404).json({ detail: 'Trip not found' });
      return;
    }
    res.status(200).json(trip);
    return;
  }

  if (req.method === 'PUT') {
    try {
      const body = await readBody(req);
      const updated = updateTrip(tripId, body);
      if (!updated) {
        res.status(404).json({ detail: 'Trip not found' });
        return;
      }
      res.status(200).json(updated);
    } catch (error) {
      res.status(400).json({ detail: error.message || 'Invalid update payload' });
    }
    return;
  }

  if (req.method === 'DELETE') {
    const result = deleteTrip(tripId);
    res.status(200).json(result);
    return;
  }

  res.status(405).json({ detail: 'Method not allowed' });
}
