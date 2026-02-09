import type { Place } from '@/types/trip';

type TimedPlace = Pick<Place, 'arrivalTime' | 'stayDurationMinutes' | 'duration' | 'commuteDurationMinutes' | 'walkingTimeFromPrevious'>;

export function parseClockToMinutes(value?: string): number | null {
  if (!value) return null;

  const match = value.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return null;

  let hour = Number(match[1]) % 12;
  const minute = Number(match[2]);
  const period = match[3].toUpperCase();

  if (period === 'PM') hour += 12;

  return (hour * 60) + minute;
}

export function formatMinutesToClock(totalMinutes: number): string {
  const normalized = ((totalMinutes % 1440) + 1440) % 1440;
  const hour24 = Math.floor(normalized / 60);
  const minute = normalized % 60;
  const period = hour24 < 12 ? 'AM' : 'PM';
  const hour12 = ((hour24 + 11) % 12) + 1;
  return `${hour12}:${String(minute).padStart(2, '0')} ${period}`;
}

export function buildDisplayTimes(places: TimedPlace[]): string[] {
  let cursorMinutes = 9 * 60;

  return places.map((place, index) => {
    const parsedArrival = parseClockToMinutes(place.arrivalTime);
    if (parsedArrival !== null) {
      cursorMinutes = parsedArrival;
    }

    const arrival = formatMinutesToClock(cursorMinutes);
    const stayMinutes = place.stayDurationMinutes || place.duration || 60;
    const nextPlace = places[index + 1];
    const commuteToNext = nextPlace?.commuteDurationMinutes ?? nextPlace?.walkingTimeFromPrevious ?? 0;

    cursorMinutes += stayMinutes + commuteToNext;

    return arrival;
  });
}
