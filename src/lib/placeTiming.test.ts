import { describe, expect, it } from 'vitest';
import { buildDisplayTimes } from './placeTiming';

describe('buildDisplayTimes', () => {
  it('carries long stay duration into subsequent stop time', () => {
    const times = buildDisplayTimes([
      { stayDurationMinutes: 600 },
      { stayDurationMinutes: 60, commuteDurationMinutes: 60 },
    ]);

    expect(times).toEqual(['9:00 AM', '8:00 PM']);
  });

  it('respects explicit arrival time overrides when present', () => {
    const times = buildDisplayTimes([
      { arrivalTime: '8:30 AM', stayDurationMinutes: 30 },
      { stayDurationMinutes: 45 },
    ]);

    expect(times).toEqual(['8:30 AM', '9:00 AM']);
  });
});
