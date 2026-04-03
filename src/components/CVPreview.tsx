import React, { useRef, useState } from "react";
import { UserProfile, CVData } from "../types";
import { Mail, Phone, MapPin, Globe, Linkedin, Download, FileText, LayoutTemplate, AlignLeft } from "lucide-react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

interface CVPreviewProps {
  profile: UserProfile;
  cvData: CVData;
}

export default function CVPreview({ profile, cvData }: CVPreviewProps) {
  const cvRef = useRef<HTMLDivElement>(null);
  const [template, setTemplate] = useState<"modern" | "ats">("modern");

  const exportToPDF = async () => {
    if (!cvRef.current) return;

    try {
      const canvas = await html2canvas(cvRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
      });
      
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
      const imgX = (pdfWidth - imgWidth * ratio) / 2;
      const imgY = 0;

      pdf.addImage(imgData, "PNG", imgX, imgY, imgWidth * ratio, imgHeight * ratio);
      pdf.save(`${profile.name.replace(/\s+/g, "_")}_CV.pdf`);
    } catch (error) {
      console.error("Error generating PDF:", error);
    }
  };

  return (
    <div className="space-y-6">
      <style>{`
        .cv-preview-container {
          --color-white: #ffffff;
          --color-black: #000000;
          --color-gray-50: #f9fafb;
          --color-gray-100: #f3f4f6;
          --color-gray-200: #e5e7eb;
          --color-gray-400: #9ca3af;
          --color-gray-500: #6b7280;
          --color-gray-600: #4b5563;
          --color-gray-700: #374151;
          --color-gray-800: #1f2937;
          --color-gray-900: #111827;
          --color-blue-50: #eff6ff;
          --color-blue-100: #dbeafe;
          --color-blue-600: #2563eb;
        }
        .cv-preview-container .bg-white { background-color: var(--color-white) !important; }
        .cv-preview-container .text-gray-800 { color: var(--color-gray-800) !important; }
        .cv-preview-container .border-blue-600 { border-color: var(--color-blue-600) !important; }
        .cv-preview-container .border-blue-100 { border-color: var(--color-blue-100) !important; }
        .cv-preview-container .text-gray-900 { color: var(--color-gray-900) !important; }
        .cv-preview-container .text-blue-600 { color: var(--color-blue-600) !important; }
        .cv-preview-container .text-gray-600 { color: var(--color-gray-600) !important; }
        .cv-preview-container .text-gray-500 { color: var(--color-gray-500) !important; }
        .cv-preview-container .text-gray-400 { color: var(--color-gray-400) !important; }
        .cv-preview-container .text-gray-700 { color: var(--color-gray-700) !important; }
        .cv-preview-container .border-gray-200 { border-color: var(--color-gray-200) !important; }
        .cv-preview-container .border-gray-100 { border-color: var(--color-gray-100) !important; }
        .cv-preview-container .bg-blue-50 { background-color: var(--color-blue-50) !important; }
        .cv-preview-container .bg-gray-100 { background-color: var(--color-gray-100) !important; }
        .cv-preview-container .bg-gray-50 { background-color: var(--color-gray-50) !important; }
        .cv-preview-container .text-black { color: var(--color-black) !important; }
        .cv-preview-container .border-black { border-color: var(--color-black) !important; }
      `}</style>
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setTemplate("modern")}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
              template === "modern" ? "bg-white text-blue-600 shadow-sm" : "text-gray-600 hover:text-gray-900"
            }`}
          >
            <LayoutTemplate className="w-4 h-4" /> Modern
          </button>
          <button
            onClick={() => setTemplate("ats")}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
              template === "ats" ? "bg-white text-blue-600 shadow-sm" : "text-gray-600 hover:text-gray-900"
            }`}
          >
            <AlignLeft className="w-4 h-4" /> ATS Friendly
          </button>
        </div>
        <button
          onClick={exportToPDF}
          className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-lg font-semibold hover:bg-blue-700 transition-colors shadow-sm"
        >
          <Download className="w-4 h-4" /> Export PDF
        </button>
      </div>

      <div className="bg-white shadow-xl border border-gray-200 rounded-lg overflow-hidden flex justify-center overflow-x-auto cv-preview-container">
        {template === "modern" ? (
          <div 
            ref={cvRef} 
            className="p-12 bg-white text-gray-800 font-sans leading-relaxed shrink-0"
            style={{ width: "210mm", minHeight: "297mm" }}
          >
            {/* Header */}
            <header className="border-b-2 border-blue-600 pb-6 mb-8 flex gap-6 items-center">
              {profile.photoUrl && (
                <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-blue-100 shrink-0">
                  <img src={profile.photoUrl} alt={profile.name} className="w-full h-full object-cover" crossOrigin="anonymous" />
                </div>
              )}
              <div className="flex-1">
                <h1 className="text-4xl font-bold text-gray-900 mb-2 uppercase tracking-tight">{profile.name}</h1>
                <p className="text-xl text-blue-600 font-semibold mb-4">{profile.headline || "Professional"}</p>
                
                <div className="grid grid-cols-2 gap-y-2 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <span>{profile.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <span>{profile.phone || "N/A"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    <span>{profile.location || "UAE"}</span>
                  </div>
                  {cvData.linkedin && (
                    <div className="flex items-center gap-2">
                      <Linkedin className="w-4 h-4 text-gray-400" />
                      <span className="truncate">{cvData.linkedin}</span>
                    </div>
                  )}
                </div>
              </div>
            </header>

            {/* Summary */}
            {cvData.summary && (
              <section className="mb-8">
                <h2 className="text-lg font-bold text-gray-900 uppercase border-b border-gray-200 pb-1 mb-3 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-600" /> Professional Summary
                </h2>
                <p className="text-gray-700 text-sm whitespace-pre-wrap">{cvData.summary}</p>
              </section>
            )}

            {/* Experience */}
            {cvData.experience.length > 0 && (
              <section className="mb-8">
                <h2 className="text-lg font-bold text-gray-900 uppercase border-b border-gray-200 pb-1 mb-4 flex items-center gap-2">
                  <Globe className="w-5 h-5 text-blue-600" /> Professional Experience
                </h2>
                <div className="space-y-6">
                  {cvData.experience.map((exp, index) => (
                    <div key={index} className="relative pl-4 border-l-2 border-gray-100">
                      <div className="flex justify-between items-start mb-1">
                        <h3 className="font-bold text-gray-900">{exp.position}</h3>
                        <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded">
                          {exp.startDate} - {exp.current ? "Present" : exp.endDate}
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-gray-600 mb-2">{exp.company} | {exp.location}</p>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{exp.description}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Education */}
            {cvData.education.length > 0 && (
              <section className="mb-8">
                <h2 className="text-lg font-bold text-gray-900 uppercase border-b border-gray-200 pb-1 mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-600" /> Education
                </h2>
                <div className="grid grid-cols-1 gap-4">
                  {cvData.education.map((edu, index) => (
                    <div key={index} className="flex justify-between items-start">
                      <div>
                        <h3 className="font-bold text-gray-900">{edu.degree} in {edu.field}</h3>
                        <p className="text-sm text-gray-600">{edu.institution}</p>
                      </div>
                      <span className="text-xs text-gray-500">{edu.startDate} - {edu.endDate}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Skills & Languages */}
            <div className="grid grid-cols-2 gap-8 mb-8">
              {cvData.skills.length > 0 && (
                <section>
                  <h2 className="text-lg font-bold text-gray-900 uppercase border-b border-gray-200 pb-1 mb-3">Skills</h2>
                  <div className="flex flex-wrap gap-2">
                    {cvData.skills.map((skill, index) => (
                      <span key={index} className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded border border-gray-200">
                        {skill}
                      </span>
                    ))}
                  </div>
                </section>
              )}
              {cvData.languages.length > 0 && (
                <section>
                  <h2 className="text-lg font-bold text-gray-900 uppercase border-b border-gray-200 pb-1 mb-3">Languages</h2>
                  <div className="flex flex-wrap gap-2">
                    {cvData.languages.map((lang, index) => (
                      <span key={index} className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded border border-gray-200">
                        {lang}
                      </span>
                    ))}
                  </div>
                </section>
              )}
            </div>

            {/* UAE Specific Info */}
            <section className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <h2 className="text-sm font-bold text-gray-900 uppercase mb-3">Personal Information (UAE Market)</h2>
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-gray-500 block mb-1">Nationality</span>
                  <span className="font-semibold text-gray-900">{profile.nationality || "N/A"}</span>
                </div>
                <div>
                  <span className="text-gray-500 block mb-1">Visa Status</span>
                  <span className="font-semibold text-gray-900 capitalize">{profile.visaStatus || "N/A"}</span>
                </div>
                <div>
                  <span className="text-gray-500 block mb-1">Notice Period</span>
                  <span className="font-semibold text-gray-900">{cvData.noticePeriod || "Immediate"}</span>
                </div>
                <div>
                  <span className="text-gray-500 block mb-1">Current Location</span>
                  <span className="font-semibold text-gray-900">{profile.location || "UAE"}</span>
                </div>
              </div>
            </section>
          </div>
        ) : (
          <div 
            ref={cvRef} 
            className="p-12 bg-white text-black font-serif leading-relaxed shrink-0"
            style={{ width: "210mm", minHeight: "297mm", fontFamily: "'Times New Roman', Times, serif" }}
          >
            {/* Header */}
            <header className="text-center mb-6">
              <h1 className="text-3xl font-bold mb-1 uppercase tracking-wider">{profile.name}</h1>
              <p className="text-base mb-2">{profile.headline}</p>
              <p className="text-sm">{profile.location}</p>
              <p className="text-sm mt-1">
                {profile.phone} &mdash; {profile.email} {cvData.linkedin && <>&mdash; {cvData.linkedin}</>}
              </p>
            </header>

            {/* Summary */}
            {cvData.summary && (
              <section className="mb-6">
                <h2 className="text-lg font-bold uppercase border-b border-black pb-1 mb-2">Professional Summary</h2>
                <p className="text-sm text-justify whitespace-pre-wrap leading-snug">{cvData.summary}</p>
              </section>
            )}

            {/* Core Skills */}
            {cvData.skills.length > 0 && (
              <section className="mb-6">
                <h2 className="text-lg font-bold uppercase border-b border-black pb-1 mb-2">Core Skills</h2>
                <p className="text-sm leading-snug">{cvData.skills.join(", ")}</p>
              </section>
            )}

            {/* Experience */}
            {cvData.experience.length > 0 && (
              <section className="mb-6">
                <h2 className="text-lg font-bold uppercase border-b border-black pb-1 mb-3">Professional Experience</h2>
                <div className="space-y-4">
                  {cvData.experience.map((exp, index) => (
                    <div key={index}>
                      <div className="flex justify-between items-baseline mb-1">
                        <h3 className="font-bold text-base">{exp.position}</h3>
                        <span className="text-sm">{exp.startDate} &ndash; {exp.current ? "Present" : exp.endDate}</span>
                      </div>
                      <p className="text-sm italic mb-1">{exp.company}{exp.location ? `, ${exp.location}` : ''}</p>
                      <ul className="list-disc list-outside ml-4 text-sm space-y-1">
                        {exp.description.split('\n').filter(line => line.trim() !== '').map((line, i) => (
                          <li key={i} className="leading-snug">{line.replace(/^[•\-\*]\s*/, '')}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Education */}
            {cvData.education.length > 0 && (
              <section className="mb-6">
                <h2 className="text-lg font-bold uppercase border-b border-black pb-1 mb-3">Education</h2>
                <div className="space-y-2">
                  {cvData.education.map((edu, index) => (
                    <div key={index} className="flex justify-between items-baseline">
                      <p className="text-sm">
                        <span className="font-bold">{edu.degree} in {edu.field}</span> &mdash; {edu.institution}
                      </p>
                      <span className="text-sm">{edu.startDate} &ndash; {edu.endDate}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Languages */}
            {cvData.languages.length > 0 && (
              <section className="mb-6">
                <h2 className="text-lg font-bold uppercase border-b border-black pb-1 mb-2">Languages</h2>
                <p className="text-sm leading-snug">{cvData.languages.join(", ")}</p>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
