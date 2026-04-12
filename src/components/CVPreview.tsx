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
  const [showUAEInfo, setShowUAEInfo] = useState(true);

  const exportToPDF = async () => {
    if (!cvRef.current) return;
    setIsExporting(true);

    try {
      // Small delay to allow state to update and re-render with desktop layout
      await new Promise(resolve => setTimeout(resolve, 500));

      const element = cvRef.current;
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
        windowWidth: 1024,
      });
      
      const imgData = canvas.toDataURL("image/png");
      
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      
      // Calculate PDF dimensions to fit everything on one page
      // We use A4 width (210mm) as the base and calculate height proportionally
      const pdfWidth = 210;
      const pdfHeight = (imgHeight * pdfWidth) / imgWidth;
      
      // Create PDF with custom size [width, height] in mm
      const pdf = new jsPDF({
        orientation: "p",
        unit: "mm",
        format: [pdfWidth, pdfHeight]
      });
      
      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`${profile.name.replace(/\s+/g, "_")}_CV.pdf`);
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Failed to generate PDF. This might be due to image loading issues. Please try again.");
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
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer bg-gray-50 px-3 py-2 rounded-md border border-gray-200">
            <input 
              type="checkbox" 
              checked={showUAEInfo} 
              onChange={(e) => setShowUAEInfo(e.target.checked)}
              className="rounded text-blue-600 focus:ring-blue-500"
            />
            Include UAE Info
          </label>
          <button
            onClick={exportToPDF}
            disabled={isExporting}
            className="flex items-center justify-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-lg font-semibold hover:bg-blue-700 transition-colors shadow-sm flex-1 sm:flex-none disabled:opacity-70"
          >
            <Download className="w-4 h-4" /> {isExporting ? "Exporting..." : "Export PDF"}
          </button>
        </div>
      </div>

      <div className={`bg-white shadow-xl border border-gray-200 rounded-lg flex justify-center cv-preview-container ${isExporting ? 'overflow-visible' : 'overflow-hidden'}`}>
        {template === "modern" ? (
          <div 
            ref={cvRef} 
            className={`flex bg-white text-gray-800 font-sans mx-auto ${isExporting ? 'flex-row w-[1024px]' : 'flex-col md:flex-row w-full max-w-[210mm]'}`}
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
              {showUAEInfo && (cvData.dateOfBirth || cvData.nationality || profile.nationality || cvData.visaStatus || profile.visaStatus || cvData.noticePeriod) && (
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
              )}

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
            className={`bg-white text-black font-serif mx-auto ${isExporting ? 'w-[794px]' : 'w-full max-w-[210mm]'}`}
            style={{ 
              minHeight: "297mm", 
              padding: "0.6in",
              fontFamily: "'Times New Roman', Times, serif" 
            }}
          >
            {/* Header */}
            <header className="text-center mb-5">
              <h1 className="text-[24px] font-bold mb-1 uppercase tracking-wider">{profile.name}</h1>
              <p className="text-[13px] mt-1">
                {profile.location} &nbsp;|&nbsp; {profile.phone} &nbsp;|&nbsp; {profile.email} {cvData.linkedin && <>&nbsp;|&nbsp; {cvData.linkedin}</>}
              </p>
            </header>

            {/* Summary */}
            {cvData.summary && (
              <section className="mb-5">
                <h2 className="text-[13px] font-bold uppercase border-b border-black pb-0.5 mb-2">Professional Summary</h2>
                <p className="text-[13px] text-justify whitespace-pre-wrap leading-snug">{cvData.summary}</p>
              </section>
            )}

            {/* Core Skills */}
            {cvData.skills.length > 0 && (
              <section className="mb-5">
                <h2 className="text-[13px] font-bold uppercase border-b border-black pb-0.5 mb-2">Core Skills</h2>
                <p className="text-[13px] leading-snug">{cvData.skills.join(", ")}</p>
              </section>
            )}

            {/* Experience */}
            {cvData.experience.length > 0 && (
              <section className="mb-5">
                <h2 className="text-[13px] font-bold uppercase border-b border-black pb-0.5 mb-2">Professional Experience</h2>
                <div className="space-y-3">
                  {cvData.experience.map((exp, index) => (
                    <div key={index}>
                      <div className="flex justify-between items-baseline">
                        <h3 className="font-bold text-[13px]">{exp.position}</h3>
                        <span className="text-[13px]">{exp.startDate} &ndash; {exp.current ? "Present" : exp.endDate}</span>
                      </div>
                      <p className="text-[13px] italic mb-1">{exp.company}{exp.location ? `, ${exp.location}` : ''}</p>
                      <ul className="list-disc list-outside ml-5 text-[13px] space-y-0">
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
              <section className="mb-5">
                <h2 className="text-[13px] font-bold uppercase border-b border-black pb-0.5 mb-2">Education</h2>
                <div className="space-y-1">
                  {cvData.education.map((edu, index) => (
                    <div key={index} className="flex justify-between items-baseline">
                      <p className="text-[13px]">
                        <span className="font-bold">{edu.degree}</span> &mdash; {edu.institution}
                      </p>
                      <span className="text-[13px]">{edu.startDate} &ndash; {edu.endDate}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Certifications */}
            {cvData.certifications && cvData.certifications.length > 0 && (
              <section className="mb-5">
                <h2 className="text-[13px] font-bold uppercase border-b border-black pb-0.5 mb-2">Certifications</h2>
                <ul className="list-disc list-outside ml-5 text-[13px] space-y-0">
                  {cvData.certifications.map((cert, index) => (
                    <li key={index} className="leading-snug">{cert}</li>
                  ))}
                </ul>
              </section>
            )}

            {/* Languages */}
            {cvData.languages && cvData.languages.length > 0 && (
              <section className="mb-5">
                <h2 className="text-[13px] font-bold uppercase border-b border-black pb-0.5 mb-2">Languages</h2>
                <p className="text-[13px] leading-snug">{cvData.languages.join(", ")}</p>
              </section>
            )}

            {/* Additional Information (UAE) */}
            {showUAEInfo && (cvData.dateOfBirth || cvData.nationality || profile.nationality || cvData.visaStatus || profile.visaStatus || cvData.noticePeriod) && (
              <section className="mb-5">
                <h2 className="text-[13px] font-bold uppercase border-b border-black pb-0.5 mb-2">Additional Information</h2>
                <ul className="list-disc list-inside text-[13px] space-y-1">
                  {cvData.dateOfBirth && <li><span className="font-bold">Date of Birth:</span> {cvData.dateOfBirth}</li>}
                  {(cvData.nationality || profile.nationality) && <li><span className="font-bold">Nationality:</span> {cvData.nationality || profile.nationality}</li>}
                  {(cvData.visaStatus || profile.visaStatus) && <li><span className="font-bold">Visa Status:</span> <span className="capitalize">{cvData.visaStatus || profile.visaStatus}</span></li>}
                  {cvData.noticePeriod && <li><span className="font-bold">Notice Period:</span> {cvData.noticePeriod}</li>}
                </ul>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
