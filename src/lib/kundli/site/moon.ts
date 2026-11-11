// Copied from thedivinetarotonline.com (devthedivinetarot/new-updated src/lib/astrology/moon.ts) so the app's
// Kundli Milan gives exactly the website's result. Keep in sync with the website — do not edit here alone.
/**
 * Approximate sidereal Moon position from birth date/time.
 *
 * This derives the Moon's ecliptic longitude using a truncated lunar theory
 * (largest periodic terms, after Meeus, "Astronomical Algorithms"), then
 * converts to the sidereal zodiac using the Lahiri ayanamsa. From the sidereal
 * longitude we read the Moon sign (Rashi) and lunar mansion (Nakshatra), which
 * are the inputs the classical Ashtakoota Guna Milan needs.
 *
 * Accuracy is roughly +/- 0.3-0.7 degrees, which is enough for Rashi/Nakshatra
 * on all but the few hours around a boundary crossing. Not a substitute for a
 * full ephemeris — flagged to the user accordingly.
 */

const DEG = Math.PI / 180;

function norm360(x: number): number {
  return ((x % 360) + 360) % 360;
}

/** Julian Day (UT) from a JS Date treated as UTC instant. */
export function julianDay(dateUtc: Date): number {
  return dateUtc.getTime() / 86400000 + 2440587.5;
}

/** Lahiri ayanamsa in degrees for a given Julian Day (linear approximation). */
export function lahiriAyanamsa(jd: number): number {
  const year = 2000 + (jd - 2451545.0) / 365.25;
  // ~23.85 deg at J2000, precessing ~50.29" per year.
  return 23.853 + (year - 2000) * (50.29 / 3600);
}

/** Tropical ecliptic longitude of the Moon in degrees. */
export function moonTropicalLongitude(jd: number): number {
  const T = (jd - 2451545.0) / 36525;

  // Fundamental arguments (degrees)
  const Lp = 218.3164477 + 481267.88123421 * T; // Moon mean longitude
  const D = 297.8501921 + 445267.1114034 * T;   // Mean elongation
  const M = 357.5291092 + 35999.0502909 * T;    // Sun mean anomaly
  const Mp = 134.9633964 + 477198.8675055 * T;  // Moon mean anomaly
  const F = 93.272095 + 483202.0175233 * T;     // Argument of latitude

  const d = D * DEG;
  const m = M * DEG;
  const mp = Mp * DEG;
  const f = F * DEG;

  // Largest longitude periodic terms, coefficient in degrees.
  const lon =
    Lp +
    6.288774 * Math.sin(mp) +
    1.274027 * Math.sin(2 * d - mp) +
    0.658314 * Math.sin(2 * d) +
    0.213618 * Math.sin(2 * mp) -
    0.185116 * Math.sin(m) -
    0.114332 * Math.sin(2 * f) +
    0.058793 * Math.sin(2 * d - 2 * mp) +
    0.057066 * Math.sin(2 * d - m - mp) +
    0.053322 * Math.sin(2 * d + mp) +
    0.045758 * Math.sin(2 * d - m) -
    0.040923 * Math.sin(m - mp) -
    0.034720 * Math.sin(d) -
    0.030383 * Math.sin(m + mp) +
    0.015327 * Math.sin(2 * d - 2 * f) -
    0.012528 * Math.sin(2 * f + mp) +
    0.010980 * Math.sin(2 * f - mp) +
    0.010675 * Math.sin(4 * d - mp) +
    0.010034 * Math.sin(3 * mp);

  return norm360(lon);
}

export interface MoonPosition {
  siderealLongitude: number; // 0-360, Lahiri
  rashi: number;             // 0-11 (Mesha..Meena)
  nakshatra: number;         // 0-26 (Ashwini..Revati)
  pada: number;              // 1-4
}

/** Compute sidereal Moon position for a UTC instant. */
export function moonSiderealPosition(dateUtc: Date): MoonPosition {
  const jd = julianDay(dateUtc);
  const tropical = moonTropicalLongitude(jd);
  const sidereal = norm360(tropical - lahiriAyanamsa(jd));

  const rashi = Math.floor(sidereal / 30) % 12;
  const nakSize = 360 / 27; // 13.3333 deg
  const nakshatra = Math.floor(sidereal / nakSize) % 27;
  const pada = Math.floor((sidereal % nakSize) / (nakSize / 4)) + 1;

  return { siderealLongitude: sidereal, rashi, nakshatra, pada };
}

/**
 * Build a UTC Date from local date, local time and a UTC offset in minutes.
 * e.g. IST is +330. localDate "1994-05-21", localTime "14:30".
 */
export function toUtcInstant(localDate: string, localTime: string, offsetMinutes: number): Date | null {
  const dm = /^(\d{4})-(\d{2})-(\d{2})$/.exec(localDate);
  const tm = /^(\d{1,2}):(\d{2})$/.exec(localTime || '12:00');
  if (!dm || !tm) return null;
  const [, y, mo, d] = dm;
  const [, h, mi] = tm;
  // Construct the wall-clock time as if UTC, then subtract the offset.
  const asUtc = Date.UTC(+y, +mo - 1, +d, +h, +mi, 0);
  const utcMs = asUtc - offsetMinutes * 60000;
  const date = new Date(utcMs);
  return isNaN(date.getTime()) ? null : date;
}
