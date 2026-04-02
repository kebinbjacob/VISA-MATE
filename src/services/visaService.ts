import { db } from "../firebase";
import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, orderBy } from "firebase/firestore";
import { Visa, VisaType, VisaStatus } from "../types";
import { differenceInDays, parseISO } from "date-fns";

export interface VisaGuidance {
  steps: string[];
  documents: string[];
  fees: string;
  links: { label: string; url: string }[];
  emergency: string;
}

export async function getUserVisas(userId: string): Promise<Visa[]> {
  const q = query(
    collection(db, "visas"),
    where("userId", "==", userId),
    orderBy("expiryDate", "asc")
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as Visa[];
}

export async function addVisa(userId: string, visaData: Omit<Visa, "id" | "userId" | "createdAt" | "updatedAt">) {
  const newVisa = {
    ...visaData,
    userId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  
  const docRef = await addDoc(collection(db, "visas"), newVisa);
  return docRef.id;
}

export async function updateVisa(visaId: string, userId: string, updates: Partial<Visa>) {
  const visaRef = doc(db, "visas", visaId);
  await updateDoc(visaRef, {
    ...updates,
    userId, // Ensure userId is passed for security rules
    updatedAt: serverTimestamp(),
  });
}

export async function deleteVisa(visaId: string) {
  await deleteDoc(doc(db, "visas", visaId));
}

export function getVisaGuidance(visa: Visa): VisaGuidance {
  const daysRemaining = differenceInDays(parseISO(visa.expiryDate), new Date());

  if (visa.type === "visit") {
    if (daysRemaining < 30) {
      return {
        steps: ["Apply for extension via ICA app", "Pay extension fee", "Receive new entry permit"],
        documents: ["Passport copy", "Old visit visa copy", "Sponsor letter (if applicable)"],
        fees: "AED 600 (30 days extension)",
        links: [{ label: "ICA Smart Services", url: "https://smartservices.icp.gov.ae" }],
        emergency: "GDRFA 24/7: 800 5111",
      };
    }
  }

  if (visa.status === "cancelled") {
    return {
      steps: ["Change status to visit visa", "Apply for job seeker visa", "Depart UAE within grace period"],
      documents: ["Cancellation paper", "Passport copy", "New visa application"],
      fees: "Varies by status change type",
      links: [{ label: "GDRFA Status Inquiry", url: "https://www.gdrfad.gov.ae" }],
      emergency: "MOL: 800 60",
    };
  }

  // Default guidance
  return {
    steps: ["Monitor expiry date", "Prepare renewal documents 1 month before expiry"],
    documents: ["Passport copy", "Emirates ID", "Health insurance"],
    fees: "Varies by sponsor",
    links: [{ label: "UAE Government Portal", url: "https://u.ae" }],
    emergency: "ICA: 600 522222",
  };
}

export function getVisaStatusColor(expiryDate: string) {
  const daysRemaining = differenceInDays(parseISO(expiryDate), new Date());
  if (daysRemaining < 7) return "text-red-600 bg-red-50 border-red-200";
  if (daysRemaining < 30) return "text-amber-600 bg-amber-50 border-amber-200";
  return "text-emerald-600 bg-emerald-50 border-emerald-200";
}
