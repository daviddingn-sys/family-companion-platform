type BloodPressureRecord = {
  systolic: number;
  diastolic: number;
  pulse: number;
  status: string;
};

function average(values: number[]) {
  if (values.length === 0) return null;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

export function summarizeBloodPressure(records: BloodPressureRecord[]) {
  const confirmed = records.filter((record) => record.status === "confirmed");
  const highCount = confirmed.filter(
    (record) => record.systolic >= 140 || record.diastolic >= 90,
  ).length;
  const lowCount = confirmed.filter(
    (record) => record.systolic < 90 || record.diastolic < 60,
  ).length;

  return {
    totalCount: records.length,
    confirmedCount: confirmed.length,
    pendingCount: records.length - confirmed.length,
    highCount,
    lowCount,
    systolicAvg: average(confirmed.map((record) => record.systolic)),
    diastolicAvg: average(confirmed.map((record) => record.diastolic)),
    pulseAvg: average(confirmed.map((record) => record.pulse)),
  };
}
