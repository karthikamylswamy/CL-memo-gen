
import { CreditMemoData } from "../types";

export const processDocumentWithAgents = async (files: File[]): Promise<Partial<CreditMemoData>> => {
  // 1. Prepare ALL files as base64 parts
  const filePromises = files.map(file => {
    return new Promise<{data: string, mimeType: string}>((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64 = (e.target?.result as string).split(',')[1];
        resolve({ data: base64, mimeType: file.type });
      };
      reader.readAsDataURL(file);
    });
  });

  const fileDataList = await Promise.all(filePromises);

  const { GoogleGenAI, Type } = await import("@google/genai");
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  // 2. FieldExtractionAgent - Explicit multi-document synthesis instruction
  const extractionResponse = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: [{
      parts: [
        ...fileDataList.map(f => ({ inlineData: f })),
        { text: `
          Act as a Senior Syndicate Credit Officer. 
          I have uploaded ${files.length} documents. 
          Analyze EVERY document provided to extract data for a comprehensive Credit Memo. 
          Synthesize information across all files. 
          Ensure you capture the borrower name, facility terms, financial covenants, and company overview. 
          Output as structured JSON.
        ` }
      ]
    }],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
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
          creditPosition: {
            type: Type.OBJECT,
            properties: {
              creditRequested: { type: Type.NUMBER },
              previousAuthorization: { type: Type.NUMBER },
              tradingLine: { type: Type.NUMBER }
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
        }
      } as any
    }
  });

  const extracted = JSON.parse(extractionResponse.text || "{}");

  // 3. SynthesisAgent - Build the narrative based on the whole set
  const synthesisResponse = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: [{ text: `
      You are the Lead Credit Underwriter. 
      Review the extracted data from ALL provided deal documents: ${JSON.stringify(extracted)}. 
      Synthesize a final executive recommendation narrative for the Credit Committee. 
      Analyze the overall risk profile and justify the credit request.
    ` }]
  });

  const narrative = synthesisResponse.text;

  return {
    ...extracted,
    analysis: {
      ...extracted.analysis,
      justification: {
        recommendation: narrative
      }
    },
    compliance: { 
      signOff: { 
        name: "CIB Credit Committee", 
        title: "Senior Adjudicator", 
        date: new Date().toISOString().split('T')[0], 
        approver: "Tier 1 Executive" 
      } 
    }
  };
};
