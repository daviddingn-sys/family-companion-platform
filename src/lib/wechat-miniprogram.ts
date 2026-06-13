type WechatCodeSession = {
  openid: string;
  unionid?: string;
  session_key?: string;
  errcode?: number;
  errmsg?: string;
};

export function getMissingWechatMiniprogramEnvKeys() {
  return (["WECHAT_MINIPROGRAM_APPID", "WECHAT_MINIPROGRAM_SECRET"] as const).filter((key) => !process.env[key]);
}

export async function exchangeWechatMiniprogramCode(code: string) {
  const missing = getMissingWechatMiniprogramEnvKeys();
  if (missing.length > 0) {
    throw new Error(`Missing WeChat Mini Program environment variables: ${missing.join(", ")}`);
  }

  const url = new URL("https://api.weixin.qq.com/sns/jscode2session");
  url.searchParams.set("appid", process.env.WECHAT_MINIPROGRAM_APPID!);
  url.searchParams.set("secret", process.env.WECHAT_MINIPROGRAM_SECRET!);
  url.searchParams.set("js_code", code);
  url.searchParams.set("grant_type", "authorization_code");

  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`WeChat session request failed: ${response.status}`);
  }

  const data = (await response.json()) as WechatCodeSession;
  if (data.errcode) {
    throw new Error(data.errmsg || `WeChat session request failed: ${data.errcode}`);
  }
  if (!data.openid) {
    throw new Error("WeChat session response missing openid");
  }

  return data;
}
