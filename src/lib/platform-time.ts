const PLATFORM_TIMEZONE_OFFSET_MINUTES = 8 * 60;
const MS_PER_MINUTE = 60_000;
const MS_PER_DAY = 86_400_000;

function toUtcIsoFromPlatformLocal({
  year,
  month,
  day,
  hours = 0,
  minutes = 0,
}: {
  year: number;
  month: number;
  day: number;
  hours?: number;
  minutes?: number;
}) {
  const utcTime =
    Date.UTC(year, month - 1, day, hours, minutes, 0, 0) -
    PLATFORM_TIMEZONE_OFFSET_MINUTES * MS_PER_MINUTE;
  return new Date(utcTime).toISOString();
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
