import { describe, expect, it } from 'vitest';
import { parseItineraryText } from './itinerary-parser.js';
import {
  hatyaiSample,
  headersOnlySample,
  multiDaySample,
  mixedHeaderSample,
  noHeaderSample,
} from '../../src/test/fixtures/itinerarySamples.js';
import { expectDayLabels, expectDayPlaces, expectNoPlaceNamed } from '../../src/test/utils/itineraryAssertions.js';

describe('parseItineraryText', () => {
  it('groups by day headers and filters non-place lines', () => {
    const result = parseItineraryText(multiDaySample, 'Lisbon');

    expect(result.days).toHaveLength(2);
    expectDayLabels(result.days, ['DAY 1 6/8 WED', 'DAY 2 - Thu']);
    expectDayPlaces(result.days, 0, ['Breakfast: Pastel de Belem', 'Alfama walk']);
    expectDayPlaces(result.days, 1, ['Time Out Market lunch', 'LX Factory']);
    expectNoPlaceNamed(result.days, 'flight into Lisbon');
    expectNoPlaceNamed(result.days, 'Notes: bring comfy shoes');
  });

  it('extracts time prefixes and preserves order', () => {
    const result = parseItineraryText(mixedHeaderSample);

    expect(result.days).toHaveLength(2);
    expectDayLabels(result.days, ['Day 1', 'DAY 2 - Tue']);

    const firstPlace = result.days[0].places[0];
    expect(firstPlace.name).toBe('coffee');
    expect(firstPlace.timeText).toBe('9am');
    expectDayPlaces(result.days, 0, ['coffee', 'Sintra Palace']);
  });

  it('falls back to a single day when no headers exist', () => {
    const result = parseItineraryText(noHeaderSample);

    expect(result.days).toHaveLength(1);
    expectDayLabels(result.days, ['Day 1']);
    expectDayPlaces(result.days, 0, ['Pastel de Belem', 'Alfama walk']);
  });

  it('keeps empty day groups when headers have no items', () => {
    const result = parseItineraryText(headersOnlySample);

    expect(result.days).toHaveLength(2);
    expectDayLabels(result.days, ['DAY 1', 'DAY 2']);
    expect(result.days[0].places).toHaveLength(0);
    expect(result.days[1].places).toHaveLength(0);
  });

  it('parses a messy Hatyai itinerary into day groups', () => {
    const result = parseItineraryText(hatyaiSample, 'Hatyai');

    expectDayLabels(result.days, ['DAY 1 6/8 WED', 'DAY 2 7/8 THURS', 'DAY3 8/8 FRI']);
    expectDayPlaces(result.days, 0, [
      'Neo Grand Hatyai',
      'Krua Pa Yad 叫菜吃饭',
      'thefellows.hdy café',
      'Mookata Paeyim晚餐',
      'Greeway Night Market 逛夜市',
    ]);
    expectDayPlaces(result.days, 1, [
      'Choo Ja Roean Boat Noodle 早餐',
      'Kim Yong Market 逛逛',
      '东方燕窝',
      'Porkleg Tuateaw @Samchai',
      'Central Festival Hatyai',
      'Maribu晚餐',
      'Lee Garden Night Market',
      'Lee Garden 按摩',
      'Pa Ad Fresh Milk 宵夜',
    ]);
    expectDayPlaces(result.days, 2, [
      'Kuay Jab Jae Khwan',
      'Lee Garden附近走走',
      '最大的7-11',
      'Baan Khun Bhu',
      'Hood Hatyai café',
      '古早味炭烧鸡蛋糕',
    ]);
    expectNoPlaceNamed(result.days, 'Places from my itinerary');
  });

  it('preserves time tokens that are part of a place name', () => {
    const result = parseItineraryText(`DAY 1\n7AM Cafe\n11:11 Coffee\n9am coffee`);

    expectDayPlaces(result.days, 0, ['7AM Cafe', '11:11 Coffee', 'coffee']);
  });
});
