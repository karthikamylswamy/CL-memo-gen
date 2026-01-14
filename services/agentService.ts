
import { GoogleGenAI, Type, GenerateContentResponse, Modality } from "@google/genai";
import { CreditMemoData, AiModelId, SourceFile } from "../types";
import { AVAILABLE_MODELS } from "../constants";

const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 2000;

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Robust key resolution for OpenAI.
 */
export const getOpenAiKey = (): string | null => {
  return localStorage.getItem('MAPLE_OPENAI_API_KEY') || (process as any).env.OPENAI_API_KEY || null;
};

/**
 * Unified AI Request Interface to make all functions model/provider agnostic.
 */
async function generateAIResponse(params: {
  modelId: AiModelId;
  prompt: string;
  files?: { data: string; mimeType: string }[];
  jsonSchema?: any;
  systemInstruction?: string;
  useThinking?: boolean;
}) {
  const modelConfig = AVAILABLE_MODELS.find(m => m.id === params.modelId) || AVAILABLE_MODELS[0];
  
  if (modelConfig.provider === 'google') {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
    
    const parts: any[] = [];
    if (params.files) {
      params.files.forEach(f => {
        parts.push({ inlineData: { data: f.data, mimeType: f.mimeType } });
      });
    }
    parts.push({ text: params.prompt });

    const config: any = {
      systemInstruction: params.systemInstruction,
    };

    if (params.jsonSchema) {
      config.responseMimeType = "application/json";
      config.responseSchema = params.jsonSchema;
    }

    // Apply thinking budget for Gemini 3 Pro if requested (for complex synthesis)
    if (params.useThinking && params.modelId === 'gemini-3-pro-preview') {
      config.thinkingConfig = { thinkingBudget: 32768 };
    }

    const response = await ai.models.generateContent({
      model: params.modelId,
      contents: [{ parts }],
      config
    });

    return {
      text: response.text || '',
      raw: response
    };

  } else {
    // OpenAI Provider
    const apiKey = getOpenAiKey();
    if (!apiKey) throw new Error("OpenAI API Key is missing. Please configure it in System Settings.");

    const messages: any[] = [];
    if (params.systemInstruction) {
      messages.push({ role: "system", content: params.systemInstruction });
    }

    const userContent: any[] = [{ type: "text", text: params.prompt }];
    
    if (params.files) {
      params.files.forEach(f => {
        if (f.mimeType.startsWith('image/')) {
          userContent.push({
            type: "image_url",
            image_url: { url: `data:${f.mimeType};base64,${f.data}` }
          });
        }
      });
    }

    messages.push({ role: "user", content: userContent });

    const body: any = {
      model: params.modelId,
      messages,
      temperature: 0.1
    };

    if (params.jsonSchema) {
      body.response_format = { type: "json_object" };
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error?.message || "OpenAI request failed");
    }

    const result = await response.json();
    return {
      text: result.choices[0].message.content,
      raw: result
    };
  }
}

async function callWithRetry(apiCall: () => Promise<any>, retries = MAX_RETRIES): Promise<any> {
  let lastError: any;
  for (let i = 0; i <= retries; i++) {
    try {
      return await apiCall();
    } catch (error: any) {
      lastError = error;
      const errorMsg = error?.message || (typeof error === 'string' ? error : JSON.stringify(error));
      if (errorMsg.includes("429") || errorMsg.includes("RESOURCE_EXHAUSTED") || errorMsg.includes("limit")) {
        if (i < retries) {
          const delay = INITIAL_RETRY_DELAY * Math.pow(2, i);
          await sleep(delay);
          continue;
        }
      }
      throw error;
    }
  }
  throw lastError;
}

/**
 * Agnostic agent orchestration for document processing.
 */
