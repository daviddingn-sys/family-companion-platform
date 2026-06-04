export type JsonResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; status: number };

export async function requestJson<T>(input: RequestInfo | URL, init?: RequestInit): Promise<JsonResult<T>> {
  let response: Response;
  try {
    response = await fetch(input, init);
  } catch {
    return { ok: false, error: "网络连接失败，请稍后重试", status: 0 };
  }

  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const error =
      payload &&
      typeof payload === "object" &&
      "error" in payload &&
      typeof payload.error === "string"
        ? payload.error
        : "请求失败，请稍后重试";
    return { ok: false, error, status: response.status };
  }

  return { ok: true, data: payload as T };
}
