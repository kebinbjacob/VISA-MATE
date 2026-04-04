import { db } from "../firebase";
import { collection, query, where, getDocs, addDoc, serverTimestamp, orderBy } from "firebase/firestore";
import { GoogleGenAI, Type } from "@google/genai";
import { CVData } from "../types";

export interface CVReport {
  id?: string;
  userId: string;
  fileName: string;
  score: number;
  keywordsToAdd: string[];
  layoutImprovements: { title: string; desc: string; type: 'warning' | 'error' }[];
  summaryRewrite: string;
  createdAt: string;
}

export async function getUserCVReports(userId: string): Promise<CVReport[]> {
  const q = query(
    collection(db, "cvReports"),
    where("userId", "==", userId),
    orderBy("createdAt", "desc")
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as CVReport[];
}

export async function addCVReport(userId: string, reportData: Omit<CVReport, "id" | "userId" | "createdAt">) {
  const newReport = {
    ...reportData,
    userId,
    createdAt: serverTimestamp(),
  };
  
  const docRef = await addDoc(collection(db, "cvReports"), newReport);
  return docRef.id;
}

export async function enhanceSummary(summary: string, headline: string): Promise<string> {
  try {
    // @ts-ignore
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY || (typeof process !== 'undefined' && process.env ? process.env.GEMINI_API_KEY : undefined);
    
    console.log("CV Service - API Key loaded:", !!apiKey);
    
    if (!apiKey) {
      console.warn("No Gemini API key found for CV enhancement.");
      return summary;
    }

    const ai = new GoogleGenAI({ apiKey });
    
    const prompt = `You are a professional CV writer specializing in the UAE job market. 
    Enhance the following professional summary for a candidate with the headline: "${headline}".
    
    Original Summary: "${summary}"
    
    Requirements:
    - Professional and impactful tone.
    - Highlight key expertise and achievements.
    - Keep it concise (3-4 sentences).
    - Tailor it for UAE employers.
    
    Return ONLY the enhanced summary text. No explanations or conversational text.`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        temperature: 0.7,
      }
    });

    return response.text || summary;
  } catch (error) {
    console.error("Error enhancing summary via Gemini:", error);
    return summary;
  }
}

export async function extractCVData(fileBase64: string, mimeType: string): Promise<Partial<CVData>> {
  try {
    // @ts-ignore
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY || (typeof process !== 'undefined' && process.env ? process.env.GEMINI_API_KEY : undefined);
    
    if (!apiKey) {
      throw new Error("No Gemini API key found for CV extraction.");
    }

    const ai = new GoogleGenAI({ apiKey });
    
    const prompt = `Extract the candidate's CV data from the provided document.
    Format the output exactly according to the provided JSON schema.
    Ensure that the summary is professional.
    For dates, use a consistent format like "MMM YYYY" (e.g., "Jan 2020").
    If a field is not found, leave it empty or omit it.`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          inlineData: {
            data: fileBase64,
            mimeType: mimeType
          }
        },
        prompt
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING, description: "Professional summary" },
            experience: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  company: { type: Type.STRING },
                  position: { type: Type.STRING },
                  location: { type: Type.STRING },
                  startDate: { type: Type.STRING },
                  endDate: { type: Type.STRING },
                  current: { type: Type.BOOLEAN },
                  description: { type: Type.STRING, description: "Bullet points or paragraph of responsibilities" }
                }
              }
            },
            education: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  institution: { type: Type.STRING },
                  degree: { type: Type.STRING },
                  field: { type: Type.STRING },
                  startDate: { type: Type.STRING },
                  endDate: { type: Type.STRING }
                }
              }
            },
            skills: { type: Type.ARRAY, items: { type: Type.STRING } },
            languages: { type: Type.ARRAY, items: { type: Type.STRING } },
            certifications: { type: Type.ARRAY, items: { type: Type.STRING } },
            dateOfBirth: { type: Type.STRING },
            nationality: { type: Type.STRING },
            visaStatus: { type: Type.STRING },
            noticePeriod: { type: Type.STRING },
            linkedin: { type: Type.STRING },
            github: { type: Type.STRING }
          }
        }
      }
    });

    if (!response.text) {
      throw new Error("Empty response from AI");
    }

    return JSON.parse(response.text);
  } catch (error) {
    console.error("Error extracting CV data via Gemini:", error);
    throw error;
  }
}

export async function enhanceExperienceDescription(description: string, position: string, company: string): Promise<string> {
  try {
    // @ts-ignore
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY || (typeof process !== 'undefined' && process.env ? process.env.GEMINI_API_KEY : undefined);
    
    if (!apiKey) {
      console.warn("No Gemini API key found for CV enhancement.");
      return description;
    }

    const ai = new GoogleGenAI({ apiKey });
    
    const prompt = `You are a professional CV writer specializing in the UAE job market. 
    Enhance the following work experience description for a candidate who worked as a "${position}" at "${company}".
    
    Original Description:
    "${description}"
    
    Requirements:
    - Professional, action-oriented tone.
    - Use strong action verbs (e.g., Spearheaded, Orchestrated, Optimized).
    - Focus on achievements and quantifiable results where possible.
    - Format as a clean, bulleted list or a cohesive paragraph, whichever fits best.
    - Tailor it for UAE employers (emphasize leadership, efficiency, and scale).
    
    Return ONLY the enhanced description text. No explanations or conversational text.`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        temperature: 0.7,
      }
    });

    return response.text || description;
  } catch (error) {
    console.error("Error enhancing experience description via Gemini:", error);
    return description;
  }
}
