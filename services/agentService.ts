
import { GoogleGenAI, Type, GenerateContentResponse, Modality } from "@google/genai";
import { CreditMemoData, AiProvider, SourceFile, FieldSource } from "../types";

/**
 * EXPLICIT MODEL CONFIGURATION
 * These variables define the specific LLM models used for each provider.
 */
const GOOGLE_MODEL_ID = 'gemini-3-pro-preview'; 
const OPENAI_MODEL_ID = 'gpt-4o'; // This serves as the deployment name for Azure or the model name for OpenAI

const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 2000;

const SUPPORTED_GEMINI_MIME_TYPES = [
  'image/png', 
  'image/jpeg', 
  'image/webp', 
  'image/heic', 
  'image/heif', 
  'application/pdf'
];

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export const getAzureOpenAiKey = (): string | null => {
  return (process as any).env.AZURE_OPENAI_API_KEY || (process as any).env.API_KEY || null;
};

export const getAzureOpenAiEndpoint = (): string | null => {
  return (process as any).env.AZURE_OPENAI_ENDPOINT || null;
};

export const getAzureOpenAiVersion = (): string => {
  return (process as any).env.AZURE_OPENAI_API_VERSION || '2024-05-01-preview';
};

export const getAzureToken = (): string | null => {
  return (process as any).env.AZURE_OPENAI_TOKEN || null;
};

export const getStandardOpenAiKey = (): string | null => {
  return (process as any).env.OPENAI_API_KEY || null;
};

/**
 * Internal unified response generator that uses the explicit provider models.
 */