export const processDocumentWithAgents = async (files: File[], modelId: AiModelId): Promise<{ data: Partial<CreditMemoData>, fieldSources: Record<string, string> }> => {
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
    const extractionPrompt = `
      Act as a Senior Syndicate Credit Officer. Analyze documents: ${fileDataList.map(f => f.name).join(', ')}.
      Extract Borrower info, credit Requested, Present Position, Risk Ratings (BRR, Analyst, Policy), 
      Public Ratings (Moody's, S&P, Fitch), Facility Terms, and all Covenants (Positive, Negative, Financial, Reporting, Funding).
      Identify the 'sourceFile' for every extracted value.
      Return JSON: { "extractedData": StructuredMemoData, "fieldSources": [{ "fieldPath": string, "sourceFile": string }] }
    `;

    const result = await generateAIResponse({
      modelId,
      prompt: extractionPrompt,
      files: fileDataList,
      jsonSchema: {
        type: Type.OBJECT,
        properties: {
          extractedData: { 
            type: Type.OBJECT,
            properties: {
              primaryBorrower: { type: Type.OBJECT, properties: { borrowerName: { type: Type.STRING }, originatingOffice: { type: Type.STRING }, group: { type: Type.STRING }, accountClassification: { type: Type.STRING } } },
              creditPosition: { type: Type.OBJECT, properties: { presentPosition: { type: Type.NUMBER }, creditRequested: { type: Type.NUMBER } } },
              riskAssessment: {
                type: Type.OBJECT,
                properties: {
                  borrowerRating: { type: Type.OBJECT, properties: { proposedBrr: { type: Type.STRING }, currentBrr: { type: Type.STRING }, riskAnalyst: { type: Type.STRING } } },
                  publicRatings: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { agency: { type: Type.STRING }, issuerRating: { type: Type.STRING }, outlook: { type: Type.STRING } } } }
                }
              },
              documentation: { type: Type.OBJECT, properties: { financialCovenants: { type: Type.STRING }, negativeCovenants: { type: Type.STRING }, positiveCovenants: { type: Type.STRING }, reportingReqs: { type: Type.STRING }, fundingConditions: { type: Type.STRING } } }
            },
            required: ["primaryBorrower"]
          },
          fieldSources: {
            type: Type.ARRAY,
            items: { type: Type.OBJECT, properties: { fieldPath: { type: Type.STRING }, sourceFile: { type: Type.STRING } } }
          }
        },
        required: ["extractedData", "fieldSources"]
      }
    });

    return JSON.parse(result.text);
  };

  const extractionResult = await callWithRetry(extractData);
  const extracted = extractionResult.extractedData || {};
  const rawFieldSources = extractionResult.fieldSources || [];
  
  const fieldSources: Record<string, string> = {};
  rawFieldSources.forEach((item: any) => {
    if (item.fieldPath && item.sourceFile) fieldSources[item.fieldPath] = item.sourceFile;
  });

  const synthesizeNarrative = async () => {
    const synthesisPrompt = `
      Underwriter synthesis. Context: ${JSON.stringify(extracted)}.
      1. Write professional detailed executive recommendation.
      2. Use Markdown Tables for key deal terms.
      3. Reference exhibits: ![Description](FILENAME).
      4. Focus on risk mitigation and fundamental credit strength.
    `;

    const result = await generateAIResponse({
      modelId,
      prompt: synthesisPrompt,
      files: fileDataList,
      useThinking: true // Enable advanced reasoning for synthesis
    });
    return result.text;
  };

  const narrative = await callWithRetry(synthesizeNarrative);

  const finalData = {
    ...extracted,
    analysis: {
      ...extracted.analysis,
      justification: {
        ...extracted.analysis?.justification,
        recommendation: narrative
      }
    }
  };

  return { data: finalData, fieldSources };
};

/**
 * Agnostic chat orchestration.
 */
export const chatWithAiAgent = async (params: {
  modelId: AiModelId;
  message: string;
  history: { role: 'user' | 'model'; text: string }[];
  memoContext: CreditMemoData;
  files: SourceFile[];
}) => {
  const systemInstruction = `Senior Credit Analyst Persona. Context: ${JSON.stringify(params.memoContext)}. Documents: ${params.files.map(f => f.name).join(', ')}.`;
  
  const chatFiles = params.files.slice(0, 3).map(f => ({
    data: f.dataUrl.split(',')[1],
    mimeType: f.type
  }));

  const result = await generateAIResponse({
    modelId: params.modelId,
    prompt: params.message,
    files: chatFiles,
    systemInstruction
  });

  return result.text;
};
