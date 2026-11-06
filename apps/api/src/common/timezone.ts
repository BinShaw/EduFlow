const timezone = 'Australia/Melbourne';

function dateParts(date: Date): Record<string, number> {
  const parts = new Intl.DateTimeFormat('en-AU', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  return Object.fromEntries(
    parts.filter((part) => part.type !== 'literal').map((part) => [part.type, Number(part.value)]),
  );
}

export function melbourneDateKey(date: Date): string {
  const parts = dateParts(date);
  return `${parts.year}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`;
}

export function melbourneDayStart(date = new Date()): Date {
  const key = melbourneDateKey(date);
  return melbourneLocalDateTimeToUtc(key, 0, 0);
}

export function melbourneNextDayStart(date = new Date()): Date {
  const [year, month, day] = melbourneDateKey(date).split('-').map(Number);
  const next = new Date(Date.UTC(year, month - 1, day + 1));
  const key = `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, '0')}-${String(next.getUTCDate()).padStart(2, '0')}`;
  return melbourneLocalDateTimeToUtc(key, 0, 0);
}

export function melbourneLocalDateTimeToUtc(day: string, hour: number, minute: number): Date {
  const [year, month, date] = day.split('-').map(Number);
  if (
    ![year, month, date, hour, minute].every(Number.isFinite) ||
    month < 1 ||
    month > 12 ||
    date < 1 ||
    date > 31 ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    throw new RangeError('Invalid Melbourne local date/time.');
  }
  const targetAsUtc = Date.UTC(year, month - 1, date, hour, minute);
  const normalized = new Date(targetAsUtc);
  if (
    normalized.getUTCFullYear() !== year ||
    normalized.getUTCMonth() !== month - 1 ||
    normalized.getUTCDate() !== date
  ) {
    throw new RangeError('Invalid Melbourne calendar date.');
  }
  // Inspect offsets on both sides of the transition; one-pass offset guesses fail
  // even at midnight on a transition day because the UTC guess is after the change.
  const offsets = new Set<number>();
  for (const hours of [-36, 0, 36]) {
    const sample = targetAsUtc + hours * 3600000;
    const seen = dateParts(new Date(sample));
    offsets.add(Date.UTC(seen.year, seen.month - 1, seen.day, seen.hour, seen.minute) - sample);
  }
  const candidates = [...offsets]
    .map((offset) => new Date(targetAsUtc - offset))
    .filter((candidate) => {
      const actual = dateParts(candidate);
      return (
        actual.year === year &&
        actual.month === month &&
        actual.day === date &&
        actual.hour === hour &&
        actual.minute === minute
      );
    });
  if (candidates.length === 0) {
    throw new RangeError(
      'This local time does not exist in Australia/Melbourne due to daylight saving time.',
    );
  }
  if (candidates.length > 1) {
    throw new RangeError(
      'This local time occurs twice in Australia/Melbourne. Choose an unambiguous time.',
    );
  }
  return candidates[0];
}

export function melbourneDisplay(date: Date, options: Intl.DateTimeFormatOptions = {}): string {
  return new Intl.DateTimeFormat('en-AU', { timeZone: timezone, ...options }).format(date);
}
