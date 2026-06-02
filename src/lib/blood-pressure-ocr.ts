type OCRResult = {
  systolic: number | null;
  diastolic: number | null;
  pulse: number | null;
  error?: string;
};

const OCR_PROMPT = `你是一个血压计读数识别专家。请仔细观察这张血压计屏幕照片，识别以下数据：

1. 高压（收缩压）：通常显示在上方，单位 mmHg
2. 低压（舒张压）：通常显示在下方，单位 mmHg
3. 脉搏（心率）：通常带有心形或脉搏标识

请严格按以下 JSON 格式返回结果，不要返回其他内容：
{"systolic": 数字, "diastolic": 数字, "pulse": 数字}

如果无法识别某项数据，对应字段填 null。如果完全无法识别血压计屏幕，返回：
{"error": "无法识别血压数据"}`;

export function parseBloodPressureOCRResult(text: string): OCRResult {
  try {
    const jsonMatch = text.match(/\{[^{}]*\}/);
    if (!jsonMatch) {
      return { systolic: null, diastolic: null, pulse: null, error: "无法识别血压数据" };
    }

    const parsed = JSON.parse(jsonMatch[0]);
    if (parsed.error) {
      return { systolic: null, diastolic: null, pulse: null, error: String(parsed.error) };
    }

    const systolic = parsed.systolic ? Number(parsed.systolic) : null;
    const diastolic = parsed.diastolic ? Number(parsed.diastolic) : null;
    const pulse = parsed.pulse ? Number(parsed.pulse) : null;

    if (systolic && (systolic < 80 || systolic > 220)) {
      return { systolic: null, diastolic: null, pulse: null, error: "高压数值异常，请手动输入" };
    }
    if (diastolic && (diastolic < 40 || diastolic > 140)) {
      return { systolic: null, diastolic: null, pulse: null, error: "低压数值异常，请手动输入" };
    }
    if (pulse && (pulse < 35 || pulse > 200)) {
      return { systolic: null, diastolic: null, pulse: null, error: "脉搏数值异常，请手动输入" };
    }

    return { systolic, diastolic, pulse };
  } catch {
    return { systolic: null, diastolic: null, pulse: null, error: "无法识别血压数据" };
  }
}

export async function recognizeBloodPressureImage(imageUrl: string): Promise<OCRResult> {
  const apiKey = process.env.COZE_WORKLOAD_IDENTITY_API_KEY;
  if (!apiKey) {
    return { systolic: null, diastolic: null, pulse: null, error: "OCR 服务未配置" };
  }

  const response = await fetch("https://integration.coze.cn/api/v3/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "doubao-seed-2-0-pro-260215",
      temperature: 0.05,
      stream: false,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: OCR_PROMPT },
            { type: "image_url", image_url: { url: imageUrl } },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    return {
      systolic: null,
      diastolic: null,
      pulse: null,
      error: `OCR 服务调用失败: ${response.status}`,
    };
  }

  const data = await response.json();
  const responseText = data.choices?.[0]?.message?.content ?? "";
  return parseBloodPressureOCRResult(responseText);
}
