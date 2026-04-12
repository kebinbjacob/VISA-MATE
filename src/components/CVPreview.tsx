import React, { useRef, useState } from "react";
import { UserProfile, CVData } from "../types";
import {
  Mail,
  Phone,
  MapPin,
  Linkedin,
  Download,
  LayoutTemplate,
  AlignLeft,
  Briefcase,
  GraduationCap,
  User,
} from "lucide-react";
import jsPDF from "jspdf";

interface CVPreviewProps {
  profile: UserProfile;
  cvData: CVData;
}

export default function CVPreview({ profile, cvData }: CVPreviewProps) {
  const cvRef = useRef<HTMLDivElement>(null);
  const [template, setTemplate] = useState<"modern" | "ats">("modern");
  const [isExporting, setIsExporting] = useState(false);
  const [showUAEInfo, setShowUAEInfo] = useState(true);

  // ─────────────────────────────────────────────────────────────────────────
  // Overleaf-style PDF export: pure jsPDF vector text rendering.
  // No html2canvas, no screenshots, no layout blowout.
  // Produces selectable text, crisp fonts, ~100–200 KB output.
  // ─────────────────────────────────────────────────────────────────────────
  const exportToPDF = () => {
    setIsExporting(true);
    try {
      if (template === "ats") {
        exportATS();
      } else {
        exportModern();
      }
    } finally {
      setIsExporting(false);
    }
  };

  // ── Shared helpers ────────────────────────────────────────────────────────

  /** Split text into lines that fit within maxWidth (in mm). */
  const splitLines = (
    pdf: jsPDF,
    text: string,
    maxWidth: number
  ): string[] => {
    if (!text) return [];
    return pdf.splitTextToSize(text.trim(), maxWidth);
  };

  /** Draw wrapped text and return the new Y cursor position. */
  const drawText = (
    pdf: jsPDF,
    text: string,
    x: number,
    y: number,
    maxWidth: number,
    lineHeight: number
  ): number => {
    const lines = splitLines(pdf, text, maxWidth);
    lines.forEach((line) => {
      pdf.text(line, x, y);
      y += lineHeight;
    });
    return y;
  };

  // ── ATS Template Export ───────────────────────────────────────────────────
  const exportATS = () => {
    const pdf = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });

    const W = 210;           // page width mm
    const H = 297;           // page height mm
    const ML = 20;           // margin left
    const MR = 20;           // margin right
    const MT = 18;           // margin top
    const MB = 15;           // margin bottom
    const TW = W - ML - MR; // text width

    const LH_BODY  = 5.2;   // body line height
    const LH_TITLE = 7;     // section title line height
    const FS_NAME  = 18;    // font sizes
    const FS_SUB   = 9.5;
    const FS_HEAD  = 10;
    const FS_BODY  = 9;

    let y = MT;

    // Guard: add new page if needed
    const checkPage = (needed: number) => {
      if (y + needed > H - MB) {
        pdf.addPage();
        y = MT;
      }
    };

    // Section heading with full-width underline
    const sectionHeading = (label: string) => {
      checkPage(10);
      y += 3;
      pdf.setFontSize(FS_HEAD);
      pdf.setFont("times", "bold");
      pdf.text(label.toUpperCase(), ML, y);
      y += 1.5;
      pdf.setLineWidth(0.4);
      pdf.line(ML, y, ML + TW, y);
      y += 4;
    };

    // ── Name & contact ──
    pdf.setFont("times", "bold");
    pdf.setFontSize(FS_NAME);
    const nameW = pdf.getTextWidth(profile.name.toUpperCase());
    pdf.text(profile.name.toUpperCase(), (W - nameW) / 2, y);
    y += 7;

    const contactParts = [
      profile.location,
      profile.phone,
      profile.email,
      cvData.linkedin,
    ].filter(Boolean).join("  |  ");

    pdf.setFont("times", "normal");
    pdf.setFontSize(FS_SUB);
    const contactW = pdf.getTextWidth(contactParts);
    // If it fits on one line centre it, otherwise wrap left-aligned
    if (contactW <= TW) {
      pdf.text(contactParts, (W - contactW) / 2, y);
      y += 6;
    } else {
      y = drawText(pdf, contactParts, ML, y, TW, LH_BODY);
      y += 2;
    }

    // ── Summary ──
    if (cvData.summary) {
      sectionHeading("Professional Summary");
      pdf.setFont("times", "normal");
      pdf.setFontSize(FS_BODY);
      y = drawText(pdf, cvData.summary, ML, y, TW, LH_BODY);
      y += 2;
    }

    // ── Skills ──
    if (cvData.skills.length > 0) {
      sectionHeading("Core Skills");
      pdf.setFont("times", "normal");
      pdf.setFontSize(FS_BODY);
      y = drawText(pdf, cvData.skills.join(", "), ML, y, TW, LH_BODY);
      y += 2;
    }

    // ── Experience ──
    if (cvData.experience.length > 0) {
      sectionHeading("Professional Experience");
      cvData.experience.forEach((exp) => {
        checkPage(18);

        // Position (bold) + date (right-aligned)
        const dateStr = `${exp.startDate} – ${exp.current ? "Present" : exp.endDate}`;
        pdf.setFont("times", "bold");
        pdf.setFontSize(FS_BODY);
        const dateW = pdf.getTextWidth(dateStr);
        pdf.text(exp.position, ML, y);
        pdf.setFont("times", "normal");
        pdf.text(dateStr, W - MR - dateW, y);
        y += LH_BODY;

        // Company + location (italic)
        pdf.setFont("times", "italic");
        const companyLine = [exp.company, exp.location].filter(Boolean).join(", ");
        y = drawText(pdf, companyLine, ML, y, TW, LH_BODY);
        y += 1;

        // Bullet points
        pdf.setFont("times", "normal");
        const bulletX = ML + 4;
        const bulletTW = TW - 4;
        exp.description
          .split("\n")
          .map((l) => l.replace(/^[•\-\*]\s*/, "").trim())
          .filter(Boolean)
          .forEach((line) => {
            checkPage(LH_BODY + 2);
            const wrapped = splitLines(pdf, line, bulletTW - 2);
            pdf.text("•", ML, y);
            wrapped.forEach((wl, i) => {
              pdf.text(wl, bulletX, y);
              y += LH_BODY;
            });
          });
        y += 3;
      });
    }

    // ── Education ──
    if (cvData.education.length > 0) {
      sectionHeading("Education");
      cvData.education.forEach((edu) => {
        checkPage(10);
        const dateStr = `${edu.startDate} – ${edu.endDate}`;
        pdf.setFont("times", "bold");
        pdf.setFontSize(FS_BODY);
        const dateW = pdf.getTextWidth(dateStr);
        pdf.text(`${edu.degree}`, ML, y);
        pdf.setFont("times", "normal");
        pdf.text(dateStr, W - MR - dateW, y);
        y += LH_BODY;
        pdf.setFont("times", "italic");
        pdf.text(edu.institution, ML, y);
        y += LH_BODY + 1;
      });
    }

    // ── Certifications ──
    if (cvData.certifications && cvData.certifications.length > 0) {
      sectionHeading("Certifications");
      pdf.setFont("times", "normal");
      pdf.setFontSize(FS_BODY);
      cvData.certifications.forEach((cert) => {
        checkPage(LH_BODY + 2);
        const wrapped = splitLines(pdf, cert, TW - 4);
        pdf.text("•", ML, y);
        wrapped.forEach((wl) => {
          pdf.text(wl, ML + 4, y);
          y += LH_BODY;
        });
      });
      y += 2;
    }

    // ── Languages ──
    if (cvData.languages && cvData.languages.length > 0) {
      sectionHeading("Languages");
      pdf.setFont("times", "normal");
      pdf.setFontSize(FS_BODY);
      y = drawText(pdf, cvData.languages.join(", "), ML, y, TW, LH_BODY);
      y += 2;
    }

    // ── UAE Additional Info ──
    if (
      showUAEInfo &&
      (cvData.dateOfBirth || cvData.nationality || profile.nationality ||
        cvData.visaStatus || profile.visaStatus || cvData.noticePeriod)
    ) {
      sectionHeading("Additional Information");
      pdf.setFontSize(FS_BODY);
      const infoItems: [string, string][] = [
        ["Date of Birth", cvData.dateOfBirth ?? ""],
        ["Nationality", cvData.nationality || profile.nationality || ""],
        ["Visa Status", cvData.visaStatus || profile.visaStatus || ""],
        ["Notice Period", cvData.noticePeriod ?? ""],
      ].filter(([, v]) => v) as [string, string][];

      infoItems.forEach(([label, value]) => {
        checkPage(LH_BODY + 2);
        pdf.setFont("times", "bold");
        pdf.text(`${label}: `, ML, y);
        const labelW = pdf.getTextWidth(`${label}: `);
        pdf.setFont("times", "normal");
        y = drawText(pdf, value, ML + labelW, y, TW - labelW, LH_BODY);
      });
    }

    pdf.save(`${profile.name.replace(/\s+/g, "_")}_CV.pdf`);
  };

  // ── Modern (Two-Column) Template Export ───────────────────────────────────
  const exportModern = () => {
    const pdf = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });

    const W  = 210;
    const H  = 297;
    const LC = 73;           // left column width mm (≈35%)
    const RC = W - LC;       // right column width
    const LP = 8;            // left column padding
    const RP = 10;           // right column padding
    const MT = 0;
    const MB = 12;
    const LTW = LC - LP * 2; // left text width
    const RTW = RC - RP * 2; // right text width

    const LH  = 5.2;
    const LHT = 6.5;

    // Colours
    const DARK  = [44, 53, 69] as [number, number, number];   // #2C3545
    const LIGHT = [232, 233, 235] as [number, number, number]; // #E8E9EB sidebar bg
    const WHITE = [255, 255, 255] as [number, number, number];
    const GRAY  = [55, 65, 81] as [number, number, number];

    // Track separate Y cursors for each column
    let lY = 0; // left col Y (relative to left col start)
    let rY = 0; // right col Y (relative to right col start)
    let pageCount = 1;

    // Draw background fills for current page
    const drawPageBg = () => {
      // Left sidebar fill
      pdf.setFillColor(...LIGHT);
      pdf.rect(0, 0, LC, H, "F");
      // Right header fill
      pdf.setFillColor(...DARK);
      pdf.rect(LC, 0, RC, 52, "F");
    };

    drawPageBg();

    // ── Left column helpers ──────────────────────────────────────────────
    const lX = LP; // left text x

    const lCheckPage = (needed: number) => {
      if (lY + needed > H - MB) {
        // If right column is still on this page, sync
        pdf.addPage();
        pageCount++;
        lY = MT + 10;
        // Redraw bg
        pdf.setFillColor(...LIGHT);
        pdf.rect(0, 0, LC, H, "F");
        pdf.setFillColor(...DARK);
        pdf.rect(LC, 0, RC, 8, "F"); // thin dark strip on continuation pages
      }
    };

    const lSectionHead = (label: string) => {
      lCheckPage(12);
      lY += 4;
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(8);
      pdf.setTextColor(...DARK);
      pdf.text(label.toUpperCase(), lX, lY);
      lY += 1.5;
      pdf.setDrawColor(...DARK);
      pdf.setLineWidth(0.5);
      pdf.line(lX, lY, lX + LTW, lY);
      lY += 4;
    };

    const lText = (
      text: string,
      bold = false,
      size = 8,
      color: [number, number, number] = GRAY
    ): number => {
      pdf.setFont("helvetica", bold ? "bold" : "normal");
      pdf.setFontSize(size);
      pdf.setTextColor(...color);
      const lines = splitLines(pdf, text, LTW);
      lines.forEach((line) => {
        lCheckPage(LH);
        pdf.text(line, lX, lY);
        lY += LH;
      });
      return lY;
    };

    // ── Right column helpers ─────────────────────────────────────────────
    const rX = LC + RP;

    const rCheckPage = (needed: number) => {
      if (rY + needed > H - MB) {
        // Only add page if left col hasn't already triggered one
        if (pageCount === Math.ceil(rY / H) + 1) {
          // page already added by left col
        } else {
          pdf.addPage();
          pageCount++;
          pdf.setFillColor(...LIGHT);
          pdf.rect(0, 0, LC, H, "F");
          pdf.setFillColor(...DARK);
          pdf.rect(LC, 0, RC, 8, "F");
        }
        rY = MT + 10;
      }
    };

    const rSectionHead = (label: string, iconChar?: string) => {
      rCheckPage(14);
      rY += 5;
      // Circle icon
      pdf.setFillColor(...DARK);
      pdf.circle(rX + 3.5, rY - 2, 3.5, "F");
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(10);
      pdf.setTextColor(...DARK);
      pdf.text(label.toUpperCase(), rX + 10, rY);
      rY += 6;
    };

    const rText = (
      text: string,
      bold = false,
      size = 9,
      color: [number, number, number] = GRAY,
      xOffset = 0
    ): number => {
      pdf.setFont("helvetica", bold ? "bold" : "normal");
      pdf.setFontSize(size);
      pdf.setTextColor(...color);
      const lines = splitLines(pdf, text, RTW - xOffset);
      lines.forEach((line) => {
        rCheckPage(LH);
        pdf.text(line, rX + xOffset, rY);
        rY += LH;
      });
      return rY;
    };

    // ════════════════════════════════════════════════════════════════════
    // LEFT COLUMN CONTENT
    // ════════════════════════════════════════════════════════════════════

    // Photo placeholder (if no photo, skip)
    if (profile.photoUrl) {
      // We can't embed a cross-origin image in jsPDF easily,
      // so draw a circle placeholder in its place
      lY = 12;
      pdf.setFillColor(...WHITE);
      pdf.circle(LC / 2, lY + 18, 18, "F");
      lY += 40;
    } else {
      lY = 12;
    }

    // Contact section
    lSectionHead("Contact");
    if (profile.phone) {
      lText("Phone", true, 7.5, DARK);
      lText(profile.phone, false, 8, GRAY);
      lY += 1;
    }
    if (profile.email) {
      lText("Email", true, 7.5, DARK);
      lText(profile.email, false, 8, GRAY);
      lY += 1;
    }
    if (profile.location) {
      lText("Location", true, 7.5, DARK);
      lText(profile.location, false, 8, GRAY);
      lY += 1;
    }
    if (cvData.linkedin) {
      lText("LinkedIn", true, 7.5, DARK);
      lText(cvData.linkedin, false, 7.5, GRAY);
      lY += 1;
    }

    // UAE Info section
    if (
      showUAEInfo &&
      (cvData.dateOfBirth || cvData.nationality || profile.nationality ||
        cvData.visaStatus || profile.visaStatus || cvData.noticePeriod)
    ) {
      lSectionHead("Info");
      if (cvData.dateOfBirth) {
        lText("Date of Birth", true, 7.5, DARK);
        lText(cvData.dateOfBirth, false, 8, GRAY);
        lY += 1;
      }
      const nat = cvData.nationality || profile.nationality;
      if (nat) {
        lText("Nationality", true, 7.5, DARK);
        lText(nat, false, 8, GRAY);
        lY += 1;
      }
      const visa = cvData.visaStatus || profile.visaStatus;
      if (visa) {
        lText("Visa Status", true, 7.5, DARK);
        lText(visa, false, 8, GRAY);
        lY += 1;
      }
      if (cvData.noticePeriod) {
        lText("Notice Period", true, 7.5, DARK);
        lText(cvData.noticePeriod, false, 8, GRAY);
        lY += 1;
      }
    }

    // Skills
    if (cvData.skills.length > 0) {
      lSectionHead("Skills");
      cvData.skills.forEach((skill) => {
        lCheckPage(LH + 1);
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(8);
        pdf.setTextColor(...GRAY);
        pdf.text(`• ${skill}`, lX, lY);
        lY += LH;
      });
    }

    // Languages
    if (cvData.languages.length > 0) {
      lSectionHead("Languages");
      cvData.languages.forEach((lang) => {
        lCheckPage(LH + 1);
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(8);
        pdf.setTextColor(...GRAY);
        pdf.text(`• ${lang}`, lX, lY);
        lY += LH;
      });
    }

    // Certifications
    if (cvData.certifications && cvData.certifications.length > 0) {
      lSectionHead("Certifications");
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(7.5);
      pdf.setTextColor(...GRAY);
      cvData.certifications.forEach((cert) => {
        const lines = splitLines(pdf, `• ${cert}`, LTW);
        lines.forEach((line) => {
          lCheckPage(LH);
          pdf.text(line, lX, lY);
          lY += LH;
        });
        lY += 1;
      });
    }

    // ════════════════════════════════════════════════════════════════════
    // RIGHT COLUMN CONTENT
    // ════════════════════════════════════════════════════════════════════

    // ── Header (name + headline on dark bg) ──
    rY = 16;
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(22);
    pdf.setTextColor(...WHITE);
    pdf.text(profile.name.toUpperCase(), rX, rY);
    rY += 9;

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    pdf.setTextColor(200, 200, 210);
    pdf.text((profile.headline || "Professional").toUpperCase(), rX, rY);
    rY = 56; // below the dark header band

    // ── Profile summary ──
    if (cvData.summary) {
      rSectionHead("Profile");
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(9);
      pdf.setTextColor(...GRAY);
      rY = drawText(pdf, cvData.summary, rX + 10, rY, RTW - 10, LH);
      rY += 4;
    }

    // ── Experience ──
    if (cvData.experience.length > 0) {
      rSectionHead("Work Experience");
      cvData.experience.forEach((exp) => {
        rCheckPage(20);

        // Timeline dot
        pdf.setFillColor(...WHITE);
        pdf.setDrawColor(...DARK);
        pdf.setLineWidth(0.5);
        pdf.circle(rX + 1, rY - 1.5, 1.5, "FD");

        // Vertical line segment (approximate — drawn each entry)
        pdf.setDrawColor(180, 180, 185);
        pdf.setLineWidth(0.3);
        pdf.line(rX + 1, rY + 1, rX + 1, rY + 20);

        const dateStr = `${exp.startDate} – ${exp.current ? "Present" : exp.endDate}`;

        // Company name + date on same row
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(10);
        pdf.setTextColor(...DARK);
        const dateW = pdf.getTextWidth(dateStr);
        pdf.setFont("helvetica", "bold");
        pdf.text(exp.company, rX + 5, rY);
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(8);
        pdf.setTextColor(...GRAY);
        pdf.text(dateStr, LC + RC - RP - dateW, rY);
        rY += LHT;

        // Position
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(8.5);
        pdf.setTextColor(...DARK);
        const posLine = exp.location ? `${exp.position}  |  ${exp.location}` : exp.position;
        rY = drawText(pdf, posLine, rX + 5, rY, RTW - 5, LH);
        rY += 1;

        // Description bullets
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(8.5);
        pdf.setTextColor(...GRAY);
        exp.description
          .split("\n")
          .map((l) => l.replace(/^[•\-\*]\s*/, "").trim())
          .filter(Boolean)
          .forEach((line) => {
            rCheckPage(LH + 2);
            const wrapped = splitLines(pdf, line, RTW - 8);
            pdf.text("•", rX + 5, rY);
            wrapped.forEach((wl) => {
              pdf.text(wl, rX + 9, rY);
              rY += LH;
            });
          });
        rY += 5;
      });
    }

    // ── Education ──
    if (cvData.education.length > 0) {
      rSectionHead("Education");
      cvData.education.forEach((edu) => {
        rCheckPage(14);

        pdf.setFillColor(...WHITE);
        pdf.setDrawColor(...DARK);
        pdf.setLineWidth(0.5);
        pdf.circle(rX + 1, rY - 1.5, 1.5, "FD");

        const dateStr = `${edu.startDate} – ${edu.endDate}`;
        const dateW = pdf.getTextWidth(dateStr);

        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(10);
        pdf.setTextColor(...DARK);
        pdf.text(edu.degree, rX + 5, rY);
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(8);
        pdf.setTextColor(...GRAY);
        pdf.text(dateStr, LC + RC - RP - dateW, rY);
        rY += LHT;

        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(8.5);
        pdf.setTextColor(...DARK);
        pdf.text(edu.institution, rX + 5, rY);
        rY += LH;

        if (edu.field) {
          pdf.setFont("helvetica", "normal");
          pdf.setFontSize(8.5);
          pdf.setTextColor(...GRAY);
          pdf.text(edu.field, rX + 5, rY);
          rY += LH;
        }
        rY += 4;
      });
    }

    pdf.save(`${profile.name.replace(/\s+/g, "_")}_CV.pdf`);
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

      {/* ── Toolbar ── */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-lg w-full sm:w-auto overflow-x-auto">
          <button
            onClick={() => setTemplate("modern")}
            className={`flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all flex-1 sm:flex-none whitespace-nowrap ${
              template === "modern"
                ? "bg-white text-blue-600 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            <LayoutTemplate className="w-4 h-4" /> Modern
          </button>
          <button
            onClick={() => setTemplate("ats")}
            className={`flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all flex-1 sm:flex-none whitespace-nowrap ${
              template === "ats"
                ? "bg-white text-blue-600 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
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
            <Download className="w-4 h-4" />
            {isExporting ? "Exporting..." : "Export PDF"}
          </button>
        </div>
      </div>

      {/* ── CV Preview ── */}
      <div className="bg-white shadow-xl border border-gray-200 rounded-lg flex justify-center cv-preview-container overflow-hidden">
        {template === "modern" ? (
          // ─── Modern Template ───────────────────────────────────────────────
          // NOTE: data-col attributes are required for the PDF export clone logic.
          // The exportToPDF function queries [data-col='left'] / [data-col='right']
          // to force two-column layout when rendering off-screen.
          <div
            ref={cvRef}
            className="flex flex-col md:flex-row bg-white text-gray-800 font-sans mx-auto w-full max-w-[210mm]"
            style={{ minHeight: "297mm" }}
          >
            {/* ── Left Column ── */}
            <div
              data-col="left"
              className="w-full md:w-[35%] bg-[#E8E9EB] p-6 md:p-8 pt-8 md:pt-12 flex flex-col"
            >
              {/* Photo */}
              {profile.photoUrl && (
                <div className="w-32 h-32 md:w-40 md:h-40 rounded-full overflow-hidden border-4 border-white shadow-md mx-auto mb-6 md:mb-8 shrink-0">
                  <img
                    src={profile.photoUrl}
                    alt={profile.name}
                    className="w-full h-full object-cover"
                    crossOrigin="anonymous"
                  />
                </div>
              )}

              {/* Contact */}
              <div className="mb-6 md:mb-8">
                <h2 className="text-base md:text-lg font-bold tracking-widest text-[#2C3545] uppercase border-b-2 border-[#2C3545] pb-1 mb-3 md:mb-4">
                  Contact
                </h2>
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
              {showUAEInfo &&
                (cvData.dateOfBirth ||
                  cvData.nationality ||
                  profile.nationality ||
                  cvData.visaStatus ||
                  profile.visaStatus ||
                  cvData.noticePeriod) && (
                  <div className="mb-6 md:mb-8">
                    <h2 className="text-base md:text-lg font-bold tracking-widest text-[#2C3545] uppercase border-b-2 border-[#2C3545] pb-1 mb-3 md:mb-4">
                      Info
                    </h2>
                    <div className="space-y-3 text-sm text-gray-700">
                      {cvData.dateOfBirth && (
                        <div>
                          <span className="font-bold block text-[#2C3545]">
                            Date of Birth
                          </span>
                          <span>{cvData.dateOfBirth}</span>
                        </div>
                      )}
                      {(cvData.nationality || profile.nationality) && (
                        <div>
                          <span className="font-bold block text-[#2C3545]">
                            Nationality
                          </span>
                          <span>
                            {cvData.nationality || profile.nationality}
                          </span>
                        </div>
                      )}
                      {(cvData.visaStatus || profile.visaStatus) && (
                        <div>
                          <span className="font-bold block text-[#2C3545]">
                            Visa Status
                          </span>
                          <span className="capitalize">
                            {cvData.visaStatus || profile.visaStatus}
                          </span>
                        </div>
                      )}
                      {cvData.noticePeriod && (
                        <div>
                          <span className="font-bold block text-[#2C3545]">
                            Notice Period
                          </span>
                          <span>{cvData.noticePeriod}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

              {/* Skills */}
              {cvData.skills.length > 0 && (
                <div className="mb-6 md:mb-8">
                  <h2 className="text-base md:text-lg font-bold tracking-widest text-[#2C3545] uppercase border-b-2 border-[#2C3545] pb-1 mb-3 md:mb-4">
                    Skills
                  </h2>
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
                  <h2 className="text-base md:text-lg font-bold tracking-widest text-[#2C3545] uppercase border-b-2 border-[#2C3545] pb-1 mb-3 md:mb-4">
                    Languages
                  </h2>
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
                  <h2 className="text-base md:text-lg font-bold tracking-widest text-[#2C3545] uppercase border-b-2 border-[#2C3545] pb-1 mb-3 md:mb-4">
                    Certifications
                  </h2>
                  <ul className="list-disc list-inside text-sm text-gray-700 space-y-1.5">
                    {cvData.certifications.map((cert, index) => (
                      <li key={index} className="leading-snug">
                        {cert}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* ── Right Column ── */}
            <div
              data-col="right"
              className="w-full md:w-[65%] flex flex-col bg-white"
            >
              {/* Header */}
              <div className="bg-[#2C3545] text-white p-8 md:p-12 flex flex-col justify-center min-h-[160px] md:min-h-[220px]">
                <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-widest uppercase mb-2 md:mb-3 break-words">
                  {profile.name}
                </h1>
                <h2 className="text-lg md:text-xl tracking-widest uppercase text-gray-300">
                  {profile.headline || "Professional"}
                </h2>
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
                      <h3 className="text-lg md:text-xl font-bold tracking-widest text-[#2C3545] uppercase">
                        Profile
                      </h3>
                    </div>
                    <div className="pl-11 md:pl-14">
                      <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                        {cvData.summary}
                      </p>
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
                      <h3 className="text-lg md:text-xl font-bold tracking-widest text-[#2C3545] uppercase">
                        Work Experience
                      </h3>
                    </div>
                    <div className="pl-4 md:pl-5">
                      <div className="border-l border-gray-300 pl-6 md:pl-8 space-y-6 py-2">
                        {cvData.experience.map((exp, index) => (
                          <div key={index} className="relative">
                            <div className="absolute -left-[29px] md:-left-[38px] top-1.5 w-3 h-3 bg-white border-2 border-[#2C3545] rounded-full" />
                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-baseline mb-1 gap-1 sm:gap-0">
                              <h4 className="font-bold text-gray-900 text-base md:text-lg">
                                {exp.company}
                              </h4>
                              <span className="text-xs md:text-sm text-gray-600 font-medium">
                                {exp.startDate} -{" "}
                                {exp.current ? "Present" : exp.endDate}
                              </span>
                            </div>
                            <p className="text-sm font-bold text-[#2C3545] mb-2">
                              {exp.position}{" "}
                              {exp.location ? `| ${exp.location}` : ""}
                            </p>
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
                      <h3 className="text-lg md:text-xl font-bold tracking-widest text-[#2C3545] uppercase">
                        Education
                      </h3>
                    </div>
                    <div className="pl-4 md:pl-5">
                      <div className="border-l border-gray-300 pl-6 md:pl-8 space-y-6 py-2">
                        {cvData.education.map((edu, index) => (
                          <div key={index} className="relative">
                            <div className="absolute -left-[29px] md:-left-[38px] top-1.5 w-3 h-3 bg-white border-2 border-[#2C3545] rounded-full" />
                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-baseline mb-1 gap-1 sm:gap-0">
                              <h4 className="font-bold text-gray-900 text-base md:text-lg">
                                {edu.degree}
                              </h4>
                              <span className="text-xs md:text-sm text-gray-600 font-medium">
                                {edu.startDate} - {edu.endDate}
                              </span>
                            </div>
                            <p className="text-sm font-bold text-[#2C3545] mb-1">
                              {edu.institution}
                            </p>
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
          // ─── ATS Template ──────────────────────────────────────────────────
          <div
            ref={cvRef}
            className="bg-white text-black font-serif mx-auto w-full max-w-[210mm]"
            style={{
              minHeight: "297mm",
              padding: "0.6in",
              fontFamily: "'Times New Roman', Times, serif",
            }}
          >
            {/* Header */}
            <header className="text-center mb-5">
              <h1 className="text-[24px] font-bold mb-1 uppercase tracking-wider">
                {profile.name}
              </h1>
              <p className="text-[13px] mt-1">
                {profile.location}&nbsp;|&nbsp;{profile.phone}&nbsp;|&nbsp;
                {profile.email}
                {cvData.linkedin && (
                  <>&nbsp;|&nbsp;{cvData.linkedin}</>
                )}
              </p>
            </header>

            {/* Summary */}
            {cvData.summary && (
              <section className="mb-5">
                <h2 className="text-[13px] font-bold uppercase border-b border-black pb-0.5 mb-2">
                  Professional Summary
                </h2>
                <p className="text-[13px] text-justify whitespace-pre-wrap leading-snug">
                  {cvData.summary}
                </p>
              </section>
            )}

            {/* Core Skills */}
            {cvData.skills.length > 0 && (
              <section className="mb-5">
                <h2 className="text-[13px] font-bold uppercase border-b border-black pb-0.5 mb-2">
                  Core Skills
                </h2>
                <p className="text-[13px] leading-snug">
                  {cvData.skills.join(", ")}
                </p>
              </section>
            )}

            {/* Experience */}
            {cvData.experience.length > 0 && (
              <section className="mb-5">
                <h2 className="text-[13px] font-bold uppercase border-b border-black pb-0.5 mb-2">
                  Professional Experience
                </h2>
                <div className="space-y-3">
                  {cvData.experience.map((exp, index) => (
                    <div key={index}>
                      <div className="flex justify-between items-baseline">
                        <h3 className="font-bold text-[13px]">{exp.position}</h3>
                        <span className="text-[13px]">
                          {exp.startDate}&ndash;
                          {exp.current ? "Present" : exp.endDate}
                        </span>
                      </div>
                      <p className="text-[13px] italic mb-1">
                        {exp.company}
                        {exp.location ? `, ${exp.location}` : ""}
                      </p>
                      <ul className="list-disc list-outside ml-5 text-[13px] space-y-0">
                        {exp.description
                          .split("\n")
                          .filter((line) => line.trim() !== "")
                          .map((line, i) => (
                            <li key={i} className="leading-snug">
                              {line.replace(/^[•\-\*]\s*/, "")}
                            </li>
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
                <h2 className="text-[13px] font-bold uppercase border-b border-black pb-0.5 mb-2">
                  Education
                </h2>
                <div className="space-y-1">
                  {cvData.education.map((edu, index) => (
                    <div key={index} className="flex justify-between items-baseline">
                      <p className="text-[13px]">
                        <span className="font-bold">{edu.degree}</span>
                        &mdash;{edu.institution}
                      </p>
                      <span className="text-[13px]">
                        {edu.startDate}&ndash;{edu.endDate}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Certifications */}
            {cvData.certifications && cvData.certifications.length > 0 && (
              <section className="mb-5">
                <h2 className="text-[13px] font-bold uppercase border-b border-black pb-0.5 mb-2">
                  Certifications
                </h2>
                <ul className="list-disc list-outside ml-5 text-[13px] space-y-0">
                  {cvData.certifications.map((cert, index) => (
                    <li key={index} className="leading-snug">
                      {cert}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Languages */}
            {cvData.languages && cvData.languages.length > 0 && (
              <section className="mb-5">
                <h2 className="text-[13px] font-bold uppercase border-b border-black pb-0.5 mb-2">
                  Languages
                </h2>
                <p className="text-[13px] leading-snug">
                  {cvData.languages.join(", ")}
                </p>
              </section>
            )}

            {/* Additional Information (UAE) */}
            {showUAEInfo &&
              (cvData.dateOfBirth ||
                cvData.nationality ||
                profile.nationality ||
                cvData.visaStatus ||
                profile.visaStatus ||
                cvData.noticePeriod) && (
                <section className="mb-5">
                  <h2 className="text-[13px] font-bold uppercase border-b border-black pb-0.5 mb-2">
                    Additional Information
                  </h2>
                  <ul className="list-disc list-inside text-[13px] space-y-1">
                    {cvData.dateOfBirth && (
                      <li>
                        <span className="font-bold">Date of Birth:</span>{" "}
                        {cvData.dateOfBirth}
                      </li>
                    )}
                    {(cvData.nationality || profile.nationality) && (
                      <li>
                        <span className="font-bold">Nationality:</span>{" "}
                        {cvData.nationality || profile.nationality}
                      </li>
                    )}
                    {(cvData.visaStatus || profile.visaStatus) && (
                      <li>
                        <span className="font-bold">Visa Status:</span>{" "}
                        <span className="capitalize">
                          {cvData.visaStatus || profile.visaStatus}
                        </span>
                      </li>
                    )}
                    {cvData.noticePeriod && (
                      <li>
                        <span className="font-bold">Notice Period:</span>{" "}
                        {cvData.noticePeriod}
                      </li>
                    )}
                  </ul>
                </section>
              )}
          </div>
        )}
      </div>
    </div>
  );
}