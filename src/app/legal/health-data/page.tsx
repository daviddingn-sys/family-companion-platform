export default function HealthDataPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">健康数据说明</h1>
      <p className="text-sm text-muted-foreground">更新日期：2026-06-14</p>
      <p>平台当前主要支持血压、用药、提醒、异常事件和健康报告等数据管理。后续如新增血糖等数据类型，会继续按家庭成员维度隔离保存。</p>
      <p>血压记录包括测量时间、时段、高压、低压、脉搏、备注、来源和操作人等信息。每条记录会关联到具体家庭和具体家庭成员。</p>
      <p>平台可能根据录入值给出偏高、偏低或极端值提醒。提醒仅用于帮助用户复测、关注变化或咨询医生，不代表诊断结果。</p>
      <p>用户应避免录入与健康管理无关的敏感信息。多人共同管理家庭数据时，应确保相关家庭成员知情并同意。</p>
    </div>
  );
}
