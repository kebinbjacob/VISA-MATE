import { db } from "../firebase";
import { collection, query, where, getDocs, addDoc, serverTimestamp, orderBy } from "firebase/firestore";

export interface ScamReport {
  id?: string;
  userId: string;
  content: string;
  sourceType: string;
  riskScore: number;
  verdict: 'safe' | 'suspicious' | 'scam';
  aiReasoning: string;
  communityFlags: number;
  createdAt?: any;
}

export async function getUserScamReports(userId: string): Promise<ScamReport[]> {
  const q = query(
    collection(db, "scam_reports"),
    where("userId", "==", userId),
    orderBy("createdAt", "desc")
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as ScamReport[];
}

export async function addScamReport(userId: string, reportData: Omit<ScamReport, "id" | "userId" | "createdAt">) {
  const newReport = {
    ...reportData,
    userId,
    createdAt: serverTimestamp(),
  };
  
  const docRef = await addDoc(collection(db, "scam_reports"), newReport);
  return docRef.id;
}
