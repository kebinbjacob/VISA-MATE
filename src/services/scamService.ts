import { supabase } from "../supabase";

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
  const { data, error } = await supabase
    .from('scam_reports')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Error fetching scam reports:", error);
    return [];
  }

  return data.map(report => ({
    id: report.id,
    userId: report.user_id,
    content: report.content,
    sourceType: report.source_type,
    riskScore: report.risk_score,
    verdict: report.verdict,
    aiReasoning: report.ai_reasoning,
    communityFlags: report.community_flags,
    createdAt: report.created_at
  })) as ScamReport[];
}

export async function addScamReport(userId: string, reportData: Omit<ScamReport, "id" | "userId" | "createdAt">) {
  const newReport = {
    user_id: userId,
    content: reportData.content,
    source_type: reportData.sourceType,
    risk_score: reportData.riskScore,
    verdict: reportData.verdict,
    ai_reasoning: reportData.aiReasoning,
    community_flags: reportData.communityFlags
  };
  
  const { data, error } = await supabase
    .from('scam_reports')
    .insert([newReport])
    .select()
    .single();

  if (error) throw error;
  return data.id;
}
