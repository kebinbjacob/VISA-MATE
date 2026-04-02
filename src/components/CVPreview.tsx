import React, { useRef } from "react";
import { UserProfile, CVData } from "../types";
import { Mail, Phone, MapPin, Globe, Linkedin, Download, FileText } from "lucide-react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

interface CVPreviewProps {
  profile: UserProfile;
  cvData: CVData;
}

export default function CVPreview({ profile, cvData }: CVPreviewProps) {
  const cvRef = useRef<HTMLDivElement>(null);

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
      <div className="flex justify-end">
        <button
          onClick={exportToPDF}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors shadow-sm"
        >
          <Download className="w-4 h-4" /> Export PDF
        </button>
      </div>

      <div className="bg-white shadow-xl border border-gray-200 rounded-lg overflow-hidden">
        <div 
          ref={cvRef} 
          className="p-12 bg-white text-gray-800 font-sans leading-relaxed max-w-[210mm] mx-auto min-h-[297mm]"
          style={{ width: "210mm" }}
        >
          {/* Header */}
          <header className="border-b-2 border-blue-600 pb-6 mb-8">
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
      </div>
    </div>
  );
}
