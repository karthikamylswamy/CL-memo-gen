
// Use static imports for GoogleGenAI and Type as per guidelines
import { GoogleGenAI, Type } from "@google/genai";
import { CreditMemoData } from "../types";

const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 2000;

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function callGeminiWithRetry(apiCall: () => Promise<any>, retries = MAX_RETRIES): Promise<any> {
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
          console.warn(`Gemini API Quota reached (429). Retrying in ${delay}ms... (Attempt ${i + 1}/${retries})`);
          await sleep(delay);
          continue;
        }
      }
      throw error;
    }
  }
  throw lastError;
}

export const processDocumentWithAgents = async (files: File[]): Promise<{ data: Partial<CreditMemoData>, fieldSources: Record<string, string> }> => {
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
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [{
        parts: [
          ...fileDataList.map(f => ({ inlineData: { data: f.data, mimeType: f.mimeType } })),
          { text: `
            Act as a Senior Syndicate Credit Officer.
            You have received documents: ${fileDataList.map(f => f.name).join(', ')}.
            
            Task: Exhaustively extract data from ALL documents.
            
            EXTREMELY IMPORTANT: For every value you extract, you MUST identify which file it came from.
            Return a JSON object with two top-level keys:
            1. "extractedData": The structured CreditMemoData.
            2. "fieldSources": An array of objects, where each object has "fieldPath" (e.g. "primaryBorrower.borrowerName") and "sourceFile" (the EXACT FILENAME from the list above).
            
            Guidelines:
            - Capture both internal (proposed) and external agency ratings.
            - Populate riskAssessment.borrowerRating and riskAssessment.publicRatings.
            - Extract specific legal terms like negative/positive/financial covenants, reporting requirements, and funding conditions.
            
            Output strictly valid JSON.
          ` }
        ]
      }],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
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
                    accountClassification: { type: Type.STRING }
                  }
                },
                documentation: {
                  type: Type.OBJECT,
                  properties: {
                    agreementType: { type: Type.STRING },
                    date: { type: Type.STRING },
                    negativeCovenants: { type: Type.STRING },
                    positiveCovenants: { type: Type.STRING },
                    financialCovenants: { type: Type.STRING },
                    reportingReqs: { type: Type.STRING },
                    fundingConditions: { type: Type.STRING }
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
                        newRaPolicy: { type: Type.STRING },
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
                        fee: { type: Type.STRING }
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
                }
              }
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
      }
    });
    return JSON.parse(response.text || "{}");
  };

  const result = await callGeminiWithRetry(extractData);
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
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `
        You are the Lead Credit Underwriter. 
        Analyze the extracted data from ${files.length} deal documents: ${JSON.stringify(extracted)}
        Write a professional executive recommendation.
      `
    });
    return response.text;
  };

  const narrative = await callGeminiWithRetry(synthesizeNarrative);

  const finalData = {
    ...extracted,
    analysis: {
      ...(extracted.analysis || {}),
      justification: {
        recommendation: narrative
      }
    }
  };

  return { data: finalData, fieldSources };
};
