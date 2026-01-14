
import { GoogleGenAI, Type, GenerateContentResponse, Modality } from "@google/genai";
import { CreditMemoData, AiModelId, SourceFile, FieldSource } from "../types";
import { AVAILABLE_MODELS } from "../constants";

const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 2000;

// List of MIME types officially supported for inlineData by the models
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

/**
 * Robust key resolution for Azure OpenAI.
 */
export const getAzureOpenAiKey = (): string | null => {
  return (process as any).env.AZURE_OPENAI_API_KEY || (process as any).env.API_KEY || null;
};

export const getAzureOpenAiEndpoint = (): string | null => {
  return (process as any).env.AZURE_OPENAI_ENDPOINT || null;
};

export const getAzureOpenAiVersion = (): string => {
  return (process as any).env.AZURE_OPENAI_API_VERSION || '2024-05-01-preview';
};

/**
 * Unified AI Request Interface to make all functions model/provider agnostic.
 * OpenAI provider is configured to use Azure OpenAI endpoints.
 */
async function generateAIResponse(params: {
  modelId: AiModelId;
  prompt: string;
  files?: { data: string; mimeType: string; name?: string }[];
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
        // Filter out unsupported MIME types (like application/msword) before sending to Gemini
        if (SUPPORTED_GEMINI_MIME_TYPES.includes(f.mimeType)) {
          parts.push({ inlineData: { data: f.data, mimeType: f.mimeType } });
        } else {
          console.warn(`Skipping file ${f.name} from binary upload: MIME type ${f.mimeType} is not supported by Gemini inlineData.`);
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
    // Azure OpenAI Provider
    const apiKey = getAzureOpenAiKey();
    const endpoint = getAzureOpenAiEndpoint();
    const apiVersion = getAzureOpenAiVersion();

    if (!apiKey || !endpoint) {
      throw new Error("Azure OpenAI Configuration is missing (API Key or Endpoint). Please check environment variables.");
    }

    const deploymentName = (process as any).env.AZURE_OPENAI_DEPLOYMENT_NAME || params.modelId;
    const url = `${endpoint.replace(/\/$/, '')}/openai/deployments/${deploymentName}/chat/completions?api-version=${apiVersion}`;

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
      messages,
      temperature: 0.1
    };

    if (params.jsonSchema) {
      body.response_format = { type: "json_object" };
    }

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": apiKey
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error?.message || "Azure OpenAI request failed");
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
 * Agnostic agent orchestration for exhaustive document processing.
 */
export const processDocumentWithAgents = async (files: File[], modelId: AiModelId): Promise<{ data: Partial<CreditMemoData>, fieldSources: Record<string, FieldSource> }> => {
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
      
      Your goal is to populate a complete Credit Memo with granular precision. For EVERY field extracted, you MUST provide the 'sourceFile' (filename) and the 'pageNumber' where the data was found. If it's an image, use 'image' as page number or appropriate index.
      
      Extract the following categories:
      1. PRIMARY BORROWER: Full legal name, headquarters office, parent group, and specific risk classifications.
      2. CREDIT & EXPOSURE: Extract specific requested amounts, existing positions, committed limits > 1yr.
      3. PURPOSE: Detailed business rationale for the loan.
      4. RISK & RATINGS: Extract Borrower Risk Rating (BRR). Scrape the full ratings table for Moody's, S&P, and Fitch.
      5. FACILITY DETAILS: Pricing grids, Tenor, Maturity Dates.
      6. LEGAL & COVENANTS: Extract EXHAUSTIVE text for Negative, Positive, and Financial Covenants. Scrape Reporting Requirements.
      7. ANALYSIS: Scrape the business description, recent corporate events.
      
      Identify the 'sourceFile' and 'pageNumber' for EVERY single field extracted.
      Return valid JSON in the requested schema.
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
              primaryBorrower: { 
                type: Type.OBJECT, 
                properties: { 
                  borrowerName: { type: Type.STRING }, 
                  originatingOffice: { type: Type.STRING }, 
                  group: { type: Type.STRING }, 
                  accountClassification: { type: Type.STRING },
                  leveragedLending: { type: Type.BOOLEAN },
                  covenantLite: { type: Type.BOOLEAN },
                  strategicLoan: { type: Type.BOOLEAN }
                } 
              },
              purpose: {
                type: Type.OBJECT,
                properties: {
                  businessPurpose: { type: Type.STRING },
                  adjudicationConsiderations: { type: Type.STRING }
                }
              },
              creditPosition: { 
                type: Type.OBJECT, 
                properties: { 
                  presentPosition: { type: Type.NUMBER }, 
                  creditRequested: { type: Type.NUMBER },
                  previousAuthorization: { type: Type.NUMBER },
                  tradingLine: { type: Type.NUMBER },
                  committedOverOneYear: { type: Type.NUMBER }
                } 
              },
              riskAssessment: {
                type: Type.OBJECT,
                properties: {
                  borrowerRating: { 
                    type: Type.OBJECT, 
                    properties: { 
                      proposedBrr: { type: Type.STRING }, 
                      currentBrr: { type: Type.STRING }, 
                      riskAnalyst: { type: Type.STRING },
                      raPolicyModel: { type: Type.STRING }
                    } 
                  },
                  publicRatings: { 
                    type: Type.ARRAY, 
                    items: { 
                      type: Type.OBJECT, 
                      properties: { 
                        agency: { type: Type.STRING }, 
                        issuerRating: { type: Type.STRING }, 
                        seniorUnsecured: { type: Type.STRING }, 
                        outlook: { type: Type.STRING },
                        updatedAt: { type: Type.STRING }
                      } 
                    } 
                  },
                  details: {
                    type: Type.OBJECT,
                    properties: {
                      tdSic: { type: Type.STRING },
                      industryRisk: { type: Type.STRING },
                      ltv: { type: Type.NUMBER },
                      security: { type: Type.STRING }
                    }
                  }
                }
              },
              facilityDetails: {
                type: Type.OBJECT,
                properties: {
                  rates: {
                    type: Type.OBJECT,
                    properties: {
                      margin: { type: Type.STRING },
                      fee: { type: Type.STRING },
                      upfront: { type: Type.STRING }
                    }
                  },
                  terms: {
                    type: Type.OBJECT,
                    properties: {
                      tenor: { type: Type.STRING },
                      maturity: { type: Type.STRING }
                    }
                  }
                }
              },
              documentation: { 
                type: Type.OBJECT, 
                properties: { 
                  agreementType: { type: Type.STRING },
                  jurisdiction: { type: Type.STRING },
                  financialCovenants: { type: Type.STRING }, 
                  negativeCovenants: { type: Type.STRING }, 
                  positiveCovenants: { type: Type.STRING }, 
                  reportingReqs: { type: Type.STRING }, 
                  fundingConditions: { type: Type.STRING } 
                } 
              },
              analysis: {
                type: Type.OBJECT,
                properties: {
                  overview: {
                    type: Type.OBJECT,
                    properties: {
                      companyDesc: { type: Type.STRING },
                      recentEvents: { type: Type.STRING }
                    }
                  }
                }
              }
            },
            required: ["primaryBorrower"]
          },
          fieldSources: {
            type: Type.ARRAY,
            items: { 
              type: Type.OBJECT, 
              properties: { 
                fieldPath: { type: Type.STRING }, 
                sourceFile: { type: Type.STRING },
                pageNumber: { type: Type.STRING }
              },
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
      Perform a deep executive analysis for the Deal Team.
      Context: ${JSON.stringify(extracted)}.
      
      Requirements:
      1. Synthesize an "Executive Recommendation" that highlights credit strengths, risks, and mitigants.
      2. Include Markdown Tables for "Key Financial Covenants" and "Tiered Pricing Grid" if found.
      3. Use Exhibits: Reference specific sections using ![Description](FILENAME) when a chart or table from a document is critical.
      4. Professional tone for a Management Credit Committee (MCC).
    `;

    const result = await generateAIResponse({
      modelId,
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
  const systemInstruction = `Senior Credit Analyst Persona. Context: ${JSON.stringify(params.memoContext)}. You have access to the deal documents: ${params.files.map(f => f.name).join(', ')}. Provide detailed, evidence-based answers for credit underwriting queries.`;
  
  const chatFiles = params.files.slice(0, 3).map(f => ({
    data: f.dataUrl.split(',')[1],
    mimeType: f.type,
    name: f.name
  }));

  const result = await generateAIResponse({
    modelId: params.modelId,
    prompt: params.message,
    files: chatFiles,
    systemInstruction
  });

  return result.text;
};
