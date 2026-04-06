import { supabase } from "../supabase";
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
  const { data, error } = await supabase
    .from('visas')
    .select('*')
    .eq('user_id', userId)
    .order('expiry_date', { ascending: true });

  if (error) {
    console.error("Error fetching visas:", error);
    return [];
  }

  return data.map(visa => ({
    id: visa.id,
    userId: visa.user_id,
    type: visa.type,
    sponsor: visa.sponsor,
    expiryDate: visa.expiry_date,
    status: visa.status,
    notes: visa.notes,
    createdAt: visa.created_at,
    updatedAt: visa.updated_at
  })) as Visa[];
}

export async function addVisa(userId: string, visaData: Omit<Visa, "id" | "userId" | "createdAt" | "updatedAt">) {
  const newVisa = {
    user_id: userId,
    type: visaData.type,
    sponsor: visaData.sponsor,
    expiry_date: visaData.expiryDate,
    status: visaData.status,
    notes: visaData.notes
  };
  
  const { data, error } = await supabase
    .from('visas')
    .insert([newVisa])
    .select()
    .single();

  if (error) throw error;
  return data.id;
}

export async function updateVisa(visaId: string, userId: string, updates: Partial<Visa>) {
  const updateData: any = {
    updated_at: new Date().toISOString()
  };
  
  if (updates.type) updateData.type = updates.type;
  if (updates.sponsor) updateData.sponsor = updates.sponsor;
  if (updates.expiryDate) updateData.expiry_date = updates.expiryDate;
  if (updates.status) updateData.status = updates.status;
  if (updates.notes !== undefined) updateData.notes = updates.notes;

  const { error } = await supabase
    .from('visas')
    .update(updateData)
    .eq('id', visaId)
    .eq('user_id', userId); // Extra safety check

  if (error) throw error;
}

export async function deleteVisa(visaId: string) {
  const { error } = await supabase
    .from('visas')
    .delete()
    .eq('id', visaId);

  if (error) throw error;
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