async function generateAIResponse(params: {
  provider: AiProvider;
  prompt: string;
  files?: { data: string; mimeType: string; name?: string }[];
  jsonSchema?: any;
  systemInstruction?: string;
  useThinking?: boolean;
}) {
  if (params.provider === 'google') {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
    
    const parts: any[] = [];
    if (params.files) {
      params.files.forEach(f => {
        if (SUPPORTED_GEMINI_MIME_TYPES.includes(f.mimeType)) {
          parts.push({ inlineData: { data: f.data, mimeType: f.mimeType } });
        }
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

    if (params.useThinking) {
      config.thinkingConfig = { thinkingBudget: 32768 };
    }

    const response = await ai.models.generateContent({
      model: GOOGLE_MODEL_ID,
      contents: [{ parts }],
      config
    });

    return {
      text: response.text || '',
      raw: response
    };

  } else {
    // OpenAI Provider Selection
    const azureToken = getAzureToken();
    const azureEndpoint = getAzureOpenAiEndpoint();
    const standardKey = getStandardOpenAiKey();
    const azureKey = getAzureOpenAiKey();
    
    let url: string;
    let headers: Record<string, string> = { "Content-Type": "application/json" };
    let body: any = { model: OPENAI_MODEL_ID, temperature: 0.1 };

    /**
     * AUTHENTICATION HIERARCHY:
     * 1. Azure OpenAI with Bearer Token (if AZURE_OPENAI_TOKEN + endpoint provided)
     * 2. Standard OpenAI Fallback (if OPENAI_API_KEY provided)
     * 3. Azure OpenAI with API-Key (fallback for Azure specific infrastructure)
     */
    if (azureToken && azureEndpoint) {
      const apiVersion = getAzureOpenAiVersion();
      url = `${azureEndpoint.replace(/\/$/, '')}/openai/deployments/${OPENAI_MODEL_ID}/chat/completions?api-version=${apiVersion}`;
      headers["Authorization"] = `Bearer ${azureToken}`;
      delete body.model; // Azure uses deployment from URL
    } else if (standardKey) {
      url = "https://api.openai.com/v1/chat/completions";
      headers["Authorization"] = `Bearer ${standardKey}`;
    } else if (azureEndpoint && azureKey) {
      const apiVersion = getAzureOpenAiVersion();
      url = `${azureEndpoint.replace(/\/$/, '')}/openai/deployments/${OPENAI_MODEL_ID}/chat/completions?api-version=${apiVersion}`;
      headers["api-key"] = azureKey;
      delete body.model;
    } else {
      throw new Error("OpenAI Configuration is missing. Please provide AZURE_OPENAI_TOKEN, OPENAI_API_KEY, or Azure Endpoint/Key.");
    }

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
    body.messages = messages;

    if (params.jsonSchema) {
      body.response_format = { type: "json_object" };
    }

    const response = await fetch(url, {
      method: "POST",
      headers,
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

export const processDocumentWithAgents = async (files: File[], provider: AiProvider): Promise<{ data: Partial<CreditMemoData>, fieldSources: Record<string, FieldSource> }> => {
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
      Act as an Elite Syndicate Credit Analyst. Perform an EXHAUSTIVE audit and extraction on all provided documents: ${fileDataList.map(f => f.name).join(', ')}.
      Extract PRIMARY BORROWER, CREDIT & EXPOSURE, PURPOSE, RISK & RATINGS (Proposed BRR, Moody's, S&P, Fitch), FACILITY DETAILS (Margin, Tenor, Maturity), 
      LEGAL & COVENANTS (Negative, Positive, Financial, Reporting, Funding), and ANALYSIS OVERVIEW.
      For EVERY field, return the 'sourceFile' and 'pageNumber'.
    `;

    const result = await generateAIResponse({
      provider,
      prompt: extractionPrompt,
      files: fileDataList,
      jsonSchema: {
        type: Type.OBJECT,
        properties: {
          extractedData: { 
            type: Type.OBJECT,
            properties: {
              primaryBorrower: { type: Type.OBJECT, properties: { borrowerName: { type: Type.STRING }, originatingOffice: { type: Type.STRING }, group: { type: Type.STRING }, accountClassification: { type: Type.STRING }, leveragedLending: { type: Type.BOOLEAN }, covenantLite: { type: Type.BOOLEAN }, strategicLoan: { type: Type.BOOLEAN } } },
              purpose: { type: Type.OBJECT, properties: { businessPurpose: { type: Type.STRING }, adjudicationConsiderations: { type: Type.STRING } } },
              creditPosition: { type: Type.OBJECT, properties: { presentPosition: { type: Type.NUMBER }, creditRequested: { type: Type.NUMBER }, previousAuthorization: { type: Type.NUMBER }, tradingLine: { type: Type.NUMBER }, committedOverOneYear: { type: Type.NUMBER } } },
              riskAssessment: {
                type: Type.OBJECT,
                properties: {
                  borrowerRating: { type: Type.OBJECT, properties: { proposedBrr: { type: Type.STRING }, currentBrr: { type: Type.STRING }, riskAnalyst: { type: Type.STRING }, raPolicyModel: { type: Type.STRING } } },
                  publicRatings: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { agency: { type: Type.STRING }, issuerRating: { type: Type.STRING }, seniorUnsecured: { type: Type.STRING }, outlook: { type: Type.STRING }, updatedAt: { type: Type.STRING } } } },
                  details: { type: Type.OBJECT, properties: { tdSic: { type: Type.STRING }, industryRisk: { type: Type.STRING }, ltv: { type: Type.NUMBER }, security: { type: Type.STRING } } }
                }
              },
              facilityDetails: { type: Type.OBJECT, properties: { rates: { type: Type.OBJECT, properties: { margin: { type: Type.STRING }, fee: { type: Type.STRING }, upfront: { type: Type.STRING } } }, terms: { type: Type.OBJECT, properties: { tenor: { type: Type.STRING }, maturity: { type: Type.STRING } } } } },
              documentation: { type: Type.OBJECT, properties: { agreementType: { type: Type.STRING }, jurisdiction: { type: Type.STRING }, financialCovenants: { type: Type.STRING }, negativeCovenants: { type: Type.STRING }, positiveCovenants: { type: Type.STRING }, reportingReqs: { type: Type.STRING }, fundingConditions: { type: Type.STRING } } },
              analysis: { type: Type.OBJECT, properties: { overview: { type: Type.OBJECT, properties: { companyDesc: { type: Type.STRING }, recentEvents: { type: Type.STRING } } } } }
            },
            required: ["primaryBorrower"]
          },
          fieldSources: {
            type: Type.ARRAY,
            items: { 
              type: Type.OBJECT, 
              properties: { fieldPath: { type: Type.STRING }, sourceFile: { type: Type.STRING }, pageNumber: { type: Type.STRING } },
              required: ["fieldPath", "sourceFile"]
            }
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
  
  const fieldSources: Record<string, FieldSource> = {};
  rawFieldSources.forEach((item: any) => {
    if (item.fieldPath && item.sourceFile) {
      fieldSources[item.fieldPath] = {
        filename: item.sourceFile,
        pageNumber: item.pageNumber || "N/A"
      };
    }
  });

  const synthesizeNarrative = async () => {
    const synthesisPrompt = `
      Perform deep analysis for Deal Team. Context: ${JSON.stringify(extracted)}.
      1. Synthesize "Executive Recommendation".
      2. Include Markdown Tables for "Covenants" and "Pricing".
      3. Use ![Description](FILENAME) for exhibits.
    `;

    const result = await generateAIResponse({
      provider,
      prompt: synthesisPrompt,
      files: fileDataList,
      useThinking: true
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

export const chatWithAiAgent = async (params: {
  provider: AiProvider;
  message: string;
  history: { role: 'user' | 'model'; text: string }[];
  memoContext: CreditMemoData;
  files: SourceFile[];
}) => {
  const systemInstruction = `Senior Credit Analyst Persona. Context: ${JSON.stringify(params.memoContext)}. You have access to: ${params.files.map(f => f.name).join(', ')}.`;
  
  const chatFiles = params.files.slice(0, 3).map(f => ({
    data: f.dataUrl.split(',')[1],
    mimeType: f.type,
    name: f.name
  }));

  const result = await generateAIResponse({
    provider: params.provider,
    prompt: params.message,
    files: chatFiles,
    systemInstruction
  });

  return result.text;
};
