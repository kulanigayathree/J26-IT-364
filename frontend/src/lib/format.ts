/**
 * Display formatting. The API sends timestamps as ISO 8601 UTC and coordinates as WGS84 lon/lat;
 * the UI always shows times in UTC (marked "UTC") so agencies compare like with like.
 */

const dateTime = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  timeZone: 'UTC',
});

const dateOnly = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});

const monthYear = new Intl.DateTimeFormat('en-GB', {
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});

/** "18 Oct 2026, 06:40 UTC" */
export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : `${dateTime.format(d)} UTC`;
}

/** "18 Oct 2026" */
export function formatDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : dateOnly.format(d);
}

/** "2026-09" → "Sep 2026" */
export function formatMonth(yearMonth: string): string {
  const d = new Date(`${yearMonth}-01T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? yearMonth : monthYear.format(d);
}

/** "2 h ago", "3 d ago" */
export function formatRelative(iso: string, now: Date = new Date()): string {
  const minutes = Math.round((now.getTime() - new Date(iso).getTime()) / 60000);
  if (Number.isNaN(minutes)) return '—';
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `${hours} h ago`;
  return `${Math.round(hours / 24)} d ago`;
}

/** lat/lon in degrees → "6.42° N, 79.61° E" */
export function formatLatLon(lat: number, lon: number, digits = 2): string {
  const ns = lat >= 0 ? 'N' : 'S';
  const ew = lon >= 0 ? 'E' : 'W';
  return `${Math.abs(lat).toFixed(digits)}° ${ns}, ${Math.abs(lon).toFixed(digits)}° ${ew}`;
}

/** GeoJSON position [lon, lat] → "6.42° N, 79.61° E" */
export function formatPosition(position: number[], digits = 2): string {
  const [lon = 0, lat = 0] = position;
  return formatLatLon(lat, lon, digits);
}

export function formatNumber(value: number, digits = 0): string {
  return value.toLocaleString('en-GB', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

/** 0.82 → "82%" */
export function formatPercent(fraction: number, digits = 0): string {
  return `${(fraction * 100).toFixed(digits)}%`;
}

/** YYYY-MM-DD for <input type="date"> (UTC). */
export function toDateInput(date: Date): string {
  return date.toISOString().slice(0, 10);
}
