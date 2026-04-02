import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

export const cvAnalysisSchema = {
  type: Type.OBJECT,
  properties: {
    atsScore: { type: Type.NUMBER, description: "0-100 score" },
    overallGrade: { type: Type.STRING, description: "A, B, C, or D" },
    summary: { type: Type.STRING, description: "2-sentence executive summary" },
    strengths: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Top 3 strengths" },
    criticalIssues: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          issue: { type: Type.STRING },
          fix: { type: Type.STRING },
          priority: { type: Type.STRING, enum: ["high", "medium", "low"] },
        },
        required: ["issue", "fix", "priority"],
      },
      description: "Issues that block ATS parsing",
    },
    keywordsFound: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Relevant UAE market keywords found" },
    keywordsMissing: { type: Type.ARRAY, items: { type: Type.STRING }, description: "High-value keywords absent" },
    formatScore: { type: Type.NUMBER, description: "0-100 — is it ATS-parseable?" },
    contentScore: { type: Type.NUMBER, description: "0-100 — quality of content" },
    uaeSpecificTips: { type: Type.ARRAY, items: { type: Type.STRING }, description: "3 tips specific to UAE job market" },
    suggestedRoles: { type: Type.ARRAY, items: { type: Type.STRING }, description: "5 job titles this CV suits" },
  },
  required: [
    "atsScore", "overallGrade", "summary", "strengths", "criticalIssues",
    "keywordsFound", "keywordsMissing", "formatScore", "contentScore",
    "uaeSpecificTips", "suggestedRoles"
  ],
};

export const scamDetectionSchema = {
  type: Type.OBJECT,
  properties: {
    riskScore: { type: Type.NUMBER, description: "0.0 to 1.0" },
    verdict: { type: Type.STRING, enum: ["safe", "suspicious", "scam"] },
    redFlags: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Specific red flags found" },
    reasoning: { type: Type.STRING, description: "2-3 sentence explanation" },
    safetyTips: { type: Type.ARRAY, items: { type: Type.STRING }, description: "3 actionable tips" },
  },
  required: ["riskScore", "verdict", "redFlags", "reasoning", "safetyTips"],
};

export async function analyzeCV(cvText: string) {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `You are an expert UAE recruitment consultant and ATS specialist. Analyse the CV below for a UAE job market context. \n\nCV TEXT:\n${cvText}`,
    config: {
      responseMimeType: "application/json",
      responseSchema: cvAnalysisSchema,
    },
  });
  return JSON.parse(response.text);
}

export async function detectScam(text: string) {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `You are a UAE employment scam detection expert. Analyse the message/job post below. \n\nTEXT:\n${text}`,
    config: {
      responseMimeType: "application/json",
      responseSchema: scamDetectionSchema,
    },
  });
  return JSON.parse(response.text);
}
