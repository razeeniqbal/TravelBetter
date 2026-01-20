import type { DayItinerary, Place, Trip, TripAuthor } from '@/types/trip';

const GUEST_TRIPS_KEY = 'guest_trips_v1';
const GUEST_SAVED_TRIPS_KEY = 'guest_saved_trips_v1';
const GUEST_SAVED_PLACES_KEY = 'guest_saved_places_v1';

export const GUEST_USER_ID = 'guest-user';
export const GUEST_AUTHOR: TripAuthor = {
  id: GUEST_USER_ID,
  name: 'Guest',
  username: 'guest',
};

function hasStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function readJson<T>(key: string, fallback: T): T {
  if (!hasStorage()) return fallback;
  const raw = window.localStorage.getItem(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T) {
  if (!hasStorage()) return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

export function createGuestTripId() {
  return `guest-trip-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createGuestPlaceId(tripId: string, index: number) {
  return `${tripId}-place-${index}-${Math.random().toString(36).slice(2, 6)}`;
}

export function makeGuestDayId(tripId: string, dayNumber: number) {
  return `guest-day::${tripId}::${dayNumber}`;
}

export function parseGuestDayId(dayId: string) {
  const parts = dayId.split('::');
  if (parts.length !== 3 || parts[0] !== 'guest-day') return null;
  const dayNumber = Number(parts[2]);
  if (!Number.isFinite(dayNumber)) return null;
  return { tripId: parts[1], dayNumber };
}

export function getGuestTrips(): Trip[] {
  return readJson<Trip[]>(GUEST_TRIPS_KEY, []);
}

export function saveGuestTrip(trip: Trip) {
  const trips = getGuestTrips().filter(t => t.id !== trip.id);
  writeJson(GUEST_TRIPS_KEY, [trip, ...trips]);
}

export function updateGuestTrip(trip: Trip) {
  saveGuestTrip(trip);
}

export function getGuestTripById(tripId: string) {
  return getGuestTrips().find(t => t.id === tripId);
}

export function deleteGuestTrip(tripId: string) {
  const trips = getGuestTrips().filter(t => t.id !== tripId);
  writeJson(GUEST_TRIPS_KEY, trips);
}

export function renameGuestTrip(tripId: string, title: string) {
  const trips = getGuestTrips().map(t => (t.id === tripId ? { ...t, title } : t));
  writeJson(GUEST_TRIPS_KEY, trips);
}

export function addGuestDay(tripId: string) {
  const trip = getGuestTripById(tripId);
  if (!trip) return null;

  const nextDay = trip.itinerary.length + 1;
  const newDay: DayItinerary = {
    day: nextDay,
    title: `Day ${nextDay}`,
    places: [],
  };
  const updatedTrip: Trip = {
    ...trip,
    duration: nextDay,
    itinerary: [...trip.itinerary, newDay],
  };
  updateGuestTrip(updatedTrip);
  return { trip: updatedTrip, day: newDay };
}

export function addGuestPlaceToDay(tripId: string, dayNumber: number, place: Place) {
  const trip = getGuestTripById(tripId);
  if (!trip) return null;

  const updatedItinerary = trip.itinerary.map(day => {
    if (day.day !== dayNumber) return day;
    return {
      ...day,
      places: [...day.places, place],
    };
  });

  const updatedTrip: Trip = {
    ...trip,
    itinerary: updatedItinerary,
  };
  updateGuestTrip(updatedTrip);
  return updatedTrip;
}

export function getGuestSavedTripIds(): string[] {
  return readJson<string[]>(GUEST_SAVED_TRIPS_KEY, []);
}

export function toggleGuestSavedTrip(tripId: string) {
  const saved = new Set(getGuestSavedTripIds());
  let isSaved: boolean;

  if (saved.has(tripId)) {
    saved.delete(tripId);
    isSaved = false;
  } else {
    saved.add(tripId);
    isSaved = true;
  }

  writeJson(GUEST_SAVED_TRIPS_KEY, Array.from(saved));
  return isSaved;
}

export function getGuestSavedPlaceIds(): string[] {
  return readJson<string[]>(GUEST_SAVED_PLACES_KEY, []);
}

export function toggleGuestSavedPlace(placeId: string) {
  const saved = new Set(getGuestSavedPlaceIds());
  let isSaved: boolean;

  if (saved.has(placeId)) {
    saved.delete(placeId);
    isSaved = false;
  } else {
    saved.add(placeId);
    isSaved = true;
  }

  writeJson(GUEST_SAVED_PLACES_KEY, Array.from(saved));
  return isSaved;
}
