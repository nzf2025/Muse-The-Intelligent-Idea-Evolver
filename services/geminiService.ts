
import { GoogleGenAI, Type, Chat } from "@google/genai";
import { Message, ArtifactResponse, ArtifactType } from "../types";

export class GeminiService {
  /**
   * 创建一个具有深度采访能力的聊天实例。
   * @param history 之前的对话历史，用于延续思考。
   */
  createInterviewChat(history: Message[] = []): Chat {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    // 将应用内的 Message 格式转换为 Gemini SDK 要求的 history 格式
    const geminiHistory = history.map(m => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.text }]
    }));

    return ai.chats.create({
      model: 'gemini-3-flash-preview',
      // 如果有历史记录，则加载历史
      history: geminiHistory.length > 0 ? geminiHistory : undefined,
      config: {
        thinkingConfig: { thinkingLevel: 'LOW' },
        systemInstruction: `
          你是一位名为“缪斯”的世界级深度访谈记者和战略顾问。
          你的目标是通过与用户的交谈，将他们破碎、原始的想法挖掘成有深度、有逻辑、有见地的成果。
          
          对话规则：
          1. 始终使用中文。
          2. 表现出极强的好奇心、专业感和洞察力。
          3. 每次只提一个问题。
          4. 如果用户是在已有成果基础上“继续深度探讨”，请针对之前的结论提出更深层的挑战或新的维度。
          5. 引导用户从执行力、社会影响、未来趋势等多个角度深入思考。
          6. 你的语气应该是儒雅、敏锐且富有启发性的。
        `,
      }
    });
  }

  /**
   * 将访谈记录合成为高质量的中文成果。
   */
  async synthesizeArtifact(
    history: Message[], 
    targetType: ArtifactType
  ): Promise<ArtifactResponse> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const typeMap = {
      'Article': '深度文章',
      'Interview': '精彩访谈录',
      'Action Plan': '行动执行方案'
    };

    const prompt = `
      基于以下访谈记录，生成一份最新的高质量 ${typeMap[targetType]}。
      
      访谈历史（包含之前的多轮对话）：
      ${history.map(m => `${m.role === 'user' ? '用户' : '缪斯'}: ${m.text}`).join('\n')}
      
      请返回一个 JSON 对象，包含：
      1. title: 一个具有吸引力、专业且深度的标题。
      2. content: ${typeMap[targetType]} 的正文内容，支持 Markdown 格式。
      3. summary: 一段精炼的摘要，概述该想法目前进化到的核心阶段。
      
      语言必须为中文。
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            content: { type: Type.STRING },
            summary: { type: Type.STRING }
          },
          required: ["title", "content", "summary"]
        },
        thinkingConfig: { thinkingLevel: 'LOW' }
      }
    });

    const jsonStr = response.text?.trim() || '{}';
    return JSON.parse(jsonStr) as ArtifactResponse;
  }
}

export const gemini = new GeminiService();
