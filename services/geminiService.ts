import { GoogleGenAI, Type, Schema } from "@google/genai";
import { TopicType } from "../types";

// Safely retrieve API key for both Node and Vite environments
const getApiKey = () => {
  try {
    // Priority 1: Vite-style env var (Standard for Vercel + Vite)
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_KEY) {
      // @ts-ignore
      return import.meta.env.VITE_API_KEY;
    }
  } catch (e) {}
  
  try {
    // Priority 2: Fallback to process.env (Standard for Node.js)
    if (typeof process !== 'undefined' && process.env && process.env.API_KEY) {
      return process.env.API_KEY;
    }
  } catch (e) {}

  return "";
};

const apiKey = getApiKey();

// Helper to check if key is configured (used by UI)
export const checkApiKey = (): boolean => {
  return !!apiKey && apiKey !== 'MISSING_KEY';
};

// Initialize the client function to ensure we use the latest key and handle initialization safely
const getClient = () => {
  const key = getApiKey();
  if (!key) {
    throw new Error("API_KEY_MISSING");
  }
  return new GoogleGenAI({ apiKey: key });
};

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
`;
};

const getPromptForTopic = (topic: TopicType, keyword: string, maxLength: number, referenceText?: string): string => {
  let basePrompt = "";
  
  if (topic === TopicType.LEARNING && referenceText) {
    // Learning Mode Logic
    basePrompt = `
      【任务模式：爆文仿写】
      请仔细分析以下【参考标题样本】的句式结构、语气强弱、用词习惯（如动词的选择、情绪词的使用）以及断句方式：
      
      === 参考样本开始 ===
      ${referenceText}
      === 参考样本结束 ===

      请模仿上述参考样本的**风格和规律**，创作 5 个新的两段式标题。
      新标题的主题/核心内容是：${keyword || "与参考样本相似的主题"}。
      
      要求：
      1. 必须保留参考样本的"爆款感"（如悬念、紧迫感）。
      2. 必须是两段式。
      3. 内容必须围绕新的主题关键词（如果提供了关键词）。
    `;
  } else {
    // Standard Mode Logic
    switch (topic) {
      case TopicType.PHONE_CLEANING:
        basePrompt = "主题：手机清理、内存不足、清理垃圾。";
        break;
      case TopicType.WECHAT_FEATURES:
        basePrompt = "主题：微信新功能、微信设置技巧、隐私保护。";
        break;
      case TopicType.BATTERY_SAVING:
        basePrompt = "主题：手机省电、电池保养、关闭耗电设置。";
        break;
      case TopicType.CAR_POLICY:
        basePrompt = "主题：车辆年检、交通新规、驾照扣分、车险政策。";
        break;
      case TopicType.CUSTOM:
        basePrompt = `主题：${keyword}。`;
        break;
    }

    if (keyword && topic !== TopicType.CUSTOM) {
      basePrompt += ` 侧重点/关键词：${keyword}。`;
    }
    
    basePrompt += ` 请生成 5 个完全不同角度、互不重复的两段式标题。`;
  }

  return `${basePrompt} 总字数必须小于等于${maxLength}字。`;
};

export const generateHeadlines = async (
  topic: TopicType,
  keyword: string,
  creativity: number,
  maxLength: number,
  referenceText?: string
): Promise<string[]> => {
  try {
    const ai = getClient(); // Get client dynamically
    const temperature = 0.6 + (creativity / 100) * 0.8; // Map 0-100 to 0.6-1.4

    const responseSchema: Schema = {
      type: Type.ARRAY,
      items: {
        type: Type.STRING,
      },
      description: "A list of generated headlines.",
    };

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: getPromptForTopic(topic, keyword, maxLength, referenceText),
      config: {
        systemInstruction: getSystemInstruction(maxLength),
        temperature: temperature,
        topK: 40,
        topP: 0.95,
        responseMimeType: "application/json",
        responseSchema: responseSchema,
      },
    });

    const text = response.text;
    if (!text) return [];
    
    // Parse the JSON response strictly
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) {
      return parsed.map(s => String(s).trim());
    }
    return [];

  } catch (error: any) {
    console.error("Headline generation failed details:", error);
    
    // Improved Error Handling for Chinese Users
    let userMessage = "未知错误";
    const errorString = error.toString().toLowerCase();
    const errorMsg = (error.message || "").toLowerCase();

    if (errorMsg.includes("api_key_missing")) {
       throw new Error("未检测到 API Key。请在 Vercel 环境变量设置中添加 VITE_API_KEY。");
    }

    if (errorString.includes("fetch failed") || errorString.includes("networkerror") || errorString.includes("failed to fetch")) {
      userMessage = "网络连接失败 (Network Error)。\n\n原因：您的浏览器无法连接到 Google API 服务器。\n解决：如果您在中国大陆，请务必开启 VPN (梯子)，并确保开启了【全局代理模式】。Vercel 部署的网页是在您的本地浏览器运行的，不是在海外服务器运行的。";
    } else if (errorString.includes("429") || errorString.includes("resource_exhausted") || errorString.includes("quota")) {
      userMessage = "调用频率超限 (429 Resource Exhausted)。\n\n原因：您的免费版 API Key 触发了 Google 的请求频率限制（您点得太快了）。\n解决：请喝口水休息一分钟再试，或者考虑在 Google Cloud 绑定账单以获取更高的配额。";
    } else if (errorString.includes("403") || errorString.includes("permission denied") || errorString.includes("api key not valid")) {
      userMessage = "API Key 无效或权限不足 (403)。\n\n原因：Key 填写错误，或者该 Key 绑定的 Google Cloud 项目没有开启 Gemini API 权限。\n解决：请检查 Vercel 环境变量 VITE_API_KEY 是否准确（不要有多余空格），或尝试重新创建一个 Key。";
    } else if (errorString.includes("503") || errorString.includes("overloaded")) {
      userMessage = "服务暂时繁忙 (503)。\n\n原因：Google 服务器繁忙。\n解决：请稍后再试。";
    } else {
      userMessage = `生成失败: ${error.message || "请检查控制台日志"}`;
    }

    throw new Error(userMessage);
  }
};