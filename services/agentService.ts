
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { DefaultAzureCredential } from "@azure/identity";
import { CreditMemoData, AiProvider, SourceFile, FieldSource, FieldCandidate } from "../types";

/**
 * EXPLICIT MODEL CONFIGURATION
 */
const GOOGLE_FLASH_MODEL = 'gemini-3-flash-preview';
const GOOGLE_PRO_MODEL = 'gemini-3-pro-preview';
const OPENAI_MODEL_ID = 'gpt-4o'; 

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
 * Array-safe deep merge to prevent converting arrays to objects
 */
const deepMerge = (target: any, source: any): any => {
  if (Array.isArray(source)) return source;
  if (!source || typeof source !== 'object') return source;
  
  const output = Array.isArray(target) ? [...target] : { ...target };
  
  Object.keys(source).forEach(key => {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      output[key] = deepMerge(target[key] || {}, source[key]);
    } else {
      output[key] = source[key];
    }
  });
  return output;
};

/**
 * Provider-agnostic AI request wrapper
 */
async function generateAIResponse(params: {
  provider: AiProvider;
  prompt: string;
  files?: { data: string; mimeType: string; name?: string }[];
  jsonSchema?: any;
  systemInstruction?: string;
  useThinking?: boolean;
  usePro?: boolean;
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
      config.thinkingConfig = { thinkingBudget: params.usePro ? 32768 : 24576 };
    }

    const response = await ai.models.generateContent({
      model: params.usePro ? GOOGLE_PRO_MODEL : GOOGLE_FLASH_MODEL,
      contents: { parts },
      config
    });

    return {
      text: (response.text || '').trim(),
      raw: response
    };

  } else {
    // OpenAI Logic
    let azureToken = getAzureToken();
    const azureEndpoint = getAzureOpenAiEndpoint();
    const standardKey = getStandardOpenAiKey();
    const azureKey = getAzureOpenAiKey();
    
    if (azureEndpoint && !azureToken && !standardKey && !azureKey) {
      try {
        const credential = new DefaultAzureCredential();
        const tokenResponse = await credential.getToken("https://cognitiveservices.azure.com/.default");
        azureToken = tokenResponse.token;
      } catch (err: any) {
        console.warn("Azure Identity auth fallback.");
      }
    }

    let url: string;
    let headers: Record<string, string> = { "Content-Type": "application/json" };
    let body: any = { model: OPENAI_MODEL_ID, temperature: 0.1 };

    if (azureToken && azureEndpoint) {
      const apiVersion = getAzureOpenAiVersion();
      url = `${azureEndpoint.replace(/\/$/, '')}/openai/deployments/${OPENAI_MODEL_ID}/chat/completions?api-version=${apiVersion}`;
      headers["Authorization"] = `Bearer ${azureToken}`;
      delete body.model; 
    } else if (standardKey) {
      url = "https://api.openai.com/v1/chat/completions";
      headers["Authorization"] = `Bearer ${standardKey}`;
    } else if (azureEndpoint && azureKey) {
      const apiVersion = getAzureOpenAiVersion();
      url = `${azureEndpoint.replace(/\/$/, '')}/openai/deployments/${OPENAI_MODEL_ID}/chat/completions?api-version=${apiVersion}`;
      headers["api-key"] = azureKey;
      delete body.model;
    } else {
      throw new Error("OpenAI Provider Error: Check your API Key or Azure Configuration.");
    }

    const messages: any[] = [];
    if (params.systemInstruction) {
      messages.push({ role: "system", content: params.systemInstruction });
    }

    let prompt = params.prompt;
    if (params.jsonSchema) {
      prompt += "\n\nCRITICAL: Return the response as a valid JSON object matching the requested schema. Do not include markdown formatting or explanations outside the JSON.";
      body.response_format = { type: "json_object" };
    }

    const userContent: any[] = [{ type: "text", text: prompt }];
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

    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error?.message || "OpenAI Engine request failed.");
    }

    const result = await response.json();
    return {
      text: (result.choices[0].message.content || '').trim(),
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

export const processDocumentWithAgents = async (files: File[], provider: AiProvider): Promise<{ data: Partial<CreditMemoData>, fieldSources: Record<string, FieldSource>, fieldCandidates: Record<string, FieldCandidate[]> }> => {
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
  
  const extractFromFile = async (file: {data: string, mimeType: string, name: string}) => {
    const extractionPrompt = `
      Act as an Elite Syndicate Credit Analyst. Perform an EXHAUSTIVE extraction on document: ${file.name}.
      Scan EVERY sentence. Populate as many fields as possible in the 'extractedData' structure.
      
      MANDATORY AUDIT TRAIL RULES:
      1. For EVERY value you populate in 'extractedData', you MUST provide a corresponding entry in 'allFindings'.
      2. 'fieldPath' in 'allFindings' MUST be the exact dot-notation path to the field (e.g., "primaryBorrower.borrowerName").
      3. 'sourceFile' MUST be exactly "${file.name}".
      4. 'pageNumber' MUST be the specific page where that specific piece of information was found (e.g. "Page 1").
      5. Extraction count is critical. Do not ignore minor fields like "Originating Office" or "Jurisdiction".
    `;

    const result = await generateAIResponse({
      provider,
      prompt: extractionPrompt,
      files: [file],
      usePro: false,
      jsonSchema: {
        type: Type.OBJECT,
        properties: {
          extractedData: { 
            type: Type.OBJECT,
            properties: {
              primaryBorrower: { type: Type.OBJECT, properties: { borrowerName: { type: Type.STRING }, originatingOffice: { type: Type.STRING }, group: { type: Type.STRING }, accountClassification: { type: Type.STRING }, leveragedLending: { type: Type.BOOLEAN }, covenantLite: { type: Type.BOOLEAN }, strategicLoan: { type: Type.BOOLEAN }, weakUnderwriting: { type: Type.BOOLEAN }, seaScore: { type: Type.STRING } } },
              purpose: { type: Type.OBJECT, properties: { businessPurpose: { type: Type.STRING }, adjudicationConsiderations: { type: Type.STRING }, sponsorPurchase: { type: Type.STRING }, arrangers: { type: Type.STRING }, syndicatedFacilities: { type: Type.STRING }, fundingMix: { type: Type.STRING } } },
              creditPosition: { type: Type.OBJECT, properties: { presentPosition: { type: Type.NUMBER }, creditRequested: { type: Type.NUMBER }, previousAuthorization: { type: Type.NUMBER }, tradingLine: { type: Type.NUMBER }, committedOverOneYear: { type: Type.NUMBER }, warehouseRequest: { type: Type.STRING }, holdCommitment: { type: Type.STRING }, subgroup: { type: Type.STRING }, groupExposureStatus: { type: Type.STRING } } },
              riskAssessment: {
                type: Type.OBJECT,
                properties: {
                  borrowerRating: { type: Type.OBJECT, properties: { proposedBrr: { type: Type.STRING }, proposedFrr: { type: Type.STRING }, currentBrr: { type: Type.STRING }, riskAnalyst: { type: Type.STRING }, raPolicyModel: { type: Type.STRING } } },
                  publicRatings: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { agency: { type: Type.STRING }, issuerRating: { type: Type.STRING }, seniorUnsecured: { type: Type.STRING }, outlook: { type: Type.STRING }, updatedAt: { type: Type.STRING } } } },
                  details: { type: Type.OBJECT, properties: { tdSic: { type: Type.STRING }, industryRisk: { type: Type.STRING }, ltv: { type: Type.NUMBER }, security: { type: Type.STRING }, businessRisk: { type: Type.STRING }, financialRisk: { type: Type.STRING }, envRisk: { type: Type.STRING }, countryRisk: { type: Type.STRING }, governanceRisk: { type: Type.STRING } } }
                }
              },
              facilityDetails: { type: Type.OBJECT, properties: { rates: { type: Type.OBJECT, properties: { margin: { type: Type.STRING }, fee: { type: Type.STRING }, upfront: { type: Type.STRING }, underwritingFee: { type: Type.STRING }, commitmentFee: { type: Type.STRING }, undrawnFee: { type: Type.STRING } } }, terms: { type: Type.OBJECT, properties: { tenor: { type: Type.STRING }, maturity: { type: Type.STRING }, extension: { type: Type.STRING }, termOut: { type: Type.STRING }, repaymentAnalysis: { type: Type.STRING } } } } },
              documentation: { type: Type.OBJECT, properties: { agreementType: { type: Type.STRING }, jurisdiction: { type: Type.STRING }, financialCovenants: { type: Type.STRING }, negativeCovenants: { type: Type.STRING }, positiveCovenants: { type: Type.STRING }, reportingReqs: { type: Type.STRING }, fundingConditions: { type: Type.STRING }, jCrewProvisions: { type: Type.STRING }, subordinationRisk: { type: Type.STRING } } },
              analysis: { 
                type: Type.OBJECT, 
                properties: { 
                  overview: { 
                    type: Type.OBJECT, 
                    properties: { 
                      companyDesc: { type: Type.STRING }, 
                      recentEvents: { type: Type.STRING }, 
                      segments: { type: Type.STRING }, 
                      geography: { type: Type.STRING }, 
                      sponsorOverview: { type: Type.STRING }, 
                      industryProfile: { type: Type.STRING }, 
                      ltmMetrics: { type: Type.STRING }, 
                      sourcesUses: { type: Type.STRING } 
                    }
                  },
                  financial: { 
                    type: Type.OBJECT, 
                    properties: { 
                      moodyAnalysis: { type: Type.STRING }, 
                      liquidity: { type: Type.STRING }, 
                      operatingCosts: { type: Type.STRING } 
                    } 
                  } 
                } 
              }
            }
          },
          allFindings: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                fieldPath: { type: Type.STRING },
                value: { type: Type.STRING },
                sourceFile: { type: Type.STRING },
                pageNumber: { type: Type.STRING },
                confidence: { type: Type.NUMBER }
              },
              required: ["fieldPath", "value", "sourceFile"]
            }
          }
        },
        required: ["extractedData", "allFindings"]
      }
    });

    try {
      const parsed = JSON.parse(result.text);
      if (parsed.allFindings) {
        parsed.allFindings = parsed.allFindings.map((f: any) => ({
          ...f,
          sourceFile: file.name
        }));
      }
      return parsed;
    } catch (e) {
      console.error("JSON Parsing Error:", result.text);
      throw new Error("The AI response was not valid JSON.");
    }
  };

  const parallelResults = await Promise.all(fileDataList.map(file => callWithRetry(() => extractFromFile(file))));
  
  const allFindings: any[] = [];
  let combinedExtracted: any = {};

  parallelResults.forEach(res => {
    if (res.allFindings) allFindings.push(...res.allFindings);
    if (res.extractedData) combinedExtracted = deepMerge(combinedExtracted, res.extractedData);
  });
  
  const fieldSources: Record<string, FieldSource> = {};
  const fieldCandidates: Record<string, FieldCandidate[]> = {};

  allFindings.forEach((item: any) => {
    if (item.fieldPath && item.value !== undefined && item.value !== null && item.value !== "") {
      const candidate: FieldCandidate = {
        value: item.value,
        sourceFile: item.sourceFile,
        pageNumber: item.pageNumber || "N/A",
        confidence: item.confidence
      };

      if (!fieldCandidates[item.fieldPath]) {
        fieldCandidates[item.fieldPath] = [];
      }
      
      const exists = fieldCandidates[item.fieldPath].some(c => 
        String(c.value).toLowerCase() === String(candidate.value).toLowerCase()
      );
      
      if (!exists) {
        fieldCandidates[item.fieldPath].push(candidate);
      }
    }
  });

  Object.entries(fieldCandidates).forEach(([path, candidates]) => {
    const isInternalConflict = candidates.length > 1;
    fieldSources[path] = {
      filename: candidates[0].sourceFile,
      pageNumber: candidates[0].pageNumber,
      selectedIndices: [0],
      resolved: !isInternalConflict
    };
    
    const keys = path.split('.');
    let current = combinedExtracted;
    for (let i = 0; i < keys.length - 1; i++) {
      if (!current[keys[i]]) current[keys[i]] = {};
      current = current[keys[i]];
    }
    current[keys[keys.length - 1]] = candidates[0].value;
  });

  const synthesizeNarrative = async () => {
    const synthesisPrompt = `
      You are a Senior Managing Director in Syndicate Loans. Review the extraction results: ${JSON.stringify(combinedExtracted)}.
      Write a strategic recommendation.
    `;

    const result = await generateAIResponse({
      provider,
      prompt: synthesisPrompt,
      files: fileDataList,
      useThinking: true,
      usePro: true 
    });
    return result.text;
  };

  const narrative = await callWithRetry(synthesizeNarrative);

  const finalData = {
    ...combinedExtracted,
    analysis: {
      ...combinedExtracted.analysis,
      justification: {
        ...combinedExtracted.analysis?.justification,
        recommendation: narrative
      }
    }
  };

  return { data: finalData, fieldSources, fieldCandidates };
};

export const chatWithAiAgent = async (params: {
  provider: AiProvider;
  message: string;
  history: { role: 'user' | 'model'; text: string }[];
  memoContext: CreditMemoData;
  files: SourceFile[];
}) => {
  const systemInstruction = `You are a Senior Credit Analysis Agent. Context: ${JSON.stringify(params.memoContext)}. Answer using deal documents.`;
  
  const chatFiles = params.files.slice(0, 3).map(f => ({
    data: f.dataUrl.split(',')[1],
    mimeType: f.type,
    name: f.name
  }));

  const result = await generateAIResponse({
    provider: params.provider,
    prompt: params.message,
    files: chatFiles,
    systemInstruction,
    usePro: true
  });

  return result.text;
};
