import React, { useState, useRef, useEffect } from "react";
import { AlertTriangle, UploadCloud, Zap, ShieldAlert, FileText, MessageSquare, HelpCircle, Share2, FileWarning, AlertOctagon, Info, CheckCircle2 } from "lucide-react";
import { useAuth } from "./FirebaseProvider";
import { addScamReport, getUserScamReports, ScamReport } from "../services/scamService";
import { formatDate } from "../lib/utils";
import { GoogleGenAI, Type } from "@google/genai";

export default function ScamDetector() {
  const { user } = useAuth();
  const [text, setText] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [results, setResults] = useState<{score: number, flags: any[], obs: any[]} | null>(null);
  const [history, setHistory] = useState<ScamReport[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      loadHistory();
    }
  }, [user]);

  const loadHistory = async () => {
    if (!user) return;
    try {
      const reports = await getUserScamReports(user.uid);
      setHistory(reports);
    } catch (error) {
      console.error("Failed to load scam reports:", error);
    }
  };

  const handleAnalyze = async () => {
    if (!text.trim()) return;
    setIsAnalyzing(true);
    
    try {
      // @ts-ignore
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY || (typeof process !== 'undefined' && process.env ? process.env.GEMINI_API_KEY : undefined);
      
      console.log("Scam Detector - API Key loaded:", !!apiKey);
      
      const ai = new GoogleGenAI({ apiKey });
      
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Analyze the following job offer or communication for potential scam or fraud indicators, specifically in the context of UAE employment. 
        
        Text to analyze:
        """
        ${text}
        """
        `,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              score: {
                type: Type.NUMBER,
                description: "Risk score from 0 to 100, where 100 is definitely a scam.",
              },
              flags: {
                type: Type.ARRAY,
                description: "Critical red flags found in the text.",
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    desc: { type: Type.STRING }
                  },
                  required: ["title", "desc"]
                }
              },
              obs: {
                type: Type.ARRAY,
                description: "Secondary observations or minor warnings.",
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    desc: { type: Type.STRING }
                  },
                  required: ["title", "desc"]
                }
              }
            },
            required: ["score", "flags", "obs"]
          }
        }
      });

      const resultText = response.text;
      if (!resultText) throw new Error("No response from AI");
      
      const parsedResult = JSON.parse(resultText);
      const finalScore = Math.min(Math.max(parsedResult.score, 0), 100);
      
      setResults({
        score: finalScore,
        flags: parsedResult.flags || [],
        obs: parsedResult.obs || []
      });

      if (user) {
        let verdict: 'safe' | 'suspicious' | 'scam' = 'safe';
        if (finalScore > 60) verdict = 'scam';
        else if (finalScore > 30) verdict = 'suspicious';

        try {
          await addScamReport(user.uid, {
            content: text.substring(0, 5000),
            sourceType: "text",
            riskScore: finalScore / 100,
            verdict,
            aiReasoning: [...(parsedResult.flags || []), ...(parsedResult.obs || [])].map((f: any) => f.title).join(", "),
            communityFlags: 0
          });
          await loadHistory();
        } catch (error) {
          console.error("Failed to save scam report:", error);
        }
      }
    } catch (error) {
      console.error("Analysis failed:", error);
      alert("Failed to analyze text. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      // Simulate OCR extraction
      setText("Dear Candidate,\n\nWe are pleased to offer you the position. Please note there is an urgent visa processing fee of AED 1,500 required to secure your spot. Kindly transfer the deposit via Western Union.\n\nRegards,\nHR Dept (hr.company@gmail.com)");
      // Auto analyze after "extraction"
      setTimeout(handleAnalyze, 500);
    }
  };

  return (
    <div className="max-w-6xl mx-auto pb-12">
      <div className="mb-10">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900 mb-4">Scam Shield</h1>
        <p className="text-gray-600 max-w-2xl text-lg">
          Detect fraudulent job offers before you commit. Our AI-powered analyzer identifies predatory patterns in UAE-based employment contracts.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
        {/* Paste Offer Details */}
        <div className="lg:col-span-2 bg-gray-50 rounded-3xl p-8 border border-gray-100 flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-lg text-gray-900">Paste Offer Details</h3>
            <span className="px-3 py-1 bg-blue-100 text-blue-700 text-[10px] font-bold uppercase tracking-wider rounded-full">
              AI Detection Active
            </span>
          </div>
          
          <textarea 
            className="w-full flex-1 min-h-[200px] p-6 bg-white border border-gray-200 rounded-2xl text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none mb-6 shadow-sm"
            placeholder="Paste the job email content or offer letter text here... (Try pasting something asking for a 'fee' and using a '@gmail.com' address)"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          
          <div className="flex justify-end">
            <button 
              onClick={handleAnalyze}
              disabled={isAnalyzing || !text.trim()}
              className="bg-blue-700 hover:bg-blue-800 text-white font-bold px-8 py-3 rounded-xl transition-colors shadow-sm flex items-center gap-2 disabled:opacity-70"
            >
              {isAnalyzing ? "Analyzing..." : "Analyze Offer"} <Zap className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Right Column: Upload & History */}
        <div className="space-y-6">
          {/* Screenshot Upload */}
          <div 
            className="bg-gray-50 rounded-3xl p-8 border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-center hover:bg-gray-100 transition-colors cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*"
              onChange={handleFileUpload}
            />
            <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600 mb-6 shadow-sm">
              <UploadCloud className="w-8 h-8" />
            </div>
            <h3 className="font-bold text-lg text-gray-900 mb-2">Screenshot Upload</h3>
            <p className="text-sm text-gray-500 mb-8 max-w-[200px]">Drag and drop your offer letter images here.</p>
            
            <button className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold px-6 py-2.5 rounded-xl transition-colors text-sm pointer-events-none">
              Browse Files
            </button>
          </div>

          {/* History */}
          {history.length > 0 && (
            <div className="bg-gray-50 rounded-3xl p-6 border border-gray-100">
              <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">Recent Scans</h3>
              <div className="space-y-3">
                {history.slice(0, 3).map((report, idx) => (
                  <div key={report.id || idx} className="bg-white rounded-2xl p-4 flex items-center justify-between shadow-sm border border-gray-100">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${report.verdict === 'scam' ? 'bg-red-50 text-red-600' : report.verdict === 'suspicious' ? 'bg-orange-50 text-orange-600' : 'bg-emerald-50 text-emerald-600'}`}>
                        {report.verdict === 'scam' ? <AlertOctagon className="w-5 h-5" /> : report.verdict === 'suspicious' ? <AlertTriangle className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
                      </div>
                      <div className="truncate">
                        <h4 className="font-bold text-sm text-gray-900 truncate capitalize">{report.verdict}</h4>
                        <p className="text-xs text-gray-500">{formatDate(report.createdAt)}</p>
                      </div>
                    </div>
                    <span className={`font-bold text-sm ml-2 ${report.verdict === 'scam' ? 'text-red-600' : report.verdict === 'suspicious' ? 'text-orange-600' : 'text-emerald-600'}`}>
                      {Math.round(report.riskScore * 100)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Results Section */}
      {results && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Risk Assessment Banner */}
          <div className={`rounded-3xl p-8 border flex flex-col sm:flex-row items-center justify-between gap-6 relative overflow-hidden ${results.score > 60 ? 'bg-red-50 border-red-100' : results.score > 30 ? 'bg-orange-50 border-orange-100' : 'bg-emerald-50 border-emerald-100'}`}>
            <div className={`absolute -left-20 -top-20 w-64 h-64 rounded-full blur-3xl pointer-events-none ${results.score > 60 ? 'bg-red-100' : results.score > 30 ? 'bg-orange-100' : 'bg-emerald-100'}`} />
            
            <div className="flex items-center gap-6 relative z-10">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center text-white shadow-lg shrink-0 ${results.score > 60 ? 'bg-red-600 shadow-red-600/30' : results.score > 30 ? 'bg-orange-500 shadow-orange-500/30' : 'bg-emerald-600 shadow-emerald-600/30'}`}>
                {results.score > 60 ? <AlertOctagon className="w-8 h-8" /> : results.score > 30 ? <AlertTriangle className="w-8 h-8" /> : <CheckCircle2 className="w-8 h-8" />}
              </div>
              <div>
                <p className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${results.score > 60 ? 'text-red-800' : results.score > 30 ? 'text-orange-800' : 'text-emerald-800'}`}>Risk Assessment</p>
                <h2 className={`text-3xl font-bold tracking-tight ${results.score > 60 ? 'text-red-700' : results.score > 30 ? 'text-orange-700' : 'text-emerald-700'}`}>
                  {results.score > 60 ? 'Highly Suspicious' : results.score > 30 ? 'Moderate Risk' : 'Looks Safe'}
                </h2>
              </div>
            </div>
            
            <div className="text-right relative z-10">
              <p className={`text-4xl font-bold tracking-tight ${results.score > 60 ? 'text-red-700' : results.score > 30 ? 'text-orange-700' : 'text-emerald-700'}`}>{results.score}%</p>
              <p className={`text-xs font-semibold mt-1 ${results.score > 60 ? 'text-red-800' : results.score > 30 ? 'text-orange-800' : 'text-emerald-800'}`}>Probability of Fraud</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Critical Red Flags */}
            <div className="space-y-6">
              <div className="flex items-center gap-2 mb-2">
                <AlertOctagon className={`w-5 h-5 ${results.flags.length > 0 ? 'text-red-600' : 'text-gray-400'}`} />
                <h3 className="font-bold text-lg text-gray-900">Critical Red Flags</h3>
              </div>
              
              {results.flags.length > 0 ? results.flags.map((flag, i) => (
                <div key={i} className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex items-start gap-4">
                  <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center text-red-600 shrink-0 mt-1">
                    <FileWarning className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 mb-2">{flag.title}</h4>
                    <p className="text-sm text-gray-600 leading-relaxed">{flag.desc}</p>
                  </div>
                </div>
              )) : (
                <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm text-center text-gray-500">
                  No critical red flags detected.
                </div>
              )}
            </div>

            {/* Secondary Observations & Actions */}
            <div className="space-y-6">
              <div className="flex items-center gap-2 mb-2">
                <Info className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-lg text-gray-900">Secondary Observations</h3>
              </div>
              
              {results.obs.length > 0 ? results.obs.map((ob, i) => (
                <div key={i} className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex items-start gap-4">
                  <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 shrink-0 mt-1">
                    <Info className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 mb-2">{ob.title}</h4>
                    <p className="text-sm text-gray-600 leading-relaxed">{ob.desc}</p>
                  </div>
                </div>
              )) : (
                <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm text-center text-gray-500">
                  No secondary observations.
                </div>
              )}

              <div className="bg-gray-50 rounded-3xl p-6 border border-gray-100">
                <h4 className="font-bold text-sm text-gray-900 mb-4 text-center">Recommended Actions</h4>
                <div className="space-y-3">
                  <button className="w-full bg-white border border-gray-200 hover:border-blue-300 hover:bg-blue-50 text-gray-900 font-bold py-3 px-4 rounded-xl transition-colors flex items-center justify-center gap-2 shadow-sm text-sm">
                    <ShieldAlert className="w-4 h-4 text-blue-600" /> Report to MOHRE
                  </button>
                  <button className="w-full bg-white border border-gray-200 hover:border-blue-300 hover:bg-blue-50 text-gray-900 font-bold py-3 px-4 rounded-xl transition-colors flex items-center justify-center gap-2 shadow-sm text-sm">
                    <Share2 className="w-4 h-4 text-blue-600" /> Share with Community
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Common Fraud Tactics */}
      <div className="mt-16">
        <h2 className="text-2xl font-bold text-gray-900 mb-8">Common Fraud Tactics in the UAE</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 mb-4">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-gray-900 mb-2 text-sm">Fake Recruitment Agencies</h4>
            <p className="text-xs text-gray-500 leading-relaxed">Unlicensed agents claiming to have "direct quotas" with government entities.</p>
          </div>
          <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 mb-4">
              <FileText className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-gray-900 mb-2 text-sm">Forged Seals</h4>
            <p className="text-xs text-gray-500 leading-relaxed">Offers using realistic but forged logos of the Ministry of Human Resources.</p>
          </div>
          <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 mb-4">
              <MessageSquare className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-gray-900 mb-2 text-sm">WhatsApp Hiring</h4>
            <p className="text-xs text-gray-500 leading-relaxed">Legitimate firms rarely conduct the entire hiring process via instant messaging apps.</p>
          </div>
          <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 mb-4">
              <HelpCircle className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-gray-900 mb-2 text-sm">No Interview</h4>
            <p className="text-xs text-gray-500 leading-relaxed">Receiving an offer without a single video call or face-to-face meeting is a major flag.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
