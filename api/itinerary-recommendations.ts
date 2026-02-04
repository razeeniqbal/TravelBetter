import type { VercelRequest, VercelResponse } from '@vercel/node';
import generateHandler from './generate-ai-suggestions.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'POST') {
    const body = req.body || {};
    const cleanedRequest = typeof body.cleaned_request === 'string' ? body.cleaned_request : '';
    const destination = typeof body.destination === 'string' ? body.destination : '';
    const dayGroups = Array.isArray(body.days) ? body.days : [];
    const importedPlaces = dayGroups
      .flatMap(day => Array.isArray(day.places) ? day.places : [])
      .map(place => place?.name)
      .filter((name): name is string => typeof name === 'string');
    const duration = typeof body.duration_days === 'number'
      ? body.duration_days
      : dayGroups.length || 3;

    req.body = {
      destination,
      userPrompt: cleanedRequest,
      cleanedRequest,
      dayGroups,
      quickSelections: {},
      importedPlaces,
      duration,
      existingPlaces: importedPlaces.map(name => ({ name })),
      preferences: {},
      travelStyle: [],
    };
  }

  return generateHandler(req, res);
}
