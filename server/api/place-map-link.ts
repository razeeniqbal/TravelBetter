import type { VercelRequest, VercelResponse } from '@vercel/node';

function setCorsHeaders(res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function asString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const placeId = asString(req.query.placeId);
    const placeName = asString(req.query.placeName);
    const lat = asString(req.query.lat);
    const lng = asString(req.query.lng);

    let url = 'https://www.google.com/maps';

    if (placeId) {
      const query = placeName || placeId;
      url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}&query_place_id=${encodeURIComponent(placeId)}`;
    } else if (lat && lng) {
      url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${lat},${lng}`)}`;
    } else if (placeName) {
      url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(placeName)}`;
    }

    return res.status(200).json({ url });
  } catch (error) {
    console.error('Error building place map link:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
