const AI_COMPANION_MODEL = "doubao-seed-2-0-pro-260215";

type CompanionMessageContext = {
  elderName: string;
  userMessage: string;
  recentMessages: Array<{
    role: string;
    content: string;
  }>;
};

function fallbackReply({ elderName, userMessage }: CompanionMessageContext) {
  const trimmed = userMessage.trim();
  if (trimmed.includes("血压")) {
    return `${elderName}，我已经看到你提到了血压。可以先把今天的血压记录下来，如果连续偏高、偏低或身体不舒服，建议让家人一起关注并及时联系医生。`;
  }

  if (trimmed.includes("吃药") || trimmed.includes("用药")) {
    return `${elderName}，用药这件事最好按医生交代的时间和剂量来。你可以让家人在平台里补充用药记录和提醒，方便一起照看。`;
  }

  return `${elderName}，我在这里陪你。你可以说说今天身体感觉怎么样，或者让家人帮你记录血压、用药和需要提醒的事情。`;
}

function buildPrompt({ elderName, userMessage, recentMessages }: CompanionMessageContext) {
  const history = recentMessages
    .slice(-8)
    .map((message) => `${message.role === "assistant" ? "吾伴AI" : "用户"}：${message.content}`)
    .join("\n");

  return `你是家庭陪伴平台里的“吾伴AI”，面向老人和家庭成员提供温和、简短、克制的陪伴回应。

边界：
1. 不做医学诊断，不替代医生。
2. 遇到胸痛、呼吸困难、意识异常、血压极高等紧急情况，应建议立即联系家人和急救。
3. 回答要像陪伴者，不要像营销客服。
4. 每次回复不超过 120 个中文字符。

老人姓名：${elderName}

最近对话：
${history || "暂无"}

用户最新消息：
${userMessage}`;
}

export async function generateCompanionReply(context: CompanionMessageContext) {
  const apiKey = process.env.COZE_WORKLOAD_IDENTITY_API_KEY;
  if (!apiKey) {
    return {
      reply: fallbackReply(context),
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
        model: AI_COMPANION_MODEL,
        temperature: 0.4,
        stream: false,
        messages: [
          {
            role: "user",
            content: buildPrompt(context),
          },
        ],
      }),
    });

    if (!response.ok) {
      return {
        reply: fallbackReply(context),
        model: "rule_fallback",
        usedAi: false,
      };
    }

    const data = await response.json();
    const reply = String(data.choices?.[0]?.message?.content ?? "").trim();
    if (!reply) {
      return {
        reply: fallbackReply(context),
        model: "rule_fallback",
        usedAi: false,
      };
    }

    return {
      reply,
      model: AI_COMPANION_MODEL,
      usedAi: true,
    };
  } catch {
    return {
      reply: fallbackReply(context),
      model: "rule_fallback",
      usedAi: false,
    };
  }
}
