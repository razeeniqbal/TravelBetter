import type { DayItinerary, Place, Trip } from '@/types/trip';

const EMOJI_REGEX = /[\p{Extended_Pictographic}]/gu;
const VARIATION_SELECTOR_REGEX = /[\uFE0E\uFE0F]/g;
const LEADING_MARKERS_REGEX = /^[•\-*]+\s*/;
const TRAILING_ASTERISK_REGEX = /\s*\*+$/;
const DATE_RANGE_REGEX = /\b\d{1,2}\/\d{1,2}(?:\s*[-–]\s*\d{1,2}\/\d{1,2})\b/;
const DAY_HEADER_REGEX = /^day\s*\d+\b/i;
const DAY_HEADER_COMPACT_REGEX = /^day\d+\b/i;

const META_LINE_PATTERNS = [
  /^places from my itinerary\b/i,
  /^i(?:'|’)m planning a trip to\b/i,
  /^i am planning a trip to\b/i,
];

function normalizeLabel(value: string) {
  return value
    .replace(EMOJI_REGEX, '')
    .replace(VARIATION_SELECTOR_REGEX, '')
    .replace(LEADING_MARKERS_REGEX, '')
    .replace(TRAILING_ASTERISK_REGEX, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

export function isDayHeaderLabel(value: string) {
  const normalized = normalizeLabel(value);
  if (!normalized) return false;
  return DAY_HEADER_REGEX.test(normalized) || DAY_HEADER_COMPACT_REGEX.test(normalized);
}

export function isMetaItineraryLine(value: string) {
  const normalized = normalizeLabel(value);
  if (!normalized) return false;
  if (META_LINE_PATTERNS.some(pattern => pattern.test(normalized))) return true;
  if (normalized.includes('trip') && DATE_RANGE_REGEX.test(normalized)) return true;
  return false;
}

export function shouldExcludePlaceName(name: string, dayLabels?: Set<string>) {
  const normalized = normalizeLabel(name);
  if (!normalized) return true;
  if (dayLabels?.has(normalized)) return true;
  if (isDayHeaderLabel(normalized)) return true;
  if (isMetaItineraryLine(normalized)) return true;
  return false;
}

export function filterPlaces<T extends { name: string }>(places: T[], dayLabels?: string[]) {
  const labelSet = dayLabels ? new Set(dayLabels.map(normalizeLabel)) : undefined;
  return places.filter(place => !shouldExcludePlaceName(place.name, labelSet));
}

export function sanitizeItineraryDays(days: DayItinerary[]) {
  let changed = false;
  const sanitized = days.map(day => {
    const filteredPlaces = day.places.filter(place => !shouldExcludePlaceName(place.name));
    if (filteredPlaces.length !== day.places.length) {
      changed = true;
      return { ...day, places: filteredPlaces };
    }
    return day;
  });

  return { days: sanitized, changed };
}

export function sanitizeTrip(trip: Trip) {
  const { days, changed } = sanitizeItineraryDays(trip.itinerary);
  if (!changed) return { trip, changed: false };
  return { trip: { ...trip, itinerary: days }, changed: true };
}

export function sanitizePlaces(places: Place[], dayLabels?: string[]) {
  return filterPlaces(places, dayLabels);
}
