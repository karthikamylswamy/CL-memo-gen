
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { DefaultAzureCredential } from "@azure/identity";
import { CreditMemoData, AiProvider, SourceFile, FieldSource, FieldCandidate, SectionKey } from "../types";

// PDF.js for OpenAI PDF support
let pdfjsLib: any = null;
const initPdfJs = async () => {
  if (pdfjsLib) return pdfjsLib;
  try {
    const pdfjs = await import('pdfjs-dist');
    // @ts-ignore
    const pdfWorker = await import('pdfjs-dist/build/pdf.worker.mjs');
    pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker.default;
    pdfjsLib = pdfjs;
    return pdfjsLib;
  } catch (e) {
    console.error("Failed to load PDF.js", e);
    return null;
  }
};

/**
 * EXPLICIT MODEL CONFIGURATION
 */
const GOOGLE_FLASH_MODEL = 'gemini-3-flash-preview';
const GOOGLE_PRO_MODEL = 'gemini-3-pro-preview';
const OPENAI_MODEL_ID = 'gpt.5.2'; 

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
  if (Array.isArray(source)) {
    if (Array.isArray(target) && source.length > 0 && typeof source[0] === 'object') {
      const identityKeys = ['agency', 'entity', 'name', 'id'];
      const identityKey = identityKeys.find(k => k in source[0]);
      if (identityKey) {
        const merged = [...target];
        source.forEach(item => {
          const idx = merged.findIndex(m => m && item && String(m[identityKey]).toLowerCase() === String(item[identityKey]).toLowerCase());
          if (idx > -1) merged[idx] = deepMerge(merged[idx], item);
          else merged.push(item);
        });
        return merged;
      }
    }
    return source;
  }
  if (!source || typeof source !== 'object') return source;
  
  const output = (target && typeof target === 'object' && !Array.isArray(target)) ? { ...target } : {};
  
  Object.keys(source).forEach(key => {
    if (source[key] && typeof source[key] === 'object') {
      output[key] = deepMerge(target ? target[key] : undefined, source[key]);
    } else {
      output[key] = source[key];
    }
  });
  return output;
};

async function convertPdfToImages(base64: string): Promise<{data: string, mimeType: string}[]> {
  const lib = await initPdfJs();
  if (!lib) return [];

  try {
    const binary = atob(base64);
    const uint8Array = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      uint8Array[i] = binary.charCodeAt(i);
    }

    const loadingTask = lib.getDocument({ data: uint8Array });
    const pdf = await loadingTask.promise;
    const numPages = Math.min(pdf.numPages, 5); // Process first 5 pages
    const images: {data: string, mimeType: string}[] = [];

    for (let i = 1; i <= numPages; i++) {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 1.5 });
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (!context) continue;

      canvas.height = viewport.height;
      canvas.width = viewport.width;

      await page.render({ canvasContext: context, viewport }).promise;
      const imageData = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
      images.push({ data: imageData, mimeType: 'image/jpeg' });
    }
    return images;
  } catch (error) {
    console.error("PDF to Image conversion failed:", error);
    return [];
  }
}

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

    const responseText = (response.text || '').trim();
    if (!responseText) {
      throw new Error("The AI returned an empty response. This may be due to safety filters or model limitations.");
    }

    return {
      text: responseText,
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
    let body: any = { model: OPENAI_MODEL_ID, temperature: 0.1, max_tokens: 4096 };

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
      prompt += `\n\nCRITICAL: Return the response as a valid JSON object matching this schema: ${JSON.stringify(params.jsonSchema)}. Do not include markdown formatting or explanations outside the JSON.`;
      body.response_format = { type: "json_object" };
    }

    const userContent: any[] = [{ type: "text", text: prompt }];
    if (params.files) {
      for (const f of params.files) {
        if (f.mimeType.startsWith('image/')) {
          userContent.push({
            type: "image_url",
            image_url: { url: `data:${f.mimeType};base64,${f.data}` }
          });
        } else if (f.mimeType === 'application/pdf') {
          // Re-implementing PDF to image conversion as the API requires file_id for native PDF modality
          const pdfImages = await convertPdfToImages(f.data);
          pdfImages.forEach(img => {
            userContent.push({
              type: "image_url",
              image_url: { url: `data:${img.mimeType};base64,${img.data}` }
            });
          });
          
          if (pdfImages.length === 0) {
            prompt += `\n\n(Note: A document named "${f.name || 'document'}" was uploaded but could not be converted to images for visual analysis.)`;
            userContent[0].text = prompt;
          }
        }
      }
    }

    messages.push({ role: "user", content: userContent });
    body.messages = messages;

    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const status = response.status;
      let message = "OpenAI Engine request failed.";
      try {
        const err = await response.json();
        message = err.error?.message || message;
      } catch (e) {
        message = response.statusText || message;
      }
      
      if (status === 429) throw new Error(`Rate limit reached (429): ${message}`);
      if (status === 401) throw new Error(`Authentication failed (401): ${message}`);
      if (status === 403) throw new Error(`Access forbidden (403): ${message}`);
      if (status === 404) throw new Error(`Model or endpoint not found (404): ${message}`);
      
      throw new Error(`OpenAI Error (${status}): ${message}`);
    }

    const result = await response.json();
    return {
      text: (result.choices[0].message.content || '').trim(),
      raw: result
    };
  }
}

