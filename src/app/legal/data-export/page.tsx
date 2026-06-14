export default function DataExportPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">数据导出说明</h1>
      <p className="text-sm text-muted-foreground">更新日期：2026-06-14</p>
      <p>平台支持导出血压明细表、月历版血压记录表，以及账号可访问范围内的全部数据文件。</p>
      <p>月历版血压记录表按月份生成，按星期排列，每天显示早、中、晚等时段记录，缺失日期保留为空。</p>
      <p>导出的文件可能包含敏感健康信息。请妥善保存和转发，不要将文件发送给无关人员。</p>
      <p>为保障安全，导出操作会记录操作人、时间、来源、数据范围和导出格式等日志。</p>
    </div>
  );
}
