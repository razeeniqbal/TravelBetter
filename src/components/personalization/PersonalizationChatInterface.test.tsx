import { describe, expect, it } from 'vitest';
import { parsePlacesFromPrompt } from './PersonalizationChatInterface';

describe('parsePlacesFromPrompt', () => {
  it('splits comma-separated entries under Places from my itinerary', () => {
    const prompt = `Places from my itinerary:
- Neo Grand Hatyai, Krua Pa Yad 叫菜吃饭, thefellows.hdy café`;

    const result = parsePlacesFromPrompt(prompt, []);

    expect(result).toEqual([
      'Neo Grand Hatyai',
      'Krua Pa Yad 叫菜吃饭',
      'thefellows.hdy café',
    ]);
  });

  it('falls back to seed places when a single comma line cannot split', () => {
    const prompt = `Places from my itinerary:
- Cafe,`;

    const result = parsePlacesFromPrompt(prompt, ['Backup A', 'Backup B']);

    expect(result).toEqual(['Backup A', 'Backup B']);
  });
});