const getFriendlyErrorMessage = (error: any): string => {
  const msg = error?.message || (typeof error === 'string' ? error : JSON.stringify(error));
  
  if (msg.includes("429") || msg.includes("RESOURCE_EXHAUSTED") || msg.includes("rate limit") || msg.includes("limit reached")) {
    return "The AI model is currently at its capacity or you have reached your rate limit. Please wait a moment and try again.";
  }
  
  if (msg.includes("credit") || msg.includes("balance") || msg.includes("quota") || msg.includes("billing")) {
    return "The AI service account has insufficient credits or has exceeded its quota. Please check your billing settings.";
  }
  
  if (msg.includes("API key") || msg.includes("unauthorized") || msg.includes("401") || msg.includes("invalid_api_key")) {
    return "Authentication failed. Please verify that your AI Provider API keys are correctly configured in the environment.";
  }
  
  if (msg.includes("JSON") || msg.includes("parse") || msg.includes("valid JSON")) {
    return "The AI was unable to extract structured data from this document. The content might be too complex or the format is unsupported.";
  }
  
  if (msg.includes("safety") || msg.includes("filter") || msg.includes("blocked")) {
    return "The AI response was blocked by safety filters. This can happen if the document contains sensitive or restricted content.";
  }

  if (msg.includes("empty response")) {
    return "The AI returned an empty response. Please try again or check if the document content is readable.";
  }
  
  if (msg.includes("network") || msg.includes("fetch") || msg.includes("timeout") || msg.includes("Failed to fetch")) {
    return "A network error occurred while connecting to the AI service. Please check your internet connection and try again.";
  }

  if (msg.includes("not found") || msg.includes("404") || msg.includes("model_not_found")) {
    return "The requested AI model was not found or is currently unavailable.";
  }

  return `AI Error: ${msg}`;
};

