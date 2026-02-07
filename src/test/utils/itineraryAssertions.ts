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

export function expectPlaceMovedAcrossDays(
  days: ParsedDayGroup[],
  placeName: string,
  fromDayLabel: string,
  toDayLabel: string
) {
  const fromDay = days.find(day => day.label === fromDayLabel);
  const toDay = days.find(day => day.label === toDayLabel);

  const inFromDay = Boolean(fromDay?.places.some(place => place.name === placeName));
  const inToDay = Boolean(toDay?.places.some(place => place.name === placeName));

  expect(inFromDay).toBe(false);
  expect(inToDay).toBe(true);
}

export function expectDayPlacement(
  placements: Array<{ suggestionId: string; proposedDayNumber: number }>,
  suggestionId: string,
  expectedDay: number
) {
  const item = placements.find(entry => entry.suggestionId === suggestionId);
  expect(item).toBeDefined();
  expect(item?.proposedDayNumber).toBe(expectedDay);
}

export function expectContiguousPositions(
  stops: Array<{ position: number }>
) {
  const actual = stops.map(stop => stop.position).sort((a, b) => a - b);
  const expected = Array.from({ length: stops.length }, (_, index) => index);
  expect(actual).toEqual(expected);
}
