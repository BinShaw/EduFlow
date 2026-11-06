import {
  melbourneDateKey,
  melbourneDayStart,
  melbourneLocalDateTimeToUtc,
  melbourneNextDayStart,
} from './timezone';

describe('Australia/Melbourne business time', () => {
  it('uses the Melbourne date near a UTC date boundary', () => {
    expect(melbourneDateKey(new Date('2026-11-05T15:00:00Z'))).toBe('2026-11-06');
    expect(melbourneLocalDateTimeToUtc('2026-11-06', 9, 0).toISOString()).toBe(
      '2026-11-05T22:00:00.000Z',
    );
    expect(melbourneLocalDateTimeToUtc('2026-07-06', 9, 0).toISOString()).toBe(
      '2026-07-05T23:00:00.000Z',
    );
  });
  it('uses a 23-hour day when daylight saving begins', () => {
    const day = melbourneDayStart(new Date('2026-10-04T06:00:00Z'));
    expect((melbourneNextDayStart(day).getTime() - day.getTime()) / 3600000).toBe(23);
  });
  it('uses a 25-hour day when daylight saving ends', () => {
    const day = melbourneDayStart(new Date('2026-04-05T06:00:00Z'));
    expect((melbourneNextDayStart(day).getTime() - day.getTime()) / 3600000).toBe(25);
  });
  it('rejects nonexistent, ambiguous, and invalid local dates', () => {
    expect(() => melbourneLocalDateTimeToUtc('2026-10-04', 2, 30)).toThrow(RangeError);
    expect(() => melbourneLocalDateTimeToUtc('2026-04-05', 2, 30)).toThrow(RangeError);
    expect(() => melbourneLocalDateTimeToUtc('2026-02-30', 9, 0)).toThrow(RangeError);
  });
});