async function callWithRetry(apiCall: () => Promise<any>, retries = MAX_RETRIES): Promise<any> {
  let lastError: any;
  for (let i = 0; i <= retries; i++) {
    try {
      return await apiCall();
    } catch (error: any) {
      lastError = error;
      const errorMsg = error?.message || (typeof error === 'string' ? error : JSON.stringify(error));
      
      // Check for retryable errors
      const isRetryable = errorMsg.includes("429") || 
                          errorMsg.includes("RESOURCE_EXHAUSTED") || 
                          errorMsg.includes("limit") || 
                          errorMsg.includes("timeout") ||
                          errorMsg.includes("503") ||
                          errorMsg.includes("500");

      if (isRetryable && i < retries) {
        const delay = INITIAL_RETRY_DELAY * Math.pow(2, i);
        await sleep(delay);
        continue;
      }
      
      // If not retryable or retries exhausted, throw friendly error
      throw new Error(getFriendlyErrorMessage(error));
    }
  }
  throw new Error(getFriendlyErrorMessage(lastError));
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
      
      For 'publicRatings', extract ALL available agency ratings and debt-specific ratings (e.g., Senior Secured, Senior Unsecured, Subordinated, etc.) found in the document. Do not limit yourself to just Moody's, S&P, or Fitch if others are present.
      
      MANDATORY AUDIT TRAIL RULES:
      1. For EVERY value you populate in 'extractedData', you MUST provide a corresponding entry in 'allFindings'.
      2. 'fieldPath' in 'allFindings' MUST be the exact dot-notation path to the field (e.g., "primaryBorrower.companyName").
      3. 'sourceFile' MUST be exactly "${file.name}".
      4. 'pageNumber' MUST be the specific page where that specific piece of information was found (e.g. "Page 1").
      5. Extraction count is critical. Do not ignore minor fields like "Originating Office" or "Jurisdiction".
      6. For 'companyName', ALWAYS extract the full legal name of the entity as stated in the legal documents (e.g., "Apple Inc." instead of "Apple").
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
              primaryBorrower: { type: Type.OBJECT, properties: { companyName: { type: Type.STRING }, originatingOffice: { type: Type.STRING }, group: { type: Type.STRING }, accountClassification: { type: Type.STRING }, leveragedLending: { type: Type.BOOLEAN }, covenantLite: { type: Type.BOOLEAN }, strategicLoan: { type: Type.BOOLEAN }, weakUnderwriting: { type: Type.BOOLEAN }, seaScore: { type: Type.STRING } } },
              purpose: { type: Type.OBJECT, properties: { businessPurpose: { type: Type.STRING }, adjudicationConsiderations: { type: Type.STRING }, sponsorPurchase: { type: Type.STRING }, arrangers: { type: Type.STRING }, syndicatedFacilities: { type: Type.STRING }, fundingMix: { type: Type.STRING } } },
              creditPosition: { type: Type.OBJECT, properties: { presentPosition: { type: Type.NUMBER }, creditRequested: { type: Type.NUMBER }, previousAuthorization: { type: Type.NUMBER }, tradingLine: { type: Type.NUMBER }, committedOverOneYear: { type: Type.NUMBER }, warehouseRequest: { type: Type.STRING }, holdCommitment: { type: Type.STRING }, subgroup: { type: Type.STRING }, groupExposureStatus: { type: Type.STRING } } },
              riskAssessment: {
                type: Type.OBJECT,
                properties: {
                  borrowerRating: { type: Type.OBJECT, properties: { proposedBrr: { type: Type.STRING }, proposedFrr: { type: Type.STRING }, currentBrr: { type: Type.STRING }, riskAnalyst: { type: Type.STRING }, raPolicyModel: { type: Type.STRING } } },
                  publicRatings: { 
                    type: Type.ARRAY, 
                    items: { 
                      type: Type.OBJECT, 
                      properties: { 
                        agency: { type: Type.STRING }, 
                        issuerRating: { type: Type.STRING }, 
                        seniorSecured: { type: Type.STRING },
                        seniorUnsecured: { type: Type.STRING }, 
                        subordinated: { type: Type.STRING },
                        outlook: { type: Type.STRING }, 
                        updatedAt: { type: Type.STRING } 
                      } 
                    } 
                  },
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
      // Clean JSON in case the model included markdown blocks
      const cleanedText = result.text.replace(/```json\n?/, '').replace(/```\n?$/, '').trim();
      const parsed = JSON.parse(cleanedText);
      if (parsed.allFindings) {
        parsed.allFindings = parsed.allFindings.map((f: any) => ({
          ...f,
          sourceFile: file.name
        }));
      }
      return parsed;
    } catch (e) {
      console.error("JSON Parsing Error:", result.text);
      throw new Error("The AI was unable to extract structured data from this document. The content might be too complex or the format is unsupported.");
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

  const chatCall = async () => {
    const result = await generateAIResponse({
      provider: params.provider,
      prompt: params.message,
      files: chatFiles,
      systemInstruction,
      usePro: true
    });
    return result.text;
  };

  return await callWithRetry(chatCall);
};

export const updateSectionWithFeedback = async (params: {
  provider: AiProvider;
  section: SectionKey;
  feedback: string;
  currentData: CreditMemoData;
  files: SourceFile[];
}): Promise<{ updatedData: Partial<CreditMemoData>, changes: string[] }> => {
  const systemInstruction = `
    You are an Elite Syndicate Credit Analyst. 
    The user is currently reviewing the '${params.section}' section of a Credit Memo and has provided feedback.
    Your task is to update the Credit Memo data based on this feedback.
    
    While you should focus on the '${params.section}' section, you are authorized to update ANY field in the Credit Memo if the feedback is applicable to other areas.
    
    Full Credit Memo Data: ${JSON.stringify(params.currentData)}
    User Feedback: "${params.feedback}"
    
    CRITICAL: 
    1. Return a JSON object with two properties: 'updatedData' and 'changesSummary'.
    2. 'updatedData' should be a Partial<CreditMemoData> containing ONLY the fields that were actually changed or added.
    3. 'changesSummary' should be an array of strings describing what was updated (e.g., ["Updated Company Name to 'X'", "Refined company description for conciseness"]).
    4. Maintain the existing structure of the Credit Memo.
    5. Use the provided deal documents (if any) to verify and enrich the content if the feedback suggests it.
    6. If no changes are needed or feedback is irrelevant, return empty updatedData and a message in changesSummary.
  `;

  const chatFiles = params.files.slice(0, 5).map(f => ({
    data: f.dataUrl.split(',')[1],
    mimeType: f.type,
    name: f.name
  }));

  const feedbackCall = async () => {
    const result = await generateAIResponse({
      provider: params.provider,
      prompt: `Update the Credit Memo based on the feedback provided while in the '${params.section}' section: ${params.feedback}`,
      files: chatFiles,
      systemInstruction,
      usePro: true,
      jsonSchema: {
        type: Type.OBJECT,
        properties: {
          updatedData: { 
            type: Type.OBJECT,
            description: "The modified fields for the Credit Memo"
          },
          changesSummary: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "List of specific changes made"
          }
        },
        required: ["updatedData", "changesSummary"]
      }
    });

    try {
      const parsed = JSON.parse(result.text);
      const updatedData = parsed.updatedData || {};
      const changes = parsed.changesSummary || [];
      
      return { 
        updatedData,
        changes
      };
    } catch (e) {
      console.error("Failed to parse agent update:", result.text);
      throw new Error("The AI was unable to format the update correctly. Please try again with more specific feedback.");
    }
  };

  return await callWithRetry(feedbackCall);
};
