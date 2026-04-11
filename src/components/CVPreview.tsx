import React, { useRef, useState } from "react";
import { UserProfile, CVData } from "../types";
import { Mail, Phone, MapPin, Globe, Linkedin, Download, FileText, LayoutTemplate, AlignLeft, Briefcase, GraduationCap, User } from "lucide-react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

interface CVPreviewProps {
  profile: UserProfile;
  cvData: CVData;
}

export default function CVPreview({ profile, cvData }: CVPreviewProps) {
  const cvRef = useRef<HTMLDivElement>(null);
  const [template, setTemplate] = useState<"modern" | "ats">("modern");
  const [isExporting, setIsExporting] = useState(false);

  const exportToPDF = async () => {
    if (!cvRef.current) return;
    setIsExporting(true);

    try {
      // Small delay to allow state to update and re-render with desktop layout
      await new Promise(resolve => setTimeout(resolve, 300));

      const element = cvRef.current;
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        windowWidth: 1024,
      });
      
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a5");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      
      // Map width exactly to A4 width
      const ratio = pdfWidth / imgWidth;
      const scaledHeight = imgHeight * ratio;

      let heightLeft = scaledHeight;
      let position = 0;

      pdf.addImage(imgData, "PNG", 0, position, pdfWidth, scaledHeight);
      heightLeft -= pdfHeight;

      // Add new pages if content exceeds one A4 page
      while (heightLeft > 0) {
        position = heightLeft - scaledHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, pdfWidth, scaledHeight);
        heightLeft -= pdfHeight;
      }

      pdf.save(`${profile.name.replace(/\s+/g, "_")}_CV.pdf`);
    } catch (error) {
      console.error("Error generating PDF:", error);
    } finally {
      setIsExporting(false);
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
        <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-lg w-full sm:w-auto overflow-x-auto">
          <button
            onClick={() => setTemplate("modern")}
            className={`flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all flex-1 sm:flex-none whitespace-nowrap ${
              template === "modern" ? "bg-white text-blue-600 shadow-sm" : "text-gray-600 hover:text-gray-900"
            }`}
          >
            <LayoutTemplate className="w-4 h-4" /> Modern
          </button>
          <button
            onClick={() => setTemplate("ats")}
            className={`flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all flex-1 sm:flex-none whitespace-nowrap ${
              template === "ats" ? "bg-white text-blue-600 shadow-sm" : "text-gray-600 hover:text-gray-900"
            }`}
          >
            <AlignLeft className="w-4 h-4" /> ATS Friendly
          </button>
        </div>
        <button
          onClick={exportToPDF}
          disabled={isExporting}
          className="flex items-center justify-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-lg font-semibold hover:bg-blue-700 transition-colors shadow-sm w-full sm:w-auto disabled:opacity-70"
        >
          <Download className="w-4 h-4" /> {isExporting ? "Exporting..." : "Export PDF"}
        </button>
      </div>

      <div className="bg-white shadow-xl border border-gray-200 rounded-lg overflow-hidden flex justify-center cv-preview-container">
        {template === "modern" ? (
          <div 
            ref={cvRef} 
            className={`flex bg-white text-gray-800 font-sans mx-auto ${isExporting ? 'flex-row w-[210mm]' : 'flex-col md:flex-row w-full max-w-[210mm]'}`}
            style={{ minHeight: "297mm" }}
          >
            {/* Left Column */}
            <div className={`${isExporting ? 'w-[35%]' : 'w-full md:w-[35%]'} bg-[#E8E9EB] p-6 md:p-8 pt-8 md:pt-12 flex flex-col`}>
              {/* Photo */}
              {profile.photoUrl && (
                <div className="w-32 h-32 md:w-40 md:h-40 rounded-full overflow-hidden border-4 border-white shadow-md mx-auto mb-6 md:mb-8 shrink-0">
                  <img src={profile.photoUrl} alt={profile.name} className="w-full h-full object-cover" crossOrigin="anonymous" />
                </div>
              )}

              {/* Contact */}
              <div className="mb-6 md:mb-8">
                <h2 className="text-base md:text-lg font-bold tracking-widest text-[#2C3545] uppercase border-b-2 border-[#2C3545] pb-1 mb-3 md:mb-4">Contact</h2>
                <div className="space-y-3 text-sm text-gray-700">
                  {profile.phone && (
                    <div className="flex items-center gap-3">
                      <Phone className="w-4 h-4 text-[#2C3545] shrink-0" />
                      <span className="break-all">{profile.phone}</span>
                    </div>
                  )}
                  {profile.email && (
                    <div className="flex items-center gap-3">
                      <Mail className="w-4 h-4 text-[#2C3545] shrink-0" />
                      <span className="break-all">{profile.email}</span>
                    </div>
                  )}
                  {profile.location && (
                    <div className="flex items-center gap-3">
                      <MapPin className="w-4 h-4 text-[#2C3545] shrink-0" />
                      <span>{profile.location}</span>
                    </div>
                  )}
                  {cvData.linkedin && (
                    <div className="flex items-center gap-3">
                      <Linkedin className="w-4 h-4 text-[#2C3545] shrink-0" />
                      <span className="break-all">{cvData.linkedin}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Personal Info (UAE) */}
              <div className="mb-6 md:mb-8">
                <h2 className="text-base md:text-lg font-bold tracking-widest text-[#2C3545] uppercase border-b-2 border-[#2C3545] pb-1 mb-3 md:mb-4">Info</h2>
                <div className="space-y-3 text-sm text-gray-700">
                  {cvData.dateOfBirth && (
                    <div>
                      <span className="font-bold block text-[#2C3545]">Date of Birth</span>
                      <span>{cvData.dateOfBirth}</span>
                    </div>
                  )}
                  {(cvData.nationality || profile.nationality) && (
                    <div>
                      <span className="font-bold block text-[#2C3545]">Nationality</span>
                      <span>{cvData.nationality || profile.nationality}</span>
                    </div>
                  )}
                  {(cvData.visaStatus || profile.visaStatus) && (
                    <div>
                      <span className="font-bold block text-[#2C3545]">Visa Status</span>
                      <span className="capitalize">{cvData.visaStatus || profile.visaStatus}</span>
                    </div>
                  )}
                  {cvData.noticePeriod && (
                    <div>
                      <span className="font-bold block text-[#2C3545]">Notice Period</span>
                      <span>{cvData.noticePeriod}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Skills */}
              {cvData.skills.length > 0 && (
                <div className="mb-6 md:mb-8">
                  <h2 className="text-base md:text-lg font-bold tracking-widest text-[#2C3545] uppercase border-b-2 border-[#2C3545] pb-1 mb-3 md:mb-4">Skills</h2>
                  <ul className="list-disc list-inside text-sm text-gray-700 space-y-1.5">
                    {cvData.skills.map((skill, index) => (
                      <li key={index}>{skill}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Languages */}
              {cvData.languages.length > 0 && (
                <div className="mb-6 md:mb-8">
                  <h2 className="text-base md:text-lg font-bold tracking-widest text-[#2C3545] uppercase border-b-2 border-[#2C3545] pb-1 mb-3 md:mb-4">Languages</h2>
                  <ul className="list-disc list-inside text-sm text-gray-700 space-y-1.5">
                    {cvData.languages.map((lang, index) => (
                      <li key={index}>{lang}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Certifications */}
              {cvData.certifications && cvData.certifications.length > 0 && (
                <div className="mb-6 md:mb-8">
                  <h2 className="text-base md:text-lg font-bold tracking-widest text-[#2C3545] uppercase border-b-2 border-[#2C3545] pb-1 mb-3 md:mb-4">Certifications</h2>
                  <ul className="list-disc list-inside text-sm text-gray-700 space-y-1.5">
                    {cvData.certifications.map((cert, index) => (
                      <li key={index} className="leading-snug">{cert}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Right Column */}
            <div className={`${isExporting ? 'w-[65%]' : 'w-full md:w-[65%]'} flex flex-col bg-white`}>
              {/* Header */}
              <div className="bg-[#2C3545] text-white p-8 md:p-12 flex flex-col justify-center min-h-[160px] md:min-h-[220px]">
                <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-widest uppercase mb-2 md:mb-3 break-words">{profile.name}</h1>
                <h2 className="text-lg md:text-xl tracking-widest uppercase text-gray-300">{profile.headline || "Professional"}</h2>
              </div>

              {/* Main Content */}
              <div className="p-6 md:p-10 flex-1 space-y-8">
                {/* Profile Summary */}
                {cvData.summary && (
                  <section>
                    <div className="flex items-center gap-3 md:gap-4 mb-4">
                      <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-[#2C3545] text-white flex items-center justify-center shrink-0">
                        <User className="w-4 h-4 md:w-5 md:h-5" />
                      </div>
                      <h3 className="text-lg md:text-xl font-bold tracking-widest text-[#2C3545] uppercase">Profile</h3>
                    </div>
                    <div className="pl-11 md:pl-14">
                      <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{cvData.summary}</p>
                    </div>
                  </section>
                )}

                {/* Experience */}
                {cvData.experience.length > 0 && (
                  <section>
                    <div className="flex items-center gap-3 md:gap-4 mb-4">
                      <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-[#2C3545] text-white flex items-center justify-center shrink-0">
                        <Briefcase className="w-4 h-4 md:w-5 md:h-5" />
                      </div>
                      <h3 className="text-lg md:text-xl font-bold tracking-widest text-[#2C3545] uppercase">Work Experience</h3>
                    </div>
                    <div className="pl-4 md:pl-5">
                      <div className="border-l border-gray-300 pl-6 md:pl-8 space-y-6 py-2">
                        {cvData.experience.map((exp, index) => (
                          <div key={index} className="relative">
                            <div className="absolute -left-[29px] md:-left-[38px] top-1.5 w-3 h-3 bg-white border-2 border-[#2C3545] rounded-full"></div>
                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-baseline mb-1 gap-1 sm:gap-0">
                              <h4 className="font-bold text-gray-900 text-base md:text-lg">{exp.company}</h4>
                              <span className="text-xs md:text-sm text-gray-600 font-medium">{exp.startDate} - {exp.current ? "Present" : exp.endDate}</span>
                            </div>
                            <p className="text-sm font-bold text-[#2C3545] mb-2">{exp.position} {exp.location ? `| ${exp.location}` : ''}</p>
                            <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                              {exp.description}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </section>
                )}

                {/* Education */}
                {cvData.education.length > 0 && (
                  <section>
                    <div className="flex items-center gap-3 md:gap-4 mb-4">
                      <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-[#2C3545] text-white flex items-center justify-center shrink-0">
                        <GraduationCap className="w-4 h-4 md:w-5 md:h-5" />
                      </div>
                      <h3 className="text-lg md:text-xl font-bold tracking-widest text-[#2C3545] uppercase">Education</h3>
                    </div>
                    <div className="pl-4 md:pl-5">
                      <div className="border-l border-gray-300 pl-6 md:pl-8 space-y-6 py-2">
                        {cvData.education.map((edu, index) => (
                          <div key={index} className="relative">
                            <div className="absolute -left-[29px] md:-left-[38px] top-1.5 w-3 h-3 bg-white border-2 border-[#2C3545] rounded-full"></div>
                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-baseline mb-1 gap-1 sm:gap-0">
                              <h4 className="font-bold text-gray-900 text-base md:text-lg">{edu.degree}</h4>
                              <span className="text-xs md:text-sm text-gray-600 font-medium">{edu.startDate} - {edu.endDate}</span>
                            </div>
                            <p className="text-sm font-bold text-[#2C3545] mb-1">{edu.institution}</p>
                            <p className="text-sm text-gray-700">{edu.field}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </section>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div 
            ref={cvRef} 
            className={`p-6 md:p-12 bg-white text-black font-serif leading-relaxed mx-auto ${isExporting ? 'w-[210mm]' : 'w-full max-w-[210mm]'}`}
            style={{ minHeight: "297mm", fontFamily: "'Times New Roman', Times, serif" }}
          >
            {/* Header */}
            <header className="text-center mb-6">
              <h1 className="text-2xl md:text-3xl font-bold mb-1 uppercase tracking-wider">{profile.name}</h1>
              <p className="text-sm md:text-base mb-2">{profile.headline}</p>
              <p className="text-xs md:text-sm">{profile.location}</p>
              <p className="text-xs md:text-sm mt-1">
                {profile.phone} &mdash; {profile.email} {cvData.linkedin && <>&mdash; {cvData.linkedin}</>}
              </p>
            </header>

            {/* Summary */}
            {cvData.summary && (
              <section className="mb-6">
                <h2 className="text-base md:text-lg font-bold uppercase border-b border-black pb-1 mb-2">Professional Summary</h2>
                <p className="text-sm text-justify whitespace-pre-wrap leading-snug">{cvData.summary}</p>
              </section>
            )}

            {/* Core Skills */}
            {cvData.skills.length > 0 && (
              <section className="mb-6">
                <h2 className="text-base md:text-lg font-bold uppercase border-b border-black pb-1 mb-2">Core Skills</h2>
                <p className="text-sm leading-snug">{cvData.skills.join(", ")}</p>
              </section>
            )}

            {/* Experience */}
            {cvData.experience.length > 0 && (
              <section className="mb-6">
                <h2 className="text-base md:text-lg font-bold uppercase border-b border-black pb-1 mb-3">Professional Experience</h2>
                <div className="space-y-4">
                  {cvData.experience.map((exp, index) => (
                    <div key={index}>
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-baseline mb-1">
                        <h3 className="font-bold text-sm md:text-base">{exp.position}</h3>
                        <span className="text-xs md:text-sm text-gray-600 sm:text-black">{exp.startDate} &ndash; {exp.current ? "Present" : exp.endDate}</span>
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
                <h2 className="text-base md:text-lg font-bold uppercase border-b border-black pb-1 mb-3">Education</h2>
                <div className="space-y-2">
                  {cvData.education.map((edu, index) => (
                    <div key={index} className="flex flex-col sm:flex-row sm:justify-between sm:items-baseline">
                      <p className="text-sm">
                        <span className="font-bold">{edu.degree} in {edu.field}</span> &mdash; {edu.institution}
                      </p>
                      <span className="text-xs md:text-sm text-gray-600 sm:text-black">{edu.startDate} &ndash; {edu.endDate}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Certifications */}
            {cvData.certifications && cvData.certifications.length > 0 && (
              <section className="mb-6">
                <h2 className="text-base md:text-lg font-bold uppercase border-b border-black pb-1 mb-3">Certification</h2>
                <ul className="list-none text-sm space-y-1">
                  {cvData.certifications.map((cert, index) => (
                    <li key={index}>{cert}</li>
                  ))}
                </ul>
              </section>
            )}

            {/* Additional Information */}
            <section className="mb-6">
              <h2 className="text-base md:text-lg font-bold uppercase border-b border-black pb-1 mb-3">Additional Information</h2>
              <ul className="list-disc list-inside text-sm space-y-2">
                {cvData.dateOfBirth && <li>Date of Birth: {cvData.dateOfBirth}</li>}
                {(cvData.nationality || profile.nationality) && <li>Nationality: {cvData.nationality || profile.nationality}</li>}
                {cvData.languages && cvData.languages.length > 0 && <li>Languages: {cvData.languages.join(", ")}</li>}
                {(cvData.visaStatus || profile.visaStatus) && <li>Visa Status: {cvData.visaStatus || profile.visaStatus}</li>}
              </ul>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
