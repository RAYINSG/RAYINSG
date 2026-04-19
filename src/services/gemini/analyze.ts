import * as FileSystem from 'expo-file-system/legacy';
import { AiAnalysisResult, ItemCategory } from '../../types';

const GEMINI_API_KEY = 'AIzaSyDHgZYQIu_nxNnDh12ICuDa68SPsIJydjE';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

const ANALYSIS_PROMPT = `
你是一個產品分析助手。請分析這張產品照片並以JSON格式回傳：
{
  "name": "產品名稱（繁體中文）",
  "description": "詳細描述：顏色、包裝材質、形狀、大小、品牌",
  "category": "food 或 health 或 voucher 或 medicine 或 cosmetic 或 other 其中一個",
  "estimatedExpiry": "如果能看到到期日請填寫 YYYY-MM-DD 格式，否則填 null",
  "colors": ["主要顏色1", "主要顏色2"],
  "rawText": "照片上看到的所有文字"
}
只回傳JSON，不要其他說明文字或markdown格式。
`;

export async function analyzeProductImage(photoUri: string): Promise<AiAnalysisResult> {
  if (GEMINI_API_KEY === 'YOUR_GEMINI_API_KEY') {
    throw new Error('Gemini API Key 尚未設定');
  }

  const base64 = await FileSystem.readAsStringAsync(photoUri, {
    encoding: 'base64' as any,
  });

  const body = {
    contents: [
      {
        parts: [
          { text: ANALYSIS_PROMPT },
          {
            inline_data: {
              mime_type: 'image/jpeg',
              data: base64,
            },
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 1024,
    },
  };

  const response = await fetch(GEMINI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errBody = await response.text();
    if (response.status === 400) throw new Error('圖片格式不支援，請重新拍攝');
    if (response.status === 403) throw new Error('API Key 無效，請確認設定');
    if (response.status === 429) throw new Error('請求次數過多，請稍後再試');
    throw new Error(`分析失敗 (${response.status})`);
  }

  const json = await response.json();
  const text: string = json.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}';

  const cleaned = text.replace(/```json\n?|```\n?/g, '').trim();

  let parsed: any = {};
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error('AI 回應格式異常，請重新拍攝');
  }

  return {
    name: parsed.name ?? '未知產品',
    description: parsed.description ?? '',
    category: (parsed.category as ItemCategory) ?? 'other',
    estimatedExpiry: parsed.estimatedExpiry ?? null,
    colors: parsed.colors ?? [],
    rawText: parsed.rawText ?? '',
  };
}
