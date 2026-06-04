import { bloodPressureSchema } from "@/lib/validators/blood-pressure";

type RawRow = Record<string, unknown>;

export type ParsedBloodPressureRow = {
  rowNumber: number;
  valid: boolean;
  error?: string;
  data?: {
    measuredAt: string;
    period: "morning" | "noon" | "evening" | "night";
    systolic: number;
    diastolic: number;
    pulse: number;
    note?: string;
  };
};

const aliases = {
  date: ["日期", "date", "Date", "DATE"],
  time: ["时间", "time", "Time", "TIME"],
  measuredAt: ["测量时间", "测量日期", "measured_at", "measuredAt"],
  period: ["时段", "时间段", "period", "Period"],
  systolic: ["高压", "收缩压", "systolic", "Systolic", "SYS"],
  diastolic: ["低压", "舒张压", "diastolic", "Diastolic", "DIA"],
  pulse: ["脉搏", "心率", "pulse", "Pulse", "HR"],
  note: ["备注", "note", "Note"],
};

function findColumn(columns: string[], names: string[]) {
  return names.find((name) => columns.includes(name)) ?? null;
}

function createStrictDate(year: number, month: number, day: number, hours = 0, minutes = 0, seconds = 0) {
  if (month < 1 || month > 12 || day < 1 || hours < 0 || hours > 23 || minutes < 0 || minutes > 59 || seconds < 0 || seconds > 59) {
    return null;
  }

  const date = new Date(year, month - 1, day, hours, minutes, seconds, 0);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day ||
    date.getHours() !== hours ||
    date.getMinutes() !== minutes ||
    date.getSeconds() !== seconds
  ) {
    return null;
  }

  return date;
}

function normalizeDate(value: unknown) {
  if (value == null || value === "") return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value === "number") {
    const epoch = new Date(Date.UTC(1899, 11, 30));
    return new Date(epoch.getTime() + value * 86_400_000);
  }

  const text = String(value).trim().replace(/\//g, "-");
  const match = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/);
  if (match) {
    return createStrictDate(
      Number(match[1]),
      Number(match[2]),
      Number(match[3]),
      match[4] ? Number(match[4]) : 0,
      match[5] ? Number(match[5]) : 0,
      match[6] ? Number(match[6]) : 0,
    );
  }

  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function normalizeTime(value: unknown) {
  if (value == null || value === "") return { hours: 8, minutes: 0 };
  if (typeof value === "number") {
    const totalMinutes = Math.round(value * 24 * 60);
    if (totalMinutes < 0 || totalMinutes >= 24 * 60) return null;
    return {
      hours: Math.floor(totalMinutes / 60),
      minutes: totalMinutes % 60,
    };
  }

  const match = String(value).trim().match(/(\d{1,2}):(\d{1,2})/);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;

  return {
    hours,
    minutes,
  };
}

function normalizePeriod(value: unknown, measuredAt: Date): "morning" | "noon" | "evening" | "night" {
  const text = String(value ?? "").trim();
  if (["morning", "早", "早晨", "上午"].includes(text)) return "morning";
  if (["noon", "中", "中午", "午间"].includes(text)) return "noon";
  if (["evening", "晚", "晚上", "晚间"].includes(text)) return "evening";
  if (["night", "夜", "夜间"].includes(text)) return "night";

  const hour = measuredAt.getHours();
  if (hour < 12) return "morning";
  if (hour < 17) return "noon";
  if (hour < 21) return "evening";
  return "night";
}

export function parseBloodPressureRows(rows: RawRow[]): ParsedBloodPressureRow[] {
  if (rows.length === 0) return [];

  const columns = Object.keys(rows[0] ?? {});
  const colMeasuredAt = findColumn(columns, aliases.measuredAt);
  const colDate = findColumn(columns, aliases.date);
  const colTime = findColumn(columns, aliases.time);
  const colPeriod = findColumn(columns, aliases.period);
  const colSystolic = findColumn(columns, aliases.systolic);
  const colDiastolic = findColumn(columns, aliases.diastolic);
  const colPulse = findColumn(columns, aliases.pulse);
  const colNote = findColumn(columns, aliases.note);

  if (!colSystolic || !colDiastolic || !colPulse || (!colMeasuredAt && !colDate)) {
    return [{
      rowNumber: 1,
      valid: false,
      error: "文件至少需要包含日期/测量时间、高压、低压、脉搏列",
    }];
  }

  return rows.map((row, index) => {
    const dateValue = colMeasuredAt ? row[colMeasuredAt] : row[colDate!];
    const measuredDate = normalizeDate(dateValue);
    if (!measuredDate) {
      return { rowNumber: index + 2, valid: false, error: "日期无法识别" };
    }

    if (!colMeasuredAt) {
      const time = normalizeTime(colTime ? row[colTime] : null);
      if (!time) {
        return { rowNumber: index + 2, valid: false, error: "时间无法识别" };
      }

      measuredDate.setHours(time.hours, time.minutes, 0, 0);
    }

    const payload = {
      measuredAt: measuredDate.toISOString(),
      period: normalizePeriod(colPeriod ? row[colPeriod] : null, measuredDate),
      systolic: Number(row[colSystolic]),
      diastolic: Number(row[colDiastolic]),
      pulse: Number(row[colPulse]),
      source: "excel" as const,
      status: "confirmed" as const,
      note: colNote ? String(row[colNote] ?? "").trim() : "",
    };

    const parsed = bloodPressureSchema.safeParse(payload);
    if (!parsed.success) {
      return {
        rowNumber: index + 2,
        valid: false,
        error: parsed.error.issues[0]?.message ?? "数据无效",
      };
    }

    return {
      rowNumber: index + 2,
      valid: true,
      data: {
        measuredAt: parsed.data.measuredAt,
        period: parsed.data.period,
        systolic: parsed.data.systolic,
        diastolic: parsed.data.diastolic,
        pulse: parsed.data.pulse,
        note: parsed.data.note,
      },
    };
  });
}
