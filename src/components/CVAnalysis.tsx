import React, { useState, useRef, useEffect } from "react";
import { UploadCloud, FileText, CheckCircle2, AlertTriangle, Key, LayoutTemplate, Sparkles, Copy, Loader2 } from "lucide-react";
import { useAuth } from "./FirebaseProvider";
import { addCVReport, getUserCVReports, CVReport } from "../services/cvService";
import { formatDate } from "../lib/utils";
import { GoogleGenAI, Type } from "@google/genai";

export default function CVAnalysis() {
  const { user } = useAuth();
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [score, setScore] = useState(0);
  const [history, setHistory] = useState<CVReport[]>([]);
  const [currentReport, setCurrentReport] = useState<CVReport | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      loadHistory();
    }
  }, [user]);

  const loadHistory = async () => {
    if (!user) return;
    try {
      const reports = await getUserCVReports(user.uid);
      setHistory(reports);
    } catch (error) {
      console.error("Failed to load CV reports:", error);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = async (selectedFile: File) => {
    setFile(selectedFile);
    setIsAnalyzing(true);
    setShowResults(false);
    setScore(0);
    setCurrentReport(null);
    
    try {
      // Convert file to base64 safely using FileReader
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(selectedFile);
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(',')[1]);
        };
        reader.onerror = error => reject(error);
      });
      const mimeType = selectedFile.type || 'application/pdf';

      // @ts-ignore
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY || (typeof process !== 'undefined' && process.env ? process.env.GEMINI_API_KEY : undefined);
      
      console.log("CV Analysis - API Key loaded:", !!apiKey);
      
      const ai = new GoogleGenAI({ apiKey });
      
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          {
            inlineData: {
              data: base64,
              mimeType: mimeType
            }
          },
          "Analyze this CV for ATS compatibility in the UAE job market. Provide a score, missing keywords, layout improvements, and a rewritten professional summary."
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              score: {
                type: Type.NUMBER,
                description: "ATS compatibility score from 0 to 100",
              },
              keywordsToAdd: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "List of 5-8 important keywords missing from the CV",
              },
              layoutImprovements: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    desc: { type: Type.STRING },
                    type: { type: Type.STRING, description: "Either 'warning' or 'error'" }
                  },
                  required: ["title", "desc", "type"]
                },
                description: "List of layout improvements for ATS parsing",
              },
              summaryRewrite: {
                type: Type.STRING,
                description: "A professionally rewritten summary for the CV",
              }
            },
            required: ["score", "keywordsToAdd", "layoutImprovements", "summaryRewrite"]
          }
        }
      });

      const resultText = response.text;
      if (!resultText) throw new Error("No response from AI");
      
      const parsedResult = JSON.parse(resultText);
      const finalScore = Math.min(Math.max(parsedResult.score, 0), 100);
      setScore(finalScore);
      
      const reportData = {
        fileName: selectedFile.name,
        score: finalScore,
        keywordsToAdd: parsedResult.keywordsToAdd || [],
        layoutImprovements: parsedResult.layoutImprovements || [],
        summaryRewrite: parsedResult.summaryRewrite || ""
      };

      if (user) {
        try {
          await addCVReport(user.uid, reportData);
          await loadHistory();
        } catch (error) {
          console.error("Failed to save CV report:", error);
        }
      }

      setCurrentReport({ ...reportData, userId: user?.uid || '', createdAt: new Date().toISOString() });
      setIsAnalyzing(false);
      setShowResults(true);
    } catch (error) {
      console.error("Analysis failed:", error);
      alert("Failed to analyze CV. Please try again.");
      setIsAnalyzing(false);
    }
  };

  const displayReport = currentReport || history[0];

  return (
    <div className="max-w-6xl mx-auto pb-12">
      <div className="mb-10">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900 mb-4">CV Analyzer</h1>
        <p className="text-gray-600 max-w-2xl text-lg">
          Optimize your resume for the UAE job market with our AI-driven ATS compatibility engine. High-precision feedback for expats.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Upload & History */}
        <div className="space-y-6">
          <div 
            className={`bg-white rounded-3xl p-10 border-2 border-dashed ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-200'} flex flex-col items-center justify-center text-center transition-colors cursor-pointer`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept=".pdf,.doc,.docx"
              onChange={handleFileSelect}
            />
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 mb-6 shadow-sm">
              <UploadCloud className="w-8 h-8" />
            </div>
            <h3 className="font-bold text-xl text-gray-900 mb-2">Upload your Resume</h3>
            <p className="text-sm text-gray-500 mb-8">Drag, drop, or click to select PDF/DOCX</p>
            
            <button className="bg-blue-700 hover:bg-blue-800 text-white font-bold px-8 py-3 rounded-xl transition-colors shadow-sm mb-6 pointer-events-none">
              Select File
            </button>
            <p className="text-xs text-gray-400">Max file size 10MB. AI processing takes ~5 seconds.</p>
          </div>

          {(file || showResults || history.length > 0) && (
            <div className="bg-gray-50 rounded-3xl p-6 border border-gray-100">
              <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">Analysis History</h3>
              <div className="space-y-3">
                {isAnalyzing && file && (
                  <div className="bg-white rounded-2xl p-4 flex items-center justify-between shadow-sm border border-gray-100">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 shrink-0">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div className="truncate">
                        <h4 className="font-bold text-sm text-gray-900 truncate">{file.name}</h4>
                        <p className="text-xs text-gray-500">Analyzing...</p>
                      </div>
                    </div>
                    <Loader2 className="w-5 h-5 text-blue-600 animate-spin shrink-0 ml-2" />
                  </div>
                )}
                
                {history.map((report, idx) => (
                  <div 
                    key={report.id || idx} 
                    onClick={() => {
                      setCurrentReport(report);
                      setShowResults(true);
                      setScore(report.score);
                    }}
                    className={`bg-white rounded-2xl p-4 flex items-center justify-between shadow-sm border cursor-pointer transition-colors ${currentReport?.id === report.id ? 'border-blue-500 ring-1 ring-blue-500' : 'border-gray-100 hover:border-blue-200'}`}
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 shrink-0">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div className="truncate">
                        <h4 className="font-bold text-sm text-gray-900 truncate">{report.fileName}</h4>
                        <p className="text-xs text-gray-500">{formatDate(report.createdAt)}</p>
                      </div>
                    </div>
                    <span className={`font-bold text-lg ml-2 ${report.score >= 80 ? 'text-emerald-600' : report.score >= 60 ? 'text-blue-600' : 'text-amber-500'}`}>{report.score}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Analysis Results */}
        <div className="lg:col-span-2 space-y-6">
          {isAnalyzing ? (
            <div className="bg-white rounded-3xl p-12 border border-gray-100 shadow-sm flex flex-col items-center justify-center text-center h-full min-h-[400px]">
              <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-6" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Scanning Document...</h2>
              <p className="text-gray-500">Extracting keywords and checking ATS compatibility</p>
              <div className="w-64 h-2 bg-gray-100 rounded-full mt-8 overflow-hidden">
                <div className="h-full bg-blue-600 transition-all duration-150" style={{ width: `${(score / 75) * 100}%` }} />
              </div>
            </div>
          ) : (showResults || displayReport) ? (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {/* Top Score Card */}
              <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm flex flex-col sm:flex-row items-center gap-8">
                <div className="relative w-40 h-40 shrink-0">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="40" fill="transparent" stroke="#f3f4f6" strokeWidth="12" />
                    <circle cx="50" cy="50" r="40" fill="transparent" stroke={(displayReport?.score || score) >= 80 ? "#10b981" : (displayReport?.score || score) >= 60 ? "#3b82f6" : "#f59e0b"} strokeWidth="12" strokeDasharray="251.2" strokeDashoffset={251.2 - (251.2 * (displayReport?.score || score)) / 100} strokeLinecap="round" className="transition-all duration-1000 ease-out" />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-4xl font-bold text-gray-900">{displayReport?.score || score}</span>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">ATS Score</span>
                  </div>
                </div>
                
                <div>
                  <span className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full mb-4 inline-block ${(displayReport?.score || score) >= 80 ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'}`}>
                    {(displayReport?.score || score) >= 80 ? 'Excellent Compatibility' : 'Fair Compatibility'}
                  </span>
                  <h2 className="text-2xl font-bold text-gray-900 mb-3 leading-tight">
                    Your profile is getting noticed, but needs optimization.
                  </h2>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    Most Applicant Tracking Systems in the UAE region look for specific structural markers and industry keywords that are currently missing from your document.
                  </p>
                </div>
              </div>

              {/* Keywords to Add */}
              <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600 shrink-0">
                    <Key className="w-4 h-4" />
                  </div>
                  <h3 className="font-bold text-lg text-gray-900">Keywords to Add</h3>
                </div>
                <div className="flex flex-wrap gap-3">
                  {(displayReport?.keywordsToAdd || ['Strategic Roadmap', 'Stakeholder Management', 'Agile Methodologies', 'P&L Responsibility', 'UAE Labour Law']).map(kw => (
                    <span key={kw} className="px-4 py-2 bg-gray-50 border border-gray-200 text-gray-700 text-sm font-semibold rounded-xl flex items-center gap-2">
                      <span className="w-4 h-4 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px] font-bold">+</span> {kw}
                    </span>
                  ))}
                </div>
              </div>

              {/* Layout Improvements */}
              <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center text-emerald-600 shrink-0">
                    <LayoutTemplate className="w-4 h-4" />
                  </div>
                  <h3 className="font-bold text-lg text-gray-900">Layout Improvements</h3>
                </div>
                <div className="space-y-6">
                  {(displayReport?.layoutImprovements || [
                    { title: "Avoid Multi-column Layouts", desc: "Standard ATS parses single-column documents with 30% higher accuracy.", type: "warning" as const },
                    { title: "Remove Header Images", desc: "The image in your header may cause text overlapping during the extraction process.", type: "error" as const }
                  ]).map((improvement, idx) => (
                    <div key={idx} className="flex items-start gap-4">
                      {improvement.type === 'warning' ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                      ) : (
                        <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                      )}
                      <div>
                        <h4 className={`font-bold text-sm mb-1 ${improvement.type === 'warning' ? 'text-gray-900' : 'text-red-600'}`}>{improvement.title}</h4>
                        <p className="text-sm text-gray-600">{improvement.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Summary AI Rewrite */}
              <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-8 h-8 bg-pink-50 rounded-lg flex items-center justify-center text-pink-600 shrink-0">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <h3 className="font-bold text-lg text-gray-900">Summary AI Rewrite</h3>
                </div>
                <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100 relative">
                  <span className="absolute top-4 left-4 text-4xl text-gray-200 font-serif leading-none">"</span>
                  <p className="text-sm text-gray-700 leading-relaxed italic relative z-10 pl-6 pr-2">
                    {displayReport?.summaryRewrite || "Results-oriented professional with extensive experience leading cross-functional teams in high-growth environments. Proven track record of increasing engagement by 40% and launching scalable architectures across GCC markets."}
                  </p>
                  <button 
                    onClick={() => navigator.clipboard.writeText(displayReport?.summaryRewrite || "Results-oriented professional with extensive experience leading cross-functional teams in high-growth environments. Proven track record of increasing engagement by 40% and launching scalable architectures across GCC markets.")}
                    className="mt-6 flex items-center gap-2 text-blue-600 text-xs font-bold hover:text-blue-700 transition-colors"
                  >
                    <Copy className="w-4 h-4" /> Copy to Clipboard
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-3xl p-12 border border-gray-100 shadow-sm flex flex-col items-center justify-center text-center h-full min-h-[400px] text-gray-400">
              <FileText className="w-16 h-16 mb-4 opacity-20" />
              <p className="text-lg font-medium text-gray-500">Upload a CV to see your ATS compatibility score and AI-driven improvements.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
