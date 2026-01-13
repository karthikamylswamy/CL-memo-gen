
import { GoogleGenAI, Type } from "@google/genai";
import { CreditMemoData, AiModelId } from "../types";
import { AVAILABLE_MODELS } from "../constants";

const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 2000;

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export const getOpenAiKey = (): string | null => {
  return localStorage.getItem('MAPLE_OPENAI_API_KEY') || (process as any).env.OPENAI_API_KEY || null;
};

async function callGemini(modelId: string, parts: any[], config?: any) {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: modelId,
    contents: [{ parts }],
    config
  });
  return response;
}

async function callOpenAI(modelId: string, messages: any[], responseFormat?: any) {
  const apiKey = getOpenAiKey();
  if (!apiKey) throw new Error("OpenAI API Key is missing.");

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: modelId,
      messages,
      response_format: responseFormat,
      temperature: 0.1
    })
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error?.message || "OpenAI request failed");
  }
  return await response.json();
}

async function callWithRetry(apiCall: () => Promise<any>, retries = MAX_RETRIES): Promise<any> {
  let lastError: any;
  for (let i = 0; i <= retries; i++) {
    try {
      return await apiCall();
    } catch (error: any) {
      lastError = error;
      const errorMsg = error?.message || (typeof error === 'string' ? error : JSON.stringify(error));
      if (errorMsg.includes("429") || errorMsg.includes("limit")) {
        if (i < retries) {
          await sleep(INITIAL_RETRY_DELAY * Math.pow(2, i));
          continue;
        }
      }
      throw error;
    }
  }
  throw lastError;
}

export const processDocumentWithAgents = async (files: File[], modelId: AiModelId): Promise<{ data: Partial<CreditMemoData>, fieldSources: Record<string, string> }> => {
  const modelConfig = AVAILABLE_MODELS.find(m => m.id === modelId) || AVAILABLE_MODELS[0];
  
  const filePromises = files.map(file => {
    return new Promise<{data: string, mimeType: string, name: string}>((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64 = (e.target?.result as string).split(',')[1];
        resolve({ data: base64, mimeType: file.type, name: file.name });
      };
      reader.readAsDataURL(file);
    });
  });

  const fileDataList = await Promise.all(filePromises);
  
  const extractData = async () => {
    const prompt = `
      Act as a Senior Syndicate Credit Officer. 
      Analyze: ${fileDataList.map(f => f.name).join(', ')}.
      
      TASK: 
      1. Extract EVERY available field for the Credit Memo. 
      2. If you see pricing (Margins, Libor/SOFR floors), commitment amounts, or specific covenant ratios (Debt/EBITDA, Interest Coverage), extract them accurately.
      3. For narrative fields (company description, recent events), provide detailed summaries.
      4. For every data point, record the source filename in fieldSources.

      Return JSON with:
      {
        "extractedData": { ... CreditMemoData structure ... },
        "fieldSources": [ { "fieldPath": "...", "sourceFile": "..." }, ... ]
      }
    `;

    if (modelConfig.provider === 'google') {
      const response = await callGemini(modelId, [
        ...fileDataList.map(f => ({ inlineData: { data: f.data, mimeType: f.mimeType } })),
        { text: prompt }
      ], {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            extractedData: { 
              type: Type.OBJECT,
              properties: {
                primaryBorrower: { type: Type.OBJECT, properties: { borrowerName: { type: Type.STRING }, group: { type: Type.STRING } } },
                purpose: { type: Type.OBJECT, properties: { businessPurpose: { type: Type.STRING } } },
                creditPosition: { type: Type.OBJECT, properties: { creditRequested: { type: Type.NUMBER }, tradingLine: { type: Type.NUMBER } } },
                financialInfo: { type: Type.OBJECT, properties: { raroc: { type: Type.OBJECT, properties: { economicRaroc: { type: Type.NUMBER } } } } },
                riskAssessment: { type: Type.OBJECT, properties: { borrowerRating: { type: Type.OBJECT, properties: { proposedBrr: { type: Type.STRING } } } } },
                facilityDetails: { type: Type.OBJECT, properties: { rates: { type: Type.OBJECT, properties: { margin: { type: Type.STRING } } } } },
                documentation: { type: Type.OBJECT, properties: { financialCovenants: { type: Type.STRING } } },
                analysis: { type: Type.OBJECT, properties: { overview: { type: Type.OBJECT, properties: { companyDesc: { type: Type.STRING } } } } }
              },
              required: ["primaryBorrower"]
            },
            fieldSources: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: { fieldPath: { type: Type.STRING }, sourceFile: { type: Type.STRING } },
                required: ["fieldPath", "sourceFile"]
              }
            }
          },
          required: ["extractedData", "fieldSources"]
        } as any
      });
      return JSON.parse(response.text || "{}");
    } else {
      const messages = [{ role: "system", content: "Senior Credit Underwriter. Return JSON." }, { role: "user", content: prompt }];
      const res = await callOpenAI(modelId, messages, { type: "json_object" });
      return JSON.parse(res.choices[0].message.content);
    }
  };

  const result = await callWithRetry(extractData);
  const extracted = result.extractedData || {};
  const rawFieldSources = result.fieldSources || [];
  
  const fieldSources: Record<string, string> = {};
  rawFieldSources.forEach((item: any) => { if (item.fieldPath) fieldSources[item.fieldPath] = item.sourceFile; });

  const synthesizeNarrative = async () => {
    const prompt = `
      Lead Credit Underwriter Final Synthesis.
      Context: ${JSON.stringify(extracted)}
      
      REQUIREMENT:
      1. Write a professional Executive Recommendation.
      2. INCLUDE A MARKDOWN TABLE of "Key Transaction Highlights" (Amount, Rate, Tenor, Key Covenant).
      3. If there are financial charts described in the source, summarize them.
      4. Use structured headers for Strength, Risks, and Mitigants.
    `;

    if (modelConfig.provider === 'google') {
      const res = await callGemini(modelId, [{ text: prompt }]);
      return res.text;
    } else {
      const res = await callOpenAI(modelId, [{ role: "user", content: prompt }]);
      return res.choices[0].message.content;
    }
  };

  const narrative = await callWithRetry(synthesizeNarrative);

  const finalData = {
    ...extracted,
    analysis: {
      ...(extracted.analysis || {}),
      justification: {
        ...(extracted.analysis?.justification || {}),
        recommendation: narrative
      }
    }
  };

  return { data: finalData, fieldSources };
};
