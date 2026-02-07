import type { VercelRequest, VercelResponse } from '@vercel/node';

function setCorsHeaders(res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

type RouteStop = {
  label: string;
  placeId?: string | null;
  lat?: number | null;
  lng?: number | null;
};

const MAX_WAYPOINTS = 8;

function asStop(value: unknown): RouteStop | null {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Record<string, unknown>;
  const label = typeof candidate.label === 'string' ? candidate.label.trim() : '';
  if (!label) return null;

  return {
    label,
    placeId: typeof candidate.placeId === 'string' ? candidate.placeId : null,
    lat: typeof candidate.lat === 'number' ? candidate.lat : null,
    lng: typeof candidate.lng === 'number' ? candidate.lng : null,
  };
}

function formatStop(stop: RouteStop): string {
  if (stop.placeId) return `place_id:${stop.placeId}`;
  if (typeof stop.lat === 'number' && typeof stop.lng === 'number') return `${stop.lat},${stop.lng}`;
  return stop.label;
}

function buildDirectionsUrl(stops: RouteStop[], mode: string) {
  const origin = formatStop(stops[0]);
  const destination = formatStop(stops[stops.length - 1]);
  const waypoints = stops.slice(1, -1).map(formatStop);

  const url = new URL('https://www.google.com/maps/dir/');
  url.searchParams.set('api', '1');
  url.searchParams.set('origin', origin);
  url.searchParams.set('destination', destination);
  if (waypoints.length > 0) {
    url.searchParams.set('waypoints', waypoints.join('|'));
  }
  url.searchParams.set('travelmode', mode);
  return url.toString();
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = req.body && typeof req.body === 'object' ? req.body as Record<string, unknown> : {};
    const requestedMode = typeof body.mode === 'string' ? body.mode : 'walk';
    const mode = ['walk', 'drive', 'transit', 'bike'].includes(requestedMode) ? requestedMode : 'walk';
    const stopsInput = Array.isArray(body.stops) ? body.stops : [];
    const stops = stopsInput.map(asStop).filter((item): item is RouteStop => Boolean(item));

    if (stops.length < 2) {
      return res.status(400).json({ error: 'At least two stops are required' });
    }

    if (stops.length <= MAX_WAYPOINTS + 2) {
      return res.status(200).json({
        url: buildDirectionsUrl(stops, mode),
        segmented: false,
        segments: [],
      });
    }

    const segments: string[] = [];
    for (let i = 0; i < stops.length - 1; i += MAX_WAYPOINTS + 1) {
      const chunk = stops.slice(i, i + MAX_WAYPOINTS + 2);
      if (chunk.length < 2) continue;
      segments.push(buildDirectionsUrl(chunk, mode));
    }

    return res.status(200).json({
      url: segments[0] || buildDirectionsUrl(stops.slice(0, 2), mode),
      segmented: true,
      segments,
    });
  } catch (error) {
    console.error('Error building route link:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
