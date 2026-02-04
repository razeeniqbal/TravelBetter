export interface ParsedPlace {
  name: string;
  source: 'user';
  notes?: string;
  timeText?: string;
}

export interface ParsedDayGroup {
  label: string;
  date?: string | null;
  places: ParsedPlace[];
}

export interface ParsedItineraryResult {
  cleanedRequest: string;
  previewText: string;
  destination?: string | null;
  days: ParsedDayGroup[];
  warnings: string[];
}

const DAY_HEADER_REGEX = /^\s*((?:day\s*\d+|day\d+)\b[^\n]*|\d{1,2}\/\d{1,2}(?:\/\d{2,4})?\b[^\n]*)/i;
const TIME_PREFIX_REGEX = /^\s*(\d{1,2}[:.]\d{2}\s*(am|pm)?|\d{1,2}\s*(am|pm))\s*/i;
const TRAILING_TIME_REGEX = /\s*[.,–\-]?\s*\b\d{1,2}(?::\d{2})?\s*(am|pm)\b\s*$/i;
const LEADING_MARKERS_REGEX = /^[•\-*]+\s*/;
const EMOJI_REGEX = /[\p{Extended_Pictographic}]/gu;
const VARIATION_SELECTOR_REGEX = /[\uFE0E\uFE0F]/g;
const TRAILING_ASTERISK_REGEX = /\s*\*+$/;
const DATE_RANGE_REGEX = /\b\d{1,2}\/\d{1,2}(?:\s*[-–]\s*\d{1,2}\/\d{1,2})\b/;

const EXCLUDED_PATTERNS = [
  /^\s*(notes?|reminder|todo|itinerary|schedule|tips?)\b/i,
  /\b(arrive|depart|departure|check[- ]?in|check[- ]?out|flight|train|bus|transfer|layover|drive|taxi|uber)\b/i,
];

