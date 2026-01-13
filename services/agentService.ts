
import { GoogleGenAI, Type } from "@google/genai";
import { CreditMemoData, AiModelId } from "../types";
import { AVAILABLE_MODELS } from "../constants";

/**
 * CONFIGURATION - Developer Exposure
 * Set your API keys in the environment or override them here for local development.
 */
const CONFIG = {
  // Exclusively using process.env.API_KEY for Gemini as per instructions
  GEMINI_API_KEY: process.env.API_KEY,
  // OpenAI key can be provided via environment or localStorage override
  OPENAI_API_KEY: (process as any).env.OPENAI_API_KEY || localStorage.getItem('MAPLE_OPENAI_API_KEY')
};

const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 2000;

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Robust key resolution for OpenAI.
 * Prioritizes local override, then environment.
 */
export const getOpenAiKey = (): string | null => {
  return localStorage.getItem('MAPLE_OPENAI_API_KEY') || (process as any).env.OPENAI_API_KEY || null;
};

// Utility to call Gemini via SDK
async function callGemini(modelId: string, parts: any[], config?: any) {
  if (!CONFIG.GEMINI_API_KEY) {
    throw new Error("Gemini API Key is missing (process.env.API_KEY)");
  }
  const ai = new GoogleGenAI({ apiKey: CONFIG.GEMINI_API_KEY });
  const response = await ai.models.generateContent({
    model: modelId,
    contents: [{ parts }],
    config
  });
  return response;
}

// Utility to call OpenAI via REST
async function callOpenAI(modelId: string, messages: any[], responseFormat?: any) {
  const apiKey = getOpenAiKey();
  
  if (!apiKey) {
    throw new Error("OpenAI API Key is missing. Please configure it in System Settings.");
  }

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
      
      if (errorMsg.includes("429") || errorMsg.includes("RESOURCE_EXHAUSTED") || errorMsg.includes("limit")) {
        if (i < retries) {
          const delay = INITIAL_RETRY_DELAY * Math.pow(2, i);
          console.warn(`AI Provider Quota reached. Retrying in ${delay}ms... (Attempt ${i + 1}/${retries})`);
          await sleep(delay);
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
      Exhaustively analyze documents: ${fileDataList.map(f => f.name).join(', ')}.
      
      TASK:
      Extract as many fields as possible from the documents into the provided JSON structure. 
      Focus on Borrower info, purpose, detailed financial figures (Present Position, Credit Requested), 
      Risk Ratings, Facility Terms (Margins, Tenors), and Legal Covenants.
      
      For every value found, identify the 'sourceFile' it was extracted from.
      
      Return JSON with:
      1. "extractedData": Structured data matching the credit memo requirements.
      2. "fieldSources": Array of { "fieldPath": string, "sourceFile": string }
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
              description: "The primary extracted credit data",
              properties: {
                primaryBorrower: { 
                  type: Type.OBJECT, 
                  properties: { 
                    borrowerName: { type: Type.STRING },
                    originatingOffice: { type: Type.STRING },
                    group: { type: Type.STRING },
                    accountClassification: { type: Type.STRING },
                    quarterlyReview: { type: Type.BOOLEAN },
                    leveragedLending: { type: Type.BOOLEAN },
                    strategicLoan: { type: Type.BOOLEAN },
                    creditException: { type: Type.BOOLEAN },
                    covenantLite: { type: Type.BOOLEAN }
                  } 
                },
                purpose: { 
                  type: Type.OBJECT, 
                  properties: { 
                    businessPurpose: { type: Type.STRING },
                    adjudicationConsiderations: { type: Type.STRING },
                    annualReviewStatus: { type: Type.STRING }
                  } 
                },
                creditPosition: { 
                  type: Type.OBJECT, 
                  properties: { 
                    previousAuthorization: { type: Type.NUMBER },
                    presentPosition: { type: Type.NUMBER },
                    creditRequested: { type: Type.NUMBER },
                    committedOverOneYear: { type: Type.NUMBER },
                    totalExcludingTrading: { type: Type.NUMBER },
                    tradingLine: { type: Type.NUMBER }
                  } 
                },
                financialInfo: {
                  type: Type.OBJECT,
                  properties: {
                    raroc: {
                      type: Type.OBJECT,
                      properties: {
                        economicRaroc: { type: Type.NUMBER },
                        relationshipRaroc: { type: Type.NUMBER },
                        lccStatus: { type: Type.STRING }
                      }
                    }
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
                        riskAnalyst: { type: Type.STRING }
                      }
                    },
                    details: {
                      type: Type.OBJECT,
                      properties: {
                        tdSic: { type: Type.STRING },
                        industryRisk: { type: Type.STRING },
                        security: { type: Type.STRING },
                        ltv: { type: Type.NUMBER }
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
                        allIn: { type: Type.STRING },
                        upfront: { type: Type.STRING }
                      }
                    },
                    terms: {
                      type: Type.OBJECT,
                      properties: {
                        tenor: { type: Type.STRING },
                        maturity: { type: Type.STRING },
                        extension: { type: Type.STRING }
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
                    positiveCovenants: { type: Type.STRING }
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
                  sourceFile: { type: Type.STRING }
                },
                required: ["fieldPath", "sourceFile"]
              }
            }
          },
          required: ["extractedData", "fieldSources"]
        } as any
      });
      return JSON.parse(response.text || "{}");
    } else {
      const messages = [
        { role: "system", content: "You are a professional credit underwriting assistant. Return JSON only. Be exhaustive in data extraction." },
        { 
          role: "user", 
          content: [
            { type: "text", text: prompt },
            ...fileDataList.filter(f => f.mimeType.startsWith('image/')).map(f => ({
              type: "image_url",
              image_url: { url: `data:${f.mimeType};base64,${f.data}` }
            }))
          ] 
        }
      ];

      const response = await callOpenAI(modelId, messages, { type: "json_object" });
      return JSON.parse(response.choices[0].message.content);
    }
  };

  const result = await callWithRetry(extractData);
  const extracted = result.extractedData || {};
  const rawFieldSources = result.fieldSources || [];
  
  const fieldSources: Record<string, string> = {};
  if (Array.isArray(rawFieldSources)) {
    rawFieldSources.forEach((item: any) => {
      if (item.fieldPath && item.sourceFile) {
        fieldSources[item.fieldPath] = item.sourceFile;
      }
    });
  }

  const synthesizeNarrative = async () => {
    const prompt = `Lead Credit Underwriter synthesis: 
      Documents context: ${JSON.stringify(extracted)}
      Source filenames available: ${fileDataList.map(f => f.name).join(', ')}

      REQUIREMENTS:
      1. Write a professional, detailed executive recommendation for this syndicated loan.
      2. Include Markdown Tables (| Column |) to summarize key deal terms or financial stats.
      3. If applicable, reference exhibits using markdown image syntax: ![Exhibit Description](FILENAME).
      4. Format with bold headers and clear sections.`;

    if (modelConfig.provider === 'google') {
      const response = await callGemini(modelId, [
        ...fileDataList.map(f => ({ inlineData: { data: f.data, mimeType: f.mimeType } })),
        { text: prompt }
      ]);
      return response.text;
    } else {
      const response = await callOpenAI(modelId, [
        { role: "user", content: prompt }
      ]);
      return response.choices[0].message.content;
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
