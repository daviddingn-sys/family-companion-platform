const PLATFORM_TIMEZONE_OFFSET_MINUTES = 8 * 60;
const PLATFORM_TIMEZONE = "Asia/Shanghai";
const MS_PER_MINUTE = 60_000;
const MS_PER_DAY = 86_400_000;

function toUtcIsoFromPlatformLocal({
  year,
  month,
  day,
  hours = 0,
  minutes = 0,
  seconds = 0,
}: {
  year: number;
  month: number;
  day: number;
  hours?: number;
  minutes?: number;
  seconds?: number;
}) {
  const utcTime =
    Date.UTC(year, month - 1, day, hours, minutes, seconds, 0) -
    PLATFORM_TIMEZONE_OFFSET_MINUTES * MS_PER_MINUTE;
  return new Date(utcTime).toISOString();
}

export function platformLocalDateTimePartsToUtcIso({
  year,
  month,
  day,
  hours = 0,
  minutes = 0,
  seconds = 0,
}: {
  year: number;
  month: number;
  day: number;
  hours?: number;
  minutes?: number;
  seconds?: number;
}) {
  const probe = new Date(Date.UTC(year, month - 1, day, hours, minutes, seconds, 0));
  if (
    probe.getUTCFullYear() !== year ||
    probe.getUTCMonth() !== month - 1 ||
    probe.getUTCDate() !== day ||
    probe.getUTCHours() !== hours ||
    probe.getUTCMinutes() !== minutes ||
    probe.getUTCSeconds() !== seconds
  ) {
    return null;
  }

  return toUtcIsoFromPlatformLocal({ year, month, day, hours, minutes, seconds });
}

export function platformLocalDateStartToUtcIso(date: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) return null;

  return toUtcIsoFromPlatformLocal({
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  });
}

export function platformLocalDateEndExclusiveToUtcIso(date: string) {
  const start = platformLocalDateStartToUtcIso(date);
  if (!start) return null;

  return new Date(new Date(start).getTime() + MS_PER_DAY).toISOString();
}

export function platformLocalMinuteToUtcIso(value?: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})$/.exec(value?.trim() ?? "");
  if (!match) return null;

  return toUtcIsoFromPlatformLocal({
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
    hours: Number(match[4]),
    minutes: Number(match[5]),
  });
}

export function platformLocalMonthRangeToUtcIso(month: string) {
  const match = /^(\d{4})-(\d{2})$/.exec(month);
  if (!match) return null;

  const year = Number(match[1]);
  const monthNumber = Number(match[2]);
  if (monthNumber < 1 || monthNumber > 12) return null;

  const start = toUtcIsoFromPlatformLocal({ year, month: monthNumber, day: 1 });
  const end = toUtcIsoFromPlatformLocal({ year, month: monthNumber + 1, day: 1 });
  return { start, end };
}

export function formatPlatformDateTime(value: string | Date) {
  return new Date(value).toLocaleString("zh-CN", { timeZone: PLATFORM_TIMEZONE });
}

function getPlatformDateTimeParts(value: string | Date) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: PLATFORM_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const byType = new Map(parts.map((part) => [part.type, part.value]));
  const year = byType.get("year");
  const month = byType.get("month");
  const day = byType.get("day");
  const hour = byType.get("hour");
  const minute = byType.get("minute");
  if (!year || !month || !day || !hour || !minute) return null;

  return { year, month, day, hour, minute };
}

export function formatPlatformLocalMinuteInput(value: string | Date = new Date()) {
  const parts = getPlatformDateTimeParts(value);
  if (!parts) return "";
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

export function getCurrentPlatformHour() {
  const parts = getPlatformDateTimeParts(new Date());
  return parts ? Number(parts.hour) : new Date().getHours();
}
