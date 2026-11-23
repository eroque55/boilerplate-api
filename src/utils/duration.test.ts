import { describe, expect, it } from 'vitest';

import { durationToSeconds } from './duration';

describe('durationToSeconds', () => {
  it.each([
    ['45s', 45],
    ['15m', 900],
    ['2h', 7200],
    ['7d', 604_800],
  ])('converts %s to %i seconds', (duration, seconds) => {
    expect(durationToSeconds(duration)).toBe(seconds);
  });

  it('rejects a duration without a unit', () => {
    expect(() => durationToSeconds('15')).toThrow('Invalid duration: 15');
  });
});
