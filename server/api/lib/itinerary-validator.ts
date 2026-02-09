type UnknownRecord = Record<string, unknown>;

export interface ValidationSuccess<T> {
  ok: true;
  data: T;
}

export interface ValidationFailure {
  ok: false;
  error: string;
}

export type ValidationResult<T> = ValidationSuccess<T> | ValidationFailure;

export interface DraftPayload {
  tripId: string;
  editSession: {
    draftId: string;
    baselineHash: string;
  };
  days: Array<{
    dayNumber: number;
    anchorStopId?: string | null;
    stops: Array<{
      stopId: string;
      position: number;
      arrivalTime?: string | null;
      stayDurationMinutes: number;
    }>;
  }>;
}

export interface PlacementPreviewPayload {
  tripId: string;
  mode: 'manual' | 'ai';
  selectedSuggestions: Array<{
    suggestionId: string;
    displayName: string;
    manualDayNumber?: number | null;
  }>;
  destinationContext?: string;
}

export interface PlacementCommitPayload {
  tripId: string;
  placements: Array<{
    suggestionId: string;
    confirmedDayNumber: number;
  }>;
}

export interface StopTimingPayload {
  tripId: string;
  stopId: string;
  arrivalTime?: string | null;
  stayDurationMinutes: number;
}

export interface ScreenshotImageInput {
  filename: string;
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp';
  base64Data: string;
}

export interface ScreenshotExtractPayload {
  destination?: string;
  images: ScreenshotImageInput[];
}

export interface ScreenshotSubmitPayload {
  batchId: string;
  text: string;
  destination?: string;
  durationDays?: number;
}

