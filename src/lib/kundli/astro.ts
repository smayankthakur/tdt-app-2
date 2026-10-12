/**
 * Low-level astronomy helpers for Vedic (sidereal) calculations.
 *
 * Pure functions, no React / Node-only APIs — safe for Hermes, React Native and web.
 * Moon positions come from astronomy-engine (pure JS ephemeris, arc-second level).
 */
import { EclipticGeoMoon } from 'astronomy-engine';

export type BirthInput = {
  year: number;
  /** 1-12 */
  month: number;
  day: number;
  /** 0-23, local civil time */
  hour: number;
  minute: number;
  /** Local UTC offset in hours, e.g. 5.5 for IST, 5.75 for Nepal, -5 for New York (EST). */
  tzOffsetHours: number;
};

const J2000_MS = Date.UTC(2000, 0, 1, 12, 0, 0); // JD 2451545.0
const MS_PER_DAY = 86_400_000;
const DEG = Math.PI / 180;

/** Normalise an angle to [0, 360). */
export function norm360(deg: number): number {
  const r = deg % 360;
  return r < 0 ? r + 360 : r;
}

/** Julian centuries since J2000.0 (UT used as an approximation of TT; ~1 min difference is irrelevant here). */
function centuriesSinceJ2000(date: Date): number {
  return (date.getTime() - J2000_MS) / MS_PER_DAY / 36525;
}

/**
 * IAU 2006 (Capitaine et al. 2003) general precession in longitude p_A, in arc-seconds,
 * for T Julian centuries from J2000.0.
 */
function generalPrecessionArcsec(T: number): number {
  return (
    ((((-0.0000000383 * T - 0.000023857) * T + 0.00007964) * T + 1.1054348) * T + 5028.796195) * T
  );
}

/**
 * Lahiri (Chitrapaksha) reference: the Indian Calendar Reform Committee value as used by the
 * Swiss Ephemeris (SE_SIDM_LAHIRI): mean ayanamsa 23.245524743° at JD 2435553.5 (1956-09-22).
 * (That is the published true value 23°15'00.658" minus nutation 0.004658035°.)
 */
const LAHIRI_EPOCH_T = (2435553.5 - 2451545.0) / 36525;
const LAHIRI_EPOCH_AYANAMSA = 23.250182778 - 0.004658035;

/**
 * Mean Lahiri / Chitrapaksha ayanamsa in degrees (without nutation).
 *
 * ayanamsa(t) = 23.245524743° + [p_A(t) − p_A(1956-09-22)] / 3600
 * where p_A is the IAU 2006 general precession in longitude (≈ 50.29″/year).
 * Gives ≈ 23.857° (23°51′25″) at J2000.0 and ≈ 24.19° in 2024. Within ~0.005° of the
 * classic polynomial 22.460148 + 1.396042·T + 0.000308·T² (T = centuries from 1900).
 */
export function lahiriAyanamsa(date: Date): number {
  const T = centuriesSinceJ2000(date);
  return (
    LAHIRI_EPOCH_AYANAMSA +
    (generalPrecessionArcsec(T) - generalPrecessionArcsec(LAHIRI_EPOCH_T)) / 3600
  );
}

/**
 * Nutation in longitude Δψ in degrees (IAU 1980 leading terms, ~0.5″ accuracy; Meeus ch. 22).
 * Needed because astronomy-engine's ecliptic longitude is referred to the TRUE equinox of date,
 * while the Lahiri ayanamsa above is a MEAN quantity.
 */
export function nutationInLongitude(date: Date): number {
  const T = centuriesSinceJ2000(date);
  const omega = (125.04452 - 1934.136261 * T) * DEG;
  const L = (280.4665 + 36000.7698 * T) * DEG;
  const Lm = (218.3165 + 481267.8813 * T) * DEG;
  const arcsec =
    -17.2 * Math.sin(omega) - 1.32 * Math.sin(2 * L) - 0.23 * Math.sin(2 * Lm) + 0.21 * Math.sin(2 * omega);
  return arcsec / 3600;
}

/** Geocentric ecliptic longitude of the Moon, true equinox & ecliptic of date (tropical), degrees. */
export function moonTropicalLongitude(dateUtc: Date): number {
  return norm360(EclipticGeoMoon(dateUtc).lon);
}

/**
 * Sidereal (Lahiri) geocentric longitude of the Moon in degrees, 0–360.
 *
 * sidereal = apparent tropical longitude of date − (mean Lahiri ayanamsa + Δψ)
 * i.e. the "true" ayanamsa is subtracted so nutation cancels — the same convention as
 * Swiss Ephemeris sidereal mode (used by most panchang software).
 */
export function moonSiderealLongitude(dateUtc: Date): number {
  const tropical = moonTropicalLongitude(dateUtc);
  return norm360(tropical - lahiriAyanamsa(dateUtc) - nutationInLongitude(dateUtc));
}

/**
 * Convert a local civil birth date/time + UTC offset into a UTC Date.
 * Handles years < 100 correctly (unlike the Date.UTC shortcut).
 */
export function birthToUtc(input: BirthInput): Date {
  const { year, month, day, hour, minute, tzOffsetHours } = input;
  const d = new Date(0);
  d.setUTCFullYear(year, month - 1, day);
  d.setUTCHours(hour, minute, 0, 0);
  return new Date(d.getTime() - Math.round(tzOffsetHours * 3_600_000));
}
