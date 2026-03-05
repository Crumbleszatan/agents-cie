/**
 * Holiday calendar by country — static fixed holidays + computed movable holidays.
 * Used by the planning engine to skip non-working days.
 */

// ─── Fixed holidays by country: [month, day] (1-indexed) ───

const FIXED_HOLIDAYS: Record<string, Array<[number, number]>> = {
  FR: [
    [1, 1],   // Jour de l'An
    [5, 1],   // Fête du Travail
    [5, 8],   // Victoire 1945
    [7, 14],  // Fête nationale
    [8, 15],  // Assomption
    [11, 1],  // Toussaint
    [11, 11], // Armistice
    [12, 25], // Noël
  ],
  BE: [
    [1, 1],   // Jour de l'An
    [5, 1],   // Fête du Travail
    [7, 21],  // Fête nationale
    [8, 15],  // Assomption
    [11, 1],  // Toussaint
    [11, 11], // Armistice
    [12, 25], // Noël
  ],
  CH: [
    [1, 1],   // Nouvel An
    [8, 1],   // Fête nationale
    [12, 25], // Noël
  ],
  DE: [
    [1, 1],   // Neujahr
    [5, 1],   // Tag der Arbeit
    [10, 3],  // Tag der Deutschen Einheit
    [12, 25], // 1. Weihnachtstag
    [12, 26], // 2. Weihnachtstag
  ],
  US: [
    [1, 1],   // New Year's Day
    [7, 4],   // Independence Day
    [12, 25], // Christmas
  ],
  GB: [
    [1, 1],   // New Year's Day
    [12, 25], // Christmas
    [12, 26], // Boxing Day
  ],
};

// ─── Countries that observe Easter-derived holidays ───

interface MovableHolidayConfig {
  easterMonday: boolean;   // Easter + 1
  ascension: boolean;      // Easter + 39
  whitMonday: boolean;     // Easter + 50
  goodFriday: boolean;     // Easter - 2
}

const MOVABLE_HOLIDAYS: Record<string, MovableHolidayConfig> = {
  FR: { easterMonday: true, ascension: true, whitMonday: true, goodFriday: false },
  BE: { easterMonday: true, ascension: true, whitMonday: true, goodFriday: false },
  CH: { easterMonday: true, ascension: true, whitMonday: true, goodFriday: true },
  DE: { easterMonday: true, ascension: true, whitMonday: true, goodFriday: true },
  US: { easterMonday: false, ascension: false, whitMonday: false, goodFriday: false },
  GB: { easterMonday: true, ascension: false, whitMonday: false, goodFriday: true },
};

// ─── Easter Sunday computation (Anonymous Gregorian algorithm) ───

export function easterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

// ─── Cache for computed holidays ───

const _cache = new Map<string, Set<string>>();

function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Get all holidays for a given year and country as a Set of ISO date strings.
 * Results are cached per year+country.
 */
export function getHolidaysForYear(year: number, country: string): Set<string> {
  const key = `${year}-${country}`;
  if (_cache.has(key)) return _cache.get(key)!;

  const holidays = new Set<string>();

  // Fixed holidays
  const fixed = FIXED_HOLIDAYS[country] || [];
  for (const [month, day] of fixed) {
    holidays.add(toISODate(new Date(year, month - 1, day)));
  }

  // Movable holidays (Easter-derived)
  const movable = MOVABLE_HOLIDAYS[country];
  if (movable) {
    const easter = easterSunday(year);
    const addDays = (base: Date, n: number): Date => {
      const d = new Date(base);
      d.setDate(d.getDate() + n);
      return d;
    };
    if (movable.goodFriday) holidays.add(toISODate(addDays(easter, -2)));
    if (movable.easterMonday) holidays.add(toISODate(addDays(easter, 1)));
    if (movable.ascension) holidays.add(toISODate(addDays(easter, 39)));
    if (movable.whitMonday) holidays.add(toISODate(addDays(easter, 50)));
  }

  _cache.set(key, holidays);
  return holidays;
}

/**
 * Check if a date is a non-working day (weekend or public holiday).
 */
export function isNonWorkingDay(date: Date, holidays: Set<string>): boolean {
  const day = date.getDay();
  if (day === 0 || day === 6) return true;
  return holidays.has(toISODate(date));
}

/** Available countries for the UI */
export const AVAILABLE_COUNTRIES: { code: string; label: string }[] = [
  { code: "FR", label: "France" },
  { code: "BE", label: "Belgique" },
  { code: "CH", label: "Suisse" },
  { code: "DE", label: "Allemagne" },
  { code: "US", label: "États-Unis" },
  { code: "GB", label: "Royaume-Uni" },
];
