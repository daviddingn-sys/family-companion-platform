import * as XLSX from "xlsx-js-style";
import { formatPlatformDateTime } from "@/lib/platform-time";

export const MAX_BLOOD_PRESSURE_EXPORT_ROWS = 5000;
const WEEKDAY_HEADERS = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"];
const PERIOD_LABELS: Record<string, string> = {
  morning: "早",
  noon: "中",
  evening: "晚",
  night: "夜",
};

export type BloodPressureExportRecord = {
  measured_at: string;
  period: string;
  systolic: number;
  diastolic: number;
  pulse: number | null;
  source: string;
  status: string;
  note: string | null;
};

export function csvEscape(value: unknown) {
  const text = String(value ?? "");
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export function currentPlatformMonth() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date());
  const byType = new Map(parts.map((part) => [part.type, part.value]));
  return `${byType.get("year")}-${byType.get("month")}`;
}

function getPlatformDateKey(value: string | Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(value));
  const byType = new Map(parts.map((part) => [part.type, part.value]));
  return `${byType.get("year")}-${byType.get("month")}-${byType.get("day")}`;
}

export function createAttachmentHeaders(contentType: string, fileName: string) {
  const encoded = encodeURIComponent(fileName);
  return {
    "Content-Type": contentType,
    "Content-Disposition": `attachment; filename="${encoded}"; filename*=UTF-8''${encoded}`,
  };
}

export function createCalendarWorksheet(records: BloodPressureExportRecord[], month: string) {
  const [yearText, monthText] = month.split("-");
  const year = Number(yearText);
  const monthNumber = Number(monthText);
  const daysInMonth = new Date(year, monthNumber, 0).getDate();
  const firstWeekday = new Date(year, monthNumber - 1, 1).getDay();
  const byDay = new Map<string, Partial<Record<string, BloodPressureExportRecord>>>();

  for (const record of records) {
    const dayKey = getPlatformDateKey(record.measured_at);
    const periods = byDay.get(dayKey) ?? {};
    periods[record.period] = record;
    byDay.set(dayKey, periods);
  }

  const title = `${year}年${monthNumber}月血压记录表`;
  const rows: string[][] = [[title], WEEKDAY_HEADERS];

  for (let week = 0; week < 6; week += 1) {
    const row: string[] = [];
    for (let weekday = 0; weekday < 7; weekday += 1) {
      const index = week * 7 + weekday;
      const day = index - firstWeekday + 1;
      if (day < 1 || day > daysInMonth) {
        row.push("");
        continue;
      }

      const dayKey = `${month}-${String(day).padStart(2, "0")}`;
      const periods = byDay.get(dayKey);
      const lines = [String(day)];
      for (const period of ["morning", "noon", "evening", "night"]) {
        const record = periods?.[period];
        if (!record) continue;
        const label = PERIOD_LABELS[period] ?? period;
        const pulseText = record.pulse ? ` 脉：${record.pulse}` : "";
        lines.push(`${label}：${record.systolic}/${record.diastolic}${pulseText}`);
      }
      const dayRecords = Object.values(periods ?? {}).filter((record): record is BloodPressureExportRecord => Boolean(record));
      const notes = Array.from(new Set(dayRecords.map((record) => record.note).filter(Boolean)));
      if (notes.length > 0) {
        lines.push(`备注：${notes.join("；")}`);
      }
      row.push(lines.join("\n"));
    }
    rows.push(row);
  }

  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  worksheet["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 6 } }];
  worksheet["!cols"] = Array.from({ length: 7 }, () => ({ wch: 22 }));
  worksheet["!rows"] = [{ hpt: 30 }, { hpt: 24 }, ...Array.from({ length: 6 }, () => ({ hpt: 96 }))];
  worksheet["!freeze"] = { xSplit: 0, ySplit: 2 };
  worksheet["!pageSetup"] = { orientation: "landscape", fitToWidth: 1, fitToHeight: 1 };

  for (const cellAddress of Object.keys(worksheet)) {
    if (cellAddress.startsWith("!")) continue;
    worksheet[cellAddress].s = {
      alignment: { vertical: "top", wrapText: true },
      border: {
        top: { style: "thin", color: { rgb: "999999" } },
        bottom: { style: "thin", color: { rgb: "999999" } },
        left: { style: "thin", color: { rgb: "999999" } },
        right: { style: "thin", color: { rgb: "999999" } },
      },
    };
  }

  if (worksheet.A1) {
    worksheet.A1.s = {
      font: { bold: true, sz: 18 },
      alignment: { horizontal: "center", vertical: "center" },
    };
  }

  for (let column = 0; column < 7; column += 1) {
    const address = XLSX.utils.encode_cell({ r: 1, c: column });
    if (!worksheet[address]) continue;
    worksheet[address].s = {
      font: { bold: true, color: { rgb: "FFFFFF" } },
      fill: { fgColor: { rgb: "666666" } },
      alignment: { horizontal: "center", vertical: "center" },
      border: {
        top: { style: "thin", color: { rgb: "999999" } },
        bottom: { style: "thin", color: { rgb: "999999" } },
        left: { style: "thin", color: { rgb: "999999" } },
        right: { style: "thin", color: { rgb: "999999" } },
      },
    };
  }

  return worksheet;
}

export function createCalendarWorkbookBuffer(records: BloodPressureExportRecord[], month: string) {
  const workbook = XLSX.utils.book_new();
  const worksheet = createCalendarWorksheet(records, month);
  XLSX.utils.book_append_sheet(workbook, worksheet, month);
  return XLSX.write(workbook, {
    bookType: "xlsx",
    type: "buffer",
    cellStyles: true,
  }) as Buffer;
}

export function createDetailWorkbookBuffer(records: BloodPressureExportRecord[]) {
  const header = ["测量时间", "时段", "高压", "低压", "脉搏", "来源", "状态", "备注"];
  const rows = records.map((record) => [
    formatPlatformDateTime(record.measured_at),
    record.period,
    record.systolic,
    record.diastolic,
    record.pulse,
    record.source,
    record.status,
    record.note ?? "",
  ]);
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.aoa_to_sheet([header, ...rows]);
  XLSX.utils.book_append_sheet(workbook, worksheet, "血压记录");
  return XLSX.write(workbook, { bookType: "xlsx", type: "buffer" }) as Buffer;
}

export function createDetailCsv(records: BloodPressureExportRecord[]) {
  const header = ["测量时间", "时段", "高压", "低压", "脉搏", "来源", "状态", "备注"];
  const rows = records.map((record) => [
    formatPlatformDateTime(record.measured_at),
    record.period,
    record.systolic,
    record.diastolic,
    record.pulse,
    record.source,
    record.status,
    record.note ?? "",
  ]);
  return "\uFEFF" + [header, ...rows].map((row) => row.map(csvEscape).join(",")).join("\n");
}
