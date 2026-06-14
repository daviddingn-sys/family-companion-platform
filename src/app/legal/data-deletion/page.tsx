export default function DataDeletionPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">数据删除说明</h1>
      <p className="text-sm text-muted-foreground">更新日期：2026-06-14</p>
      <p>用户可以删除单条健康记录、家庭成员档案，或提交全部数据删除申请。删除家庭成员会同时删除该成员关联的健康数据。</p>
      <p>为防止误删，部分删除操作需要二次确认。全部数据删除申请提交后，平台会记录申请时间、账号、来源和处理状态。</p>
      <p>删除完成后，相关业务数据将不再用于平台功能展示。因安全审计、争议处理或法律要求必须保留的操作日志，可能在必要期限内继续保存。</p>
      <p>如需提交全部数据删除申请，可在平台或小程序内通过数据删除入口提交。</p>
    </div>
  );
}