const META_LINE_PATTERNS = [
  /^\s*places from my itinerary\b/i,
  /^\s*i(?:'|’)m planning a trip to\b/i,
  /^\s*i am planning a trip to\b/i,
];

function stripLeadingMarkers(value: string) {
  return value.replace(LEADING_MARKERS_REGEX, '').trim();
}

function cleanLine(value: string) {
  return value
    .replace(EMOJI_REGEX, '')
    .replace(VARIATION_SELECTOR_REGEX, '')
    .replace(LEADING_MARKERS_REGEX, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeHeaderCandidate(value: string) {
  return value
    .replace(EMOJI_REGEX, '')
    .replace(VARIATION_SELECTOR_REGEX, '')
    .replace(LEADING_MARKERS_REGEX, '')
    .replace(TRAILING_ASTERISK_REGEX, '')
    .trim();
}

function extractTimePrefix(value: string) {
  const match = value.match(TIME_PREFIX_REGEX);
  if (!match) return { timeText: undefined, rest: value };
  const rest = value.slice(match[0].length);
  if (isLikelyTimeNamedPlace(rest)) {
    return { timeText: undefined, rest: value };
  }
  return {
    timeText: match[1],
    rest,
  };
}

function isExcludedLine(line: string) {
  return EXCLUDED_PATTERNS.some(pattern => pattern.test(line));
}

function hasLetters(value: string) {
  return (value.match(/\p{L}/gu) || []).length > 0;
}

function stripTrailingTime(value: string) {
  let result = value.trim();
  let previous = '';
  while (result && result !== previous) {
    previous = result;
    result = result.replace(TRAILING_TIME_REGEX, '').trim();
  }
  return result;
}

function isLikelyTimeNamedPlace(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return false;
  const words = trimmed.split(/\s+/).filter(Boolean);
  if (words.length > 2) return false;
  return /[A-Z]/.test(trimmed);
}

function getDayLabel(raw: string) {
  const cleaned = cleanLine(raw).replace(TRAILING_ASTERISK_REGEX, '');
  return cleaned ? cleaned.replace(/[:\-]+\s*$/, '') : 'Day 1';
}

function isMetaLine(line: string) {
  if (META_LINE_PATTERNS.some(pattern => pattern.test(line))) return true;
  if (/\btrip\b/i.test(line) && DATE_RANGE_REGEX.test(line)) return true;
  return false;
}

function extractPlaceFromTravelLine(line: string) {
  const match = line.match(
    /\b(?:reached|arrived(?:\s+at|\s+in)?|arrive(?:\s+at|\s+in)?|check(?:ed)?\s*-?\s*in(?:\s+at)?|checking\s*in(?:\s+at)?|stay(?:ing)?\s+at)\s+(.+)/i
  );
  if (!match) return null;

  const candidate = cleanLine(match[1])
    .replace(/^(to|at|in)\s+/i, '')
    .replace(/\b\d{1,2}[:.]\d{2}\s*(am|pm)?\b\s*$/i, '')
    .replace(/\b\d{1,2}\s*(am|pm)\b\s*$/i, '')
    .trim();

  const normalized = stripTrailingTime(candidate);
  if (!normalized) return null;

  if (!hasLetters(normalized)) return null;
  if (isExcludedLine(normalized)) return null;
  if (isMetaLine(normalized)) return null;

  const wordCount = normalized.split(/\s+/).filter(Boolean).length;
  if (wordCount <= 1 && /\barriv(ed|e)?\b/i.test(line)) return null;

  return normalized;
}

function isTravelOnlyLine(line: string) {
  return /\b(take|took|reached|reach|arrive|arrived|depart|departure|flight|train|bus|van|taxi|uber|transfer|check[- ]?in|check[- ]?out)\b/i.test(line);
}


function buildRequest(days: ParsedDayGroup[], destinationHint?: string | null) {
  const intro = destinationHint?.trim()
    ? `I'm planning a trip to ${destinationHint.trim()}.`
    : "I'm planning a trip.";

  const lines: string[] = [intro, '', 'Places from my itinerary:'];
  const includeDayLabels = days.length > 1;

  for (const day of days) {
    if (includeDayLabels) {
      lines.push(day.label);
    }
    for (const place of day.places) {
      lines.push(`- ${place.name}`);
    }
  }

  return lines.join('\n').trim();
}

export function parseItineraryText(rawText: string, destinationHint?: string | null): ParsedItineraryResult {
  const lines = rawText.split(/\r?\n/);
  const days: ParsedDayGroup[] = [];
  const warnings: string[] = [];

  let currentDay: ParsedDayGroup = {
    label: 'Day 1',
    date: null,
    places: [],
  };
  let sawDayHeader = false;

  const commitCurrentDay = (force: boolean) => {
    if (force || currentDay.places.length > 0 || days.length === 0) {
      days.push(currentDay);
    }
  };

  for (const rawLine of lines) {
    if (!rawLine.trim()) continue;

    const headerCandidate = normalizeHeaderCandidate(rawLine);
    const dayMatch = headerCandidate.match(DAY_HEADER_REGEX);
    if (dayMatch) {
      if (sawDayHeader) {
        commitCurrentDay(true);
      } else if (currentDay.places.length > 0) {
        commitCurrentDay(false);
      }
      currentDay = {
        label: getDayLabel(dayMatch[1]),
        date: null,
        places: [],
      };
      sawDayHeader = true;
      continue;
    }

    const { timeText, rest } = extractTimePrefix(rawLine);
    const cleaned = cleanLine(rest);
    if (!cleaned) continue;
    if (!hasLetters(cleaned)) continue;
    if (isMetaLine(cleaned)) continue;

    const extractedPlace = extractPlaceFromTravelLine(cleaned);
    if (extractedPlace) {
      currentDay.places.push({
        name: extractedPlace,
        source: 'user',
        timeText,
      });
      continue;
    }

    if (isTravelOnlyLine(cleaned)) continue;
    if (isExcludedLine(cleaned)) continue;

    const normalized = stripTrailingTime(cleaned);
    if (!normalized) continue;

    currentDay.places.push({
      name: normalized,
      source: 'user',
      timeText,
    });
  }

  commitCurrentDay(sawDayHeader);

  if (!sawDayHeader && days.length > 0) {
    days[0].label = 'Day 1';
  }

  if (days.every(day => day.places.length === 0)) {
    warnings.push('NO_PLACES_FOUND');
  }

  const cleanedRequest = buildRequest(days, destinationHint || undefined);

  return {
    cleanedRequest,
    previewText: cleanedRequest,
    destination: destinationHint || null,
    days,
    warnings,
  };
}
