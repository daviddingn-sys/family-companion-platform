const AI_HEALTH_SUMMARY_MODEL = "doubao-seed-2-0-pro-260215";

type HealthReportForSummary = {
  title: string;
  summary: string;
  stats: unknown;
};

function buildFallbackSummary(report: HealthReportForSummary) {
  return [
    "本总结基于已生成的健康报告自动整理，暂未调用 AI 服务。",
    "",
    report.summary,
    "",
    "建议家庭成员结合老人实际状态持续观察；如出现持续异常、明显不适或紧急情况，应及时联系医生或急救服务。",
  ].join("\n");
}

function buildPrompt(report: HealthReportForSummary) {
  return `你是家庭健康陪伴平台的健康数据总结助手。请基于以下报告内容，生成一段给家庭成员看的中文健康总结。

要求：
1. 不做诊断，不替代医生建议。
2. 用清晰、克制、可执行的语言。
3. 输出四段：整体情况、需要关注、家庭行动建议、就医提醒。
4. 不要编造报告里没有的数据。

报告标题：
${report.title}

规则化摘要：
${report.summary}

统计数据 JSON：
${JSON.stringify(report.stats)}`;
}

export async function generateAiHealthSummary(report: HealthReportForSummary) {
  const apiKey = process.env.COZE_WORKLOAD_IDENTITY_API_KEY;

  if (!apiKey) {
    return {
      summary: buildFallbackSummary(report),
      model: "rule_fallback",
      usedAi: false,
    };
  }

  try {
    const response = await fetch("https://integration.coze.cn/api/v3/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: AI_HEALTH_SUMMARY_MODEL,
        temperature: 0.2,
        stream: false,
        messages: [
          {
            role: "user",
            content: buildPrompt(report),
          },
        ],
      }),
    });

    if (!response.ok) {
      return {
        summary: buildFallbackSummary(report),
        model: "rule_fallback",
        usedAi: false,
      };
    }

    const data = await response.json();
    const content = String(data.choices?.[0]?.message?.content ?? "").trim();
    if (!content) {
      return {
        summary: buildFallbackSummary(report),
        model: "rule_fallback",
        usedAi: false,
      };
    }

    return {
      summary: content,
      model: AI_HEALTH_SUMMARY_MODEL,
      usedAi: true,
    };
  } catch {
    return {
      summary: buildFallbackSummary(report),
      model: "rule_fallback",
      usedAi: false,
    };
  }
}
