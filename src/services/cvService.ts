import { db } from "../firebase";
import { collection, query, where, getDocs, addDoc, serverTimestamp, orderBy } from "firebase/firestore";
import { GoogleGenAI } from "@google/genai";

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
