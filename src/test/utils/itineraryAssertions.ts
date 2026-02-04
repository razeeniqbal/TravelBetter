import type { ParsedDayGroup } from '@/types/itinerary';

export function expectDayLabels(days: ParsedDayGroup[], labels: string[]) {
  const actual = days.map(day => day.label);
  expect(actual).toEqual(labels);
}

export function expectDayPlaces(days: ParsedDayGroup[], dayIndex: number, names: string[]) {
  const actual = days[dayIndex]?.places.map(place => place.name) || [];
  expect(actual).toEqual(names);
}

export function expectNoPlaceNamed(days: ParsedDayGroup[], name: string) {
  const hasName = days.some(day => day.places.some(place => place.name === name));
  expect(hasName).toBe(false);
}
