import { TopicType } from "../types";

// --- Configuration ---
const HOST = "hunyuan.tencentcloudapi.com";
const SERVICE = "hunyuan";
const REGION = ""; // Hunyuan is global/region-agnostic for the endpoint usually, or default
const ACTION = "ChatCompletions";
const VERSION = "2023-09-01";
const MODEL = "hunyuan-pro"; // Using the Pro model for better quality

// --- Helper: Get Keys safely ---
const getEnvVar = (key: string) => {
  // @ts-ignore
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
    // @ts-ignore
    return import.meta.env[key];
  }
  return "";
};

export const checkApiKey = (): boolean => {
  const id = getEnvVar("VITE_TENCENT_SECRET_ID");
  const key = getEnvVar("VITE_TENCENT_SECRET_KEY");
  return !!id && !!key;
};

// --- Helper: Crypto Functions for Tencent V3 Signature (Browser Native) ---
async function sha256Hex(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function hmacSha256(key: Uint8Array | string, message: string): Promise<Uint8Array> {
  const enc = new TextEncoder();
  const keyData = typeof key === "string" ? enc.encode(key) : key;
  
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  
  const signature = await crypto.subtle.sign("HMAC", cryptoKey, enc.encode(message));
  return new Uint8Array(signature);
}

function toHex(buffer: Uint8Array): string {
  return Array.from(buffer).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function getDateInfo() {
  const date = new Date();
  // Tencent requires UTC timestamp in seconds
  const timestamp = Math.floor(date.getTime() / 1000).toString();
  // YYYY-MM-DD
  const dateString = date.toISOString().split("T")[0];
  return { timestamp, dateString };
}

// --- Main: Generate Signature & Headers ---
async function getAuthorization(payload: string) {
  const secretId = getEnvVar("VITE_TENCENT_SECRET_ID");
  const secretKey = getEnvVar("VITE_TENCENT_SECRET_KEY");

  if (!secretId || !secretKey) throw new Error("TENCENT_KEY_MISSING");

  const { timestamp, dateString } = getDateInfo();

  // 1. Canonical Request
  const httpRequestMethod = "POST";
  const canonicalUri = "/";
  const canonicalQueryString = "";
  const canonicalHeaders = `content-type:application/json\nhost:${HOST}\n`;
  const signedHeaders = "content-type;host";
  const hashedRequestPayload = await sha256Hex(payload);
  
  const canonicalRequest = 
    `${httpRequestMethod}\n` +
    `${canonicalUri}\n` +
    `${canonicalQueryString}\n` +
    `${canonicalHeaders}\n` +
    `${signedHeaders}\n` +
    `${hashedRequestPayload}`;

  // 2. String to Sign
  const algorithm = "TC3-HMAC-SHA256";
  const credentialScope = `${dateString}/${SERVICE}/tc3_request`;
  const hashedCanonicalRequest = await sha256Hex(canonicalRequest);
  
  const stringToSign = 
    `${algorithm}\n` +
    `${timestamp}\n` +
    `${credentialScope}\n` +
    `${hashedCanonicalRequest}`;

  // 3. Calculate Signature
  const kSecret = new TextEncoder().encode("TC3" + secretKey);
  const kDate = await hmacSha256(kSecret, dateString);
  const kService = await hmacSha256(kDate, SERVICE);
  const kSigning = await hmacSha256(kService, "tc3_request");
  const signature = toHex(await hmacSha256(kSigning, stringToSign));

  // 4. Build Authorization Header
  const authorization = 
    `${algorithm} ` +
    `Credential=${secretId}/${credentialScope}, ` +
    `SignedHeaders=${signedHeaders}, ` +
    `Signature=${signature}`;

  return { authorization, timestamp };
}

// --- Prompt Logic (Adapted for Hunyuan) ---
const getSystemInstruction = (maxLength: number): string => {
  return `
你是一个拥有10年经验的资深新媒体主编，专门擅长写针对中老年、车主、手机用户的"爆款"推文标题。

你的任务是生成**两段式**标题，必须严格遵守以下规则：
1. **格式**：两段式，中间用空格隔开（不需符号，或用符号隔开皆可，以简短为主）。例如："微信新功能 必须知道" 或 "手机卡顿？ 一键清理"。
2. **长度**：整个标题（含标点）严格控制在**${maxLength}个汉字以内**。越短越有力。
3. **痛点**：必须直击痛点，制造悬念，或提供即时利益。
4. **去重**：因为现有标题重复度过高，请尽量使用**非常规**的动词、情绪词，避免陈词滥调（如"震惊"、"速看"这种太俗的少用，用更具体的描述）。
5. **风格**：
   - 手机清理：强调"空间不足"、"卡顿"、"垃圾多"、"误删"。
   - 微信新功能：强调"隐藏"、"一定要关"、"刚刚更新"、"方便"。
   - 手机省电：强调"耗电快"、"发烫"、"关闭设置"。
   - 车辆政策：强调"扣分"、"罚款"、"新规"、"年检"、"必看"。

请直接返回JSON格式的数组，不要包含markdown标记（如 \`\`\`json ）。
格式示例：["标题一", "标题二"]
`;
};

const getPromptForTopic = (topic: TopicType, keyword: string, referenceText?: string): string => {
  let basePrompt = "";
  
  if (topic === TopicType.LEARNING && referenceText) {
    basePrompt = `
      【任务模式：爆文仿写】
      请仔细分析以下【参考标题样本】的风格：
      === 参考开始 ===
      ${referenceText}
      === 参考结束 ===
      请模仿上述风格，创作 5 个新的两段式标题。主题关键词：${keyword || "同类主题"}。
    `;
  } else {
    switch (topic) {
      case TopicType.PHONE_CLEANING: basePrompt = "主题：手机清理、内存不足、清理垃圾。"; break;
      case TopicType.WECHAT_FEATURES: basePrompt = "主题：微信新功能、微信设置技巧、隐私保护。"; break;
      case TopicType.BATTERY_SAVING: basePrompt = "主题：手机省电、电池保养。"; break;
      case TopicType.CAR_POLICY: basePrompt = "主题：车辆年检、交通新规、驾照扣分。"; break;
      case TopicType.CUSTOM: basePrompt = `主题：${keyword}。`; break;
    }
    if (keyword && topic !== TopicType.CUSTOM) {
      basePrompt += ` 侧重点/关键词：${keyword}。`;
    }
    basePrompt += ` 请生成 5 个完全不同角度、互不重复的两段式标题。`;
  }

  return basePrompt;
};

// --- Main Export ---
export const generateHeadlines = async (
  topic: TopicType,
  keyword: string,
  creativity: number,
  maxLength: number,
  referenceText?: string
): Promise<string[]> => {
  
  const temperature = 0.5 + (creativity / 100) * 0.5; // Map to 0.5 - 1.0 (Hunyuan recommends < 1.0)
  const systemPrompt = getSystemInstruction(maxLength);
  const userPrompt = getPromptForTopic(topic, keyword, referenceText);

  // Prepare Payload
  const payloadObject = {
    Model: MODEL,
    Messages: [
      { Role: "system", Content: systemPrompt },
      { Role: "user", Content: userPrompt }
    ],
    Temperature: temperature,
    TopP: 0.8,
  };
  const payloadStr = JSON.stringify(payloadObject);

  try {
    const { authorization, timestamp } = await getAuthorization(payloadStr);

    const response = await fetch(`https://${HOST}/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Host": HOST,
        "X-TC-Action": ACTION,
        "X-TC-Version": VERSION,
        "X-TC-Timestamp": timestamp,
        "Authorization": authorization,
        // Optional: Add Region if needed, usually empty for Global/Hunyuan
      },
      body: payloadStr,
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Tencent API Error:", errText);
      try {
        const errJson = JSON.parse(errText);
        const code = errJson?.Response?.Error?.Code || "";
        const msg = errJson?.Response?.Error?.Message || "";
        
        if (code === "AuthFailure.SignatureFailure") throw new Error("SignatureFailure");
        if (code.includes("AuthFailure")) throw new Error("AuthFailure");
        if (code.includes("ResourceInsufficient")) throw new Error("QuotaExceeded");
        
        throw new Error(`${code}: ${msg}`);
      } catch (e: any) {
        if (e.message !== "SignatureFailure" && e.message !== "AuthFailure") {
           throw new Error(`HTTP Error ${response.status}`);
        }
        throw e;
      }
    }

    const data = await response.json();
    const content = data?.Response?.Choices?.[0]?.Message?.Content;

    if (!content) return [];

    // Parse JSON from the response text (Hunyuan might wrap in markdown blocks or just text)
    let cleanText = content.replace(/```json/g, "").replace(/```/g, "").trim();
    
    // Attempt to extract array
    try {
      const parsed = JSON.parse(cleanText);
      if (Array.isArray(parsed)) {
        return parsed.map((s: any) => String(s).trim());
      }
    } catch (e) {
      // If AI failed to return strict JSON, split by newlines
      return cleanText.split('\n').filter((l: string) => l.length > 2 && !l.includes("["));
    }
    
    return [];

  } catch (error: any) {
    console.error("Headline generation failed:", error);
    
    let userMessage = "未知错误";
    const errorString = error.toString();
    const errorMessage = error.message || "";

    if (errorMessage === "TENCENT_KEY_MISSING") {
      throw new Error("未检测到腾讯云密钥。请在 Vercel 环境变量中配置 VITE_TENCENT_SECRET_ID 和 VITE_TENCENT_SECRET_KEY。");
    }

    if (errorMessage === "AuthFailure" || errorString.includes("AuthFailure")) {
      userMessage = "腾讯云密钥无效 (AuthFailure)。\n\n原因：SecretId 或 SecretKey 填写错误。\n解决：请检查环境变量是否复制完整，不要有多余空格。";
    } else if (errorMessage === "SignatureFailure") {
       userMessage = "签名验证失败。\n\n原因：通常是密钥填错，或者系统时间与腾讯服务器偏差过大。";
    } else if (errorMessage === "QuotaExceeded" || errorString.includes("Payment")) {
      userMessage = "余额不足或配额用尽。\n\n原因：腾讯云账户余额不足或调用包耗尽。\n解决：请前往腾讯云控制台充值。";
    } else if (errorString.includes("Failed to fetch") || errorString.includes("NetworkError")) {
      userMessage = "跨域/网络连接失败。\n\n原因：浏览器拦截了对腾讯云的直接请求 (CORS)。\n建议：\n1. 请尝试安装 'Allow CORS' 浏览器插件进行测试。\n2. 或者使用 Vercel 的 API 代理功能 (需要修改代码结构)。";
    } else {
      userMessage = `调用失败: ${errorMessage}`;
    }

    throw new Error(userMessage);
  }
};
