import type { VercelRequest, VercelResponse } from '@vercel/node';
import extractPlacesFromImage from '../server/api/extract-places-from-image.js';
import extractPlacesFromText from '../server/api/extract-places-from-text.js';
import extractPlacesFromUrl from '../server/api/extract-places-from-url.js';
import generateAiSuggestions from '../server/api/generate-ai-suggestions.js';
import geocodePlace from '../server/api/geocode-place.js';
import itineraryDraft from '../server/api/itinerary-draft.js';
import itineraryRecommendations from '../server/api/itinerary-recommendations.js';
import parseItineraryText from '../server/api/parse-itinerary-text.js';
import placeDetails from '../server/api/place-details.js';
import placeMapLink from '../server/api/place-map-link.js';
import placeReviews from '../server/api/place-reviews.js';
import placeSearch from '../server/api/place-search.js';
import resolvePlaces from '../server/api/resolve-places.js';
import routeLink from '../server/api/route-link.js';
import screenshotExtract from '../server/api/screenshot-extract.js';
import screenshotSubmit from '../server/api/screenshot-submit.js';
import stopTiming from '../server/api/stop-timing.js';
import suggestionPlacementCommit from '../server/api/suggestion-placement-commit.js';
import suggestionPlacementPreview from '../server/api/suggestion-placement-preview.js';

type Handler = (req: VercelRequest, res: VercelResponse) => Promise<unknown> | unknown;

const routeHandlers: Record<string, Handler> = {
  'extract-places-from-image': extractPlacesFromImage,
  'extract-places-from-text': extractPlacesFromText,
  'extract-places-from-url': extractPlacesFromUrl,
  'generate-ai-suggestions': generateAiSuggestions,
  'geocode-place': geocodePlace,
  'itinerary-draft': itineraryDraft,
  'itinerary-recommendations': itineraryRecommendations,
  'parse-itinerary-text': parseItineraryText,
  'place-details': placeDetails,
  'place-map-link': placeMapLink,
  'place-reviews': placeReviews,
  'place-search': placeSearch,
  'resolve-places': resolvePlaces,
  'route-link': routeLink,
  'screenshot-extract': screenshotExtract,
  'screenshot-submit': screenshotSubmit,
  'stop-timing': stopTiming,
  'suggestion-placement-commit': suggestionPlacementCommit,
  'suggestion-placement-preview': suggestionPlacementPreview,
};

function getRequestedRoute(routeParam: string | string[] | undefined): string {
  const combined = Array.isArray(routeParam) ? routeParam.join('/') : routeParam || '';
  return combined.replace(/^\/+|\/+$/g, '');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const requestedRoute = getRequestedRoute(req.query.route);
  const routeHandler = routeHandlers[requestedRoute];

  if (!routeHandler) {
    return res.status(404).json({ error: `Unknown API route: ${requestedRoute || '(root)'}` });
  }

  return routeHandler(req, res);
}