function isRecord(value: unknown): value is UnknownRecord {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function asNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function invalid<T>(error: string): ValidationResult<T> {
  return { ok: false, error };
}

function valid<T>(data: T): ValidationResult<T> {
  return { ok: true, data };
}

export function validateDraftPayload(body: unknown): ValidationResult<DraftPayload> {
  if (!isRecord(body)) return invalid('Invalid payload');

  const tripId = asString(body.tripId);
  if (!tripId) return invalid('tripId is required');

  if (!isRecord(body.editSession)) return invalid('editSession is required');
  const draftId = asString(body.editSession.draftId);
  const baselineHash = asString(body.editSession.baselineHash);
  if (!draftId || !baselineHash) return invalid('editSession draftId and baselineHash are required');

  const days = Array.isArray(body.days) ? body.days : null;
  if (!days || days.length === 0) return invalid('days must be a non-empty array');

  const normalizedDays = days.map((day, dayIndex) => {
    if (!isRecord(day)) throw new Error(`days[${dayIndex}] must be an object`);
    const dayNumber = asNumber(day.dayNumber);
    if (!dayNumber || dayNumber < 1) throw new Error(`days[${dayIndex}].dayNumber must be >= 1`);
    const stops = Array.isArray(day.stops) ? day.stops : null;
    if (!stops) throw new Error(`days[${dayIndex}].stops must be an array`);

    const normalizedStops = stops.map((stop, stopIndex) => {
      if (!isRecord(stop)) throw new Error(`stops[${stopIndex}] in day ${dayNumber} must be an object`);
      const stopId = asString(stop.stopId);
      const position = asNumber(stop.position);
      const stayDurationMinutes = asNumber(stop.stayDurationMinutes);
      if (!stopId) throw new Error(`stops[${stopIndex}].stopId is required`);
      if (position === null || position < 0) throw new Error(`stops[${stopIndex}].position must be >= 0`);
      if (stayDurationMinutes === null || stayDurationMinutes < 5) {
        throw new Error(`stops[${stopIndex}].stayDurationMinutes must be >= 5`);
      }

      return {
        stopId,
        position,
        arrivalTime: asString(stop.arrivalTime),
        stayDurationMinutes,
      };
    });

    return {
      dayNumber,
      anchorStopId: asString(day.anchorStopId),
      stops: normalizedStops,
    };
  });

  return valid({
    tripId,
    editSession: { draftId, baselineHash },
    days: normalizedDays,
  });
}

export function validatePlacementPreviewPayload(body: unknown): ValidationResult<PlacementPreviewPayload> {
  if (!isRecord(body)) return invalid('Invalid payload');

  const tripId = asString(body.tripId);
  if (!tripId) return invalid('tripId is required');

  const mode = body.mode === 'manual' || body.mode === 'ai' ? body.mode : null;
  if (!mode) return invalid('mode must be manual or ai');

  const selectedSuggestions = Array.isArray(body.selectedSuggestions) ? body.selectedSuggestions : null;
  if (!selectedSuggestions || selectedSuggestions.length === 0) {
    return invalid('selectedSuggestions must be a non-empty array');
  }

  const normalized = selectedSuggestions.map((item, index) => {
    if (!isRecord(item)) throw new Error(`selectedSuggestions[${index}] must be an object`);
    const suggestionId = asString(item.suggestionId);
    const displayName = asString(item.displayName);
    if (!suggestionId || !displayName) {
      throw new Error(`selectedSuggestions[${index}] requires suggestionId and displayName`);
    }

    const manualDayNumber = asNumber(item.manualDayNumber);
    return {
      suggestionId,
      displayName,
      manualDayNumber: manualDayNumber && manualDayNumber > 0 ? manualDayNumber : null,
    };
  });

  return valid({
    tripId,
    mode,
    selectedSuggestions: normalized,
    destinationContext: asString(body.destinationContext) || undefined,
  });
}

export function validatePlacementCommitPayload(body: unknown): ValidationResult<PlacementCommitPayload> {
  if (!isRecord(body)) return invalid('Invalid payload');

  const tripId = asString(body.tripId);
  if (!tripId) return invalid('tripId is required');

  const placements = Array.isArray(body.placements) ? body.placements : null;
  if (!placements || placements.length === 0) return invalid('placements must be a non-empty array');

  const normalized = placements.map((item, index) => {
    if (!isRecord(item)) throw new Error(`placements[${index}] must be an object`);
    const suggestionId = asString(item.suggestionId);
    const confirmedDayNumber = asNumber(item.confirmedDayNumber);
    if (!suggestionId || confirmedDayNumber === null || confirmedDayNumber < 1) {
      throw new Error(`placements[${index}] requires suggestionId and confirmedDayNumber >= 1`);
    }
    return { suggestionId, confirmedDayNumber };
  });

  return valid({ tripId, placements: normalized });
}

export function validateStopTimingPayload(body: unknown): ValidationResult<StopTimingPayload> {
  if (!isRecord(body)) return invalid('Invalid payload');

  const tripId = asString(body.tripId);
  const stopId = asString(body.stopId);
  const stayDurationMinutes = asNumber(body.stayDurationMinutes);
  if (!tripId || !stopId) return invalid('tripId and stopId are required');
  if (stayDurationMinutes === null || stayDurationMinutes < 5) {
    return invalid('stayDurationMinutes must be >= 5');
  }

  return valid({
    tripId,
    stopId,
    arrivalTime: asString(body.arrivalTime),
    stayDurationMinutes,
  });
}

export function validateScreenshotExtractPayload(body: unknown): ValidationResult<ScreenshotExtractPayload> {
  if (!isRecord(body)) return invalid('Invalid payload');
  const images = Array.isArray(body.images) ? body.images : null;
  if (!images || images.length === 0) return invalid('images must be a non-empty array');
  if (images.length > 10) return invalid('images supports up to 10 files per batch');

  const normalized = images.map((image, index) => {
    if (!isRecord(image)) throw new Error(`images[${index}] must be an object`);
    const filename = asString(image.filename);
    const mimeType = asString(image.mimeType);
    const base64Data = asString(image.base64Data);
    if (!filename || !mimeType || !base64Data) {
      throw new Error(`images[${index}] requires filename, mimeType, and base64Data`);
    }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(mimeType)) {
      throw new Error(`images[${index}] has unsupported mimeType`);
    }
    return {
      filename,
      mimeType: mimeType as ScreenshotImageInput['mimeType'],
      base64Data,
    };
  });

  return valid({
    destination: asString(body.destination) || undefined,
    images: normalized,
  });
}

export function validateScreenshotSubmitPayload(body: unknown): ValidationResult<ScreenshotSubmitPayload> {
  if (!isRecord(body)) return invalid('Invalid payload');
  const batchId = asString(body.batchId);
  const text = asString(body.text);
  if (!batchId || !text) return invalid('batchId and text are required');

  const durationDays = asNumber(body.durationDays);
  return valid({
    batchId,
    text,
    destination: asString(body.destination) || undefined,
    durationDays: durationDays && durationDays > 0 ? Math.floor(durationDays) : undefined,
  });
}
