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
  Settings2,
  ChevronDown,
  ChevronUp,
  RotateCcw,
} from "lucide-react";
import jsPDF from "jspdf";

interface CVPreviewProps {
  profile: UserProfile;
  cvData: CVData;
}

// ─── Typography settings ──────────────────────────────────────────────────────
interface TypographySettings {
  fontFamily:  "times" | "helvetica" | "courier";
  bodySize:    number; // pt  8–13
  nameSize:    number; // pt  16–28
  sectionSize: number; // pt  9–14
  lineSpacing: number; // multiplier 1.0–2.5
  wordSpacing: number; // em  0–0.30
  sectionGap:  number; // mm  2–12
  marginH:     number; // mm  10–30
  marginV:     number; // mm  10–25
}

const FONT_OPTIONS: { label: string; value: TypographySettings["fontFamily"]; css: string }[] = [
  { label: "Times New Roman", value: "times",     css: "'Times New Roman', Times, serif" },
  { label: "Helvetica",       value: "helvetica", css: "Helvetica, Arial, sans-serif" },
  { label: "Courier",         value: "courier",   css: "'Courier New', Courier, monospace" },
];

const DEFAULTS: TypographySettings = {
  fontFamily:  "times",
  bodySize:    9,
  nameSize:    18,
  sectionSize: 10,
  lineSpacing: 1.4,
  wordSpacing: 0,
  sectionGap:  4,
  marginH:     20,
  marginV:     18,
};

// ─── Reusable slider ──────────────────────────────────────────────────────────
function Slider({
  label, value, min, max, step, unit, onChange,
}: {
  label: string; value: number; min: number; max: number;
  step: number; unit: string; onChange: (v: number) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between items-center">
        <span className="text-xs font-medium text-gray-600">{label}</span>
        <span className="text-xs font-semibold text-gray-800 tabular-nums">
          {value.toFixed(step < 1 ? (String(step).split(".")[1]?.length ?? 1) : 0)}{unit}
        </span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-1.5 rounded-full accent-blue-600 cursor-pointer"
      />
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function CVPreview({ profile, cvData }: CVPreviewProps) {
  const cvRef      = useRef<HTMLDivElement>(null);
  const [template,    setTemplate]    = useState<"modern" | "ats">("modern");
  const [isExporting, setIsExporting] = useState(false);
  const [showUAEInfo, setShowUAEInfo] = useState(true);
  const [showTypo,    setShowTypo]    = useState(false);
  const [typo,        setTypo]        = useState<TypographySettings>(DEFAULTS);

  const setT = <K extends keyof TypographySettings>(key: K, val: TypographySettings[K]) =>
    setTypo((prev) => ({ ...prev, [key]: val }));

  // ── Derived CSS values for live preview ──
  const fontCss   = FONT_OPTIONS.find((f) => f.value === typo.fontFamily)?.css ?? FONT_OPTIONS[0].css;
  const bodyPx    = `${(typo.bodySize    * 4 / 3).toFixed(1)}px`;
  const namePx    = `${(typo.nameSize    * 4 / 3).toFixed(1)}px`;
  const sectionPx = `${(typo.sectionSize * 4 / 3).toFixed(1)}px`;
  const lineH     = `${typo.lineSpacing}`;
  const wordSp    = `${typo.wordSpacing}em`;
  const marginHpx = `${(typo.marginH * 96 / 25.4).toFixed(1)}px`;
  const marginVpx = `${(typo.marginV * 96 / 25.4).toFixed(1)}px`;

  // Line-height in mm for jsPDF: pt × lineSpacing × 0.352778 mm/pt
  const mmLH = (pt: number) => pt * typo.lineSpacing * 0.352778;

  // ─── PDF export dispatcher ────────────────────────────────────────────────
  const exportToPDF = () => {
    setIsExporting(true);
    try { template === "ats" ? exportATS() : exportModern(); }
    finally { setIsExporting(false); }
  };

  // ── Shared PDF text helpers ──
  const splitLines = (pdf: jsPDF, text: string, maxW: number) =>
    text ? pdf.splitTextToSize(text.trim(), maxW) : [] as string[];

  const drawWrapped = (
    pdf: jsPDF, text: string,
    x: number, y: number, maxW: number, lh: number, wsp = 0
  ): number => {
    splitLines(pdf, text, maxW).forEach((line: string) => {
      if (wsp > 0) pdf.setCharSpace(wsp);
      pdf.text(line, x, y);
      if (wsp > 0) pdf.setCharSpace(0);
      y += lh;
    });
    return y;
  };

  // ─── ATS PDF ─────────────────────────────────────────────────────────────
  const exportATS = () => {
    const pdf  = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });
    const font = typo.fontFamily;
    const W = 210, H = 297;
    const ML = typo.marginH, MR = typo.marginH;
    const MT = typo.marginV, MB = typo.marginV;
    const TW  = W - ML - MR;
    const WSP = typo.wordSpacing * 3;
    const LHB = mmLH(typo.bodySize);
    const LHS = mmLH(typo.sectionSize);
    const GAP = typo.sectionGap;
    let y = MT;

    const checkPage = (need: number) => {
      if (y + need > H - MB) { pdf.addPage(); y = MT; }
    };

    const heading = (label: string) => {
      checkPage(10); y += GAP * 0.7;
      pdf.setFont(font, "bold"); pdf.setFontSize(typo.sectionSize);
      pdf.text(label.toUpperCase(), ML, y);
      y += 1.5;
      pdf.setLineWidth(0.4); pdf.line(ML, y, ML + TW, y);
      y += LHS * 0.8;
    };

    // Name
    pdf.setFont(font, "bold"); pdf.setFontSize(typo.nameSize);
    const nW = pdf.getTextWidth(profile.name.toUpperCase());
    pdf.text(profile.name.toUpperCase(), (W - nW) / 2, y);
    y += mmLH(typo.nameSize);

    // Contact
    const contact = [profile.location, profile.phone, profile.email, cvData.linkedin]
      .filter(Boolean).join("  |  ");
    pdf.setFont(font, "normal"); pdf.setFontSize(typo.bodySize - 0.5);
    const cW = pdf.getTextWidth(contact);
    if (cW <= TW) { pdf.text(contact, (W - cW) / 2, y); y += LHB + 1; }
    else          { y = drawWrapped(pdf, contact, ML, y, TW, LHB, WSP); y += 2; }

    // Summary
    if (cvData.summary) {
      heading("Professional Summary");
      pdf.setFont(font, "normal"); pdf.setFontSize(typo.bodySize);
      y = drawWrapped(pdf, cvData.summary, ML, y, TW, LHB, WSP);
      y += GAP * 0.5;
    }

    // Skills
    if (cvData.skills.length > 0) {
      heading("Core Skills");
      pdf.setFont(font, "normal"); pdf.setFontSize(typo.bodySize);
      y = drawWrapped(pdf, cvData.skills.join(", "), ML, y, TW, LHB, WSP);
      y += GAP * 0.5;
    }

    // Experience
    if (cvData.experience.length > 0) {
      heading("Professional Experience");
      cvData.experience.forEach((exp) => {
        checkPage(18);
        const dateStr = `${exp.startDate} – ${exp.current ? "Present" : exp.endDate}`;
        pdf.setFont(font, "bold"); pdf.setFontSize(typo.bodySize);
        pdf.text(exp.position, ML, y);
        pdf.setFont(font, "normal");
        pdf.text(dateStr, W - MR - pdf.getTextWidth(dateStr), y);
        y += LHB;
        pdf.setFont(font, "italic");
        y = drawWrapped(pdf, [exp.company, exp.location].filter(Boolean).join(", "), ML, y, TW, LHB);
        y += 1;
        pdf.setFont(font, "normal");
        exp.description.split("\n").map((l) => l.replace(/^[•\-\*]\s*/, "").trim()).filter(Boolean)
          .forEach((line) => {
            checkPage(LHB + 2);
            const wrapped = splitLines(pdf, line, TW - 5);
            pdf.text("•", ML, y);
            wrapped.forEach((wl: string) => {
              if (WSP > 0) pdf.setCharSpace(WSP);
              pdf.text(wl, ML + 4, y);
              if (WSP > 0) pdf.setCharSpace(0);
              y += LHB;
            });
          });
        y += GAP * 0.75;
      });
    }

    // Education
    if (cvData.education.length > 0) {
      heading("Education");
      cvData.education.forEach((edu) => {
        checkPage(10);
        const dateStr = `${edu.startDate} – ${edu.endDate}`;
        pdf.setFont(font, "bold"); pdf.setFontSize(typo.bodySize);
        pdf.text(edu.degree, ML, y);
        pdf.setFont(font, "normal");
        pdf.text(dateStr, W - MR - pdf.getTextWidth(dateStr), y);
        y += LHB;
        pdf.setFont(font, "italic"); pdf.text(edu.institution, ML, y);
        y += LHB + 1;
      });
    }

    // Certifications
    if (cvData.certifications?.length) {
      heading("Certifications");
      pdf.setFont(font, "normal"); pdf.setFontSize(typo.bodySize);
      cvData.certifications.forEach((cert) => {
        checkPage(LHB + 2);
        splitLines(pdf, cert, TW - 5).forEach((wl: string) => {
          pdf.text("•", ML, y); pdf.text(wl, ML + 4, y); y += LHB;
        });
      });
      y += GAP * 0.5;
    }

    // Languages
    if (cvData.languages?.length) {
      heading("Languages");
      pdf.setFont(font, "normal"); pdf.setFontSize(typo.bodySize);
      y = drawWrapped(pdf, cvData.languages.join(", "), ML, y, TW, LHB, WSP);
      y += GAP * 0.5;
    }

    // UAE info
    if (showUAEInfo && (cvData.dateOfBirth || cvData.nationality || profile.nationality ||
        cvData.visaStatus || profile.visaStatus || cvData.noticePeriod)) {
      heading("Additional Information");
      pdf.setFontSize(typo.bodySize);
      ([
        ["Date of Birth", cvData.dateOfBirth],
        ["Nationality",   cvData.nationality || profile.nationality],
        ["Visa Status",   cvData.visaStatus  || profile.visaStatus],
        ["Notice Period", cvData.noticePeriod],
      ] as [string, string | undefined][]).filter(([, v]) => v)
        .forEach(([label, value]) => {
          checkPage(LHB + 2);
          pdf.setFont(font, "bold"); pdf.text(`${label}: `, ML, y);
          const lW = pdf.getTextWidth(`${label}: `);
          pdf.setFont(font, "normal");
          y = drawWrapped(pdf, value!, ML + lW, y, TW - lW, LHB, WSP);
        });
    }

    pdf.save(`${profile.name.replace(/\s+/g, "_")}_CV.pdf`);
  };

  // ─── Modern PDF ───────────────────────────────────────────────────────────
  const exportModern = () => {
    const pdf  = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });
    const font = typo.fontFamily;
    const W = 210, H = 297;
    const LC = 73, RC = W - LC;
    const LP = 8,  RP = 10;
    const MB  = typo.marginV * 0.7;
    const LTW = LC - LP * 2;
    const RTW = RC - RP * 2;
    const WSP = typo.wordSpacing * 3;
    const GAP = typo.sectionGap;
    const LHB = mmLH(typo.bodySize);
    const LHS = mmLH(typo.bodySize - 1);

    const DARK : [number, number, number] = [44,  53,  69 ];
    const LIGHT: [number, number, number] = [232, 233, 235];
    const WHITE: [number, number, number] = [255, 255, 255];
    const GRAY : [number, number, number] = [55,  65,  81 ];

    let lY = 12, rY = 0;
    const lX = LP, rX = LC + RP;

    const drawBg = () => {
      pdf.setFillColor(...LIGHT); pdf.rect(0, 0, LC, H, "F");
      pdf.setFillColor(...DARK);  pdf.rect(LC, 0, RC, 52, "F");
    };
    drawBg();

    const lCheck = (n: number) => {
      if (lY + n > H - MB) {
        pdf.addPage(); lY = 12;
        pdf.setFillColor(...LIGHT); pdf.rect(0, 0, LC, H, "F");
        pdf.setFillColor(...DARK);  pdf.rect(LC, 0, RC, 8, "F");
      }
    };
    const rCheck = (n: number) => {
      if (rY + n > H - MB) {
        pdf.addPage(); rY = 14;
        pdf.setFillColor(...LIGHT); pdf.rect(0, 0, LC, H, "F");
        pdf.setFillColor(...DARK);  pdf.rect(LC, 0, RC, 8, "F");
      }
    };

    const lHead = (label: string) => {
      lCheck(12); lY += GAP * 0.6;
      pdf.setFont(font, "bold"); pdf.setFontSize(typo.sectionSize - 2);
      pdf.setTextColor(...DARK); pdf.text(label.toUpperCase(), lX, lY);
      lY += 1.5;
      pdf.setDrawColor(...DARK); pdf.setLineWidth(0.5);
      pdf.line(lX, lY, lX + LTW, lY);
      lY += LHS * 0.9;
    };

    const lText = (
      text: string, bold = false,
      size = typo.bodySize - 1,
      color: [number, number, number] = GRAY
    ) => {
      pdf.setFont(font, bold ? "bold" : "normal");
      pdf.setFontSize(size); pdf.setTextColor(...color);
      splitLines(pdf, text, LTW).forEach((line: string) => {
        lCheck(LHS);
        if (WSP > 0) pdf.setCharSpace(WSP);
        pdf.text(line, lX, lY);
        if (WSP > 0) pdf.setCharSpace(0);
        lY += LHS;
      });
    };

    const rHead = (label: string) => {
      rCheck(14); rY += GAP * 0.8;
      pdf.setFillColor(...DARK); pdf.circle(rX + 3.5, rY - 2, 3.5, "F");
      pdf.setFont(font, "bold"); pdf.setFontSize(typo.sectionSize);
      pdf.setTextColor(...DARK); pdf.text(label.toUpperCase(), rX + 10, rY);
      rY += LHB * 1.2;
    };

    const rDraw = (text: string, x: number, maxW: number, lh: number) => {
      splitLines(pdf, text, maxW).forEach((line: string) => {
        rCheck(lh);
        if (WSP > 0) pdf.setCharSpace(WSP);
        pdf.text(line, x, rY);
        if (WSP > 0) pdf.setCharSpace(0);
        rY += lh;
      });
    };

    // ── Left column ──
    if (profile.photoUrl) {
      pdf.setFillColor(...WHITE); pdf.circle(LC / 2, lY + 18, 18, "F");
      lY += 40;
    }

    lHead("Contact");
    if (profile.phone)    { lText("Phone",    true, typo.bodySize - 1.5, DARK); lText(profile.phone);    lY += 1; }
    if (profile.email)    { lText("Email",    true, typo.bodySize - 1.5, DARK); lText(profile.email);    lY += 1; }
    if (profile.location) { lText("Location", true, typo.bodySize - 1.5, DARK); lText(profile.location); lY += 1; }
    if (cvData.linkedin)  { lText("LinkedIn", true, typo.bodySize - 1.5, DARK); lText(cvData.linkedin, false, typo.bodySize - 1.5); lY += 1; }

    if (showUAEInfo && (cvData.dateOfBirth || cvData.nationality || profile.nationality ||
        cvData.visaStatus || profile.visaStatus || cvData.noticePeriod)) {
      lHead("Info");
      if (cvData.dateOfBirth) { lText("Date of Birth", true, typo.bodySize - 1.5, DARK); lText(cvData.dateOfBirth); lY += 1; }
      const nat = cvData.nationality || profile.nationality;
      if (nat)                { lText("Nationality",   true, typo.bodySize - 1.5, DARK); lText(nat);  lY += 1; }
      const visa = cvData.visaStatus || profile.visaStatus;
      if (visa)               { lText("Visa Status",   true, typo.bodySize - 1.5, DARK); lText(visa); lY += 1; }
      if (cvData.noticePeriod){ lText("Notice Period", true, typo.bodySize - 1.5, DARK); lText(cvData.noticePeriod); lY += 1; }
    }

    if (cvData.skills.length > 0) {
      lHead("Skills");
      cvData.skills.forEach((s) => {
        lCheck(LHS); pdf.setFont(font, "normal");
        pdf.setFontSize(typo.bodySize - 1); pdf.setTextColor(...GRAY);
        pdf.text(`• ${s}`, lX, lY); lY += LHS;
      });
    }

    if (cvData.languages.length > 0) {
      lHead("Languages");
      cvData.languages.forEach((l) => {
        lCheck(LHS); pdf.setFont(font, "normal");
        pdf.setFontSize(typo.bodySize - 1); pdf.setTextColor(...GRAY);
        pdf.text(`• ${l}`, lX, lY); lY += LHS;
      });
    }

    if (cvData.certifications?.length) {
      lHead("Certifications");
      pdf.setFont(font, "normal"); pdf.setFontSize(typo.bodySize - 1.5); pdf.setTextColor(...GRAY);
      cvData.certifications.forEach((c) => {
        splitLines(pdf, `• ${c}`, LTW).forEach((line: string) => {
          lCheck(LHS); pdf.text(line, lX, lY); lY += LHS;
        }); lY += 1;
      });
    }

    // ── Right column ──
    rY = 16;
    pdf.setFont(font, "bold"); pdf.setFontSize(typo.nameSize);
    pdf.setTextColor(...WHITE);
    pdf.text(profile.name.toUpperCase(), rX, rY);
    rY += mmLH(typo.nameSize);

    pdf.setFont(font, "normal"); pdf.setFontSize(typo.bodySize + 1);
    pdf.setTextColor(200, 200, 210);
    pdf.text((profile.headline || "Professional").toUpperCase(), rX, rY);
    rY = 56;

    if (cvData.summary) {
      rHead("Profile");
      pdf.setFont(font, "normal"); pdf.setFontSize(typo.bodySize); pdf.setTextColor(...GRAY);
      rDraw(cvData.summary, rX + 10, RTW - 10, LHB);
      rY += GAP * 0.5;
    }

    if (cvData.experience.length > 0) {
      rHead("Work Experience");
      cvData.experience.forEach((exp) => {
        rCheck(20);
        pdf.setFillColor(...WHITE); pdf.setDrawColor(...DARK); pdf.setLineWidth(0.5);
        pdf.circle(rX + 1, rY - 1.5, 1.5, "FD");
        pdf.setDrawColor(180, 180, 185); pdf.setLineWidth(0.3);
        pdf.line(rX + 1, rY + 1, rX + 1, rY + 20);

        const dateStr = `${exp.startDate} – ${exp.current ? "Present" : exp.endDate}`;
        pdf.setFont(font, "bold"); pdf.setFontSize(typo.bodySize + 1); pdf.setTextColor(...DARK);
        pdf.text(exp.company, rX + 5, rY);
        pdf.setFont(font, "normal"); pdf.setFontSize(typo.bodySize - 1); pdf.setTextColor(...GRAY);
        pdf.text(dateStr, LC + RC - RP - pdf.getTextWidth(dateStr), rY);
        rY += LHB * 1.1;

        pdf.setFont(font, "bold"); pdf.setFontSize(typo.bodySize); pdf.setTextColor(...DARK);
        rDraw(exp.location ? `${exp.position}  |  ${exp.location}` : exp.position, rX + 5, RTW - 5, LHB);
        rY += 1;

        pdf.setFont(font, "normal"); pdf.setFontSize(typo.bodySize); pdf.setTextColor(...GRAY);
        exp.description.split("\n").map((l) => l.replace(/^[•\-\*]\s*/, "").trim()).filter(Boolean)
          .forEach((line) => {
            rCheck(LHB + 2);
            splitLines(pdf, line, RTW - 8).forEach((wl: string) => {
              pdf.text("•", rX + 5, rY);
              if (WSP > 0) pdf.setCharSpace(WSP);
              pdf.text(wl, rX + 9, rY);
              if (WSP > 0) pdf.setCharSpace(0);
              rY += LHB;
            });
          });
        rY += GAP * 0.8;
      });
    }

    if (cvData.education.length > 0) {
      rHead("Education");
      cvData.education.forEach((edu) => {
        rCheck(14);
        pdf.setFillColor(...WHITE); pdf.setDrawColor(...DARK); pdf.setLineWidth(0.5);
        pdf.circle(rX + 1, rY - 1.5, 1.5, "FD");

        const dateStr = `${edu.startDate} – ${edu.endDate}`;
        pdf.setFont(font, "bold"); pdf.setFontSize(typo.bodySize + 1); pdf.setTextColor(...DARK);
        pdf.text(edu.degree, rX + 5, rY);
        pdf.setFont(font, "normal"); pdf.setFontSize(typo.bodySize - 1); pdf.setTextColor(...GRAY);
        pdf.text(dateStr, LC + RC - RP - pdf.getTextWidth(dateStr), rY);
        rY += LHB * 1.1;

        pdf.setFont(font, "bold"); pdf.setFontSize(typo.bodySize); pdf.setTextColor(...DARK);
        pdf.text(edu.institution, rX + 5, rY); rY += LHB;

        if (edu.field) {
          pdf.setFont(font, "normal"); pdf.setFontSize(typo.bodySize); pdf.setTextColor(...GRAY);
          pdf.text(edu.field, rX + 5, rY); rY += LHB;
        }
        rY += GAP * 0.6;
      });
    }

    pdf.save(`${profile.name.replace(/\s+/g, "_")}_CV.pdf`);
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      <style>{`
        .cv-preview-container {
          --color-white:#fff;--color-black:#000;--color-gray-50:#f9fafb;
          --color-gray-100:#f3f4f6;--color-gray-200:#e5e7eb;--color-gray-400:#9ca3af;
          --color-gray-500:#6b7280;--color-gray-600:#4b5563;--color-gray-700:#374151;
          --color-gray-800:#1f2937;--color-gray-900:#111827;
          --color-blue-50:#eff6ff;--color-blue-100:#dbeafe;--color-blue-600:#2563eb;
        }
        .cv-preview-container .bg-white        { background-color:var(--color-white)!important; }
        .cv-preview-container .text-gray-700   { color:var(--color-gray-700)!important; }
        .cv-preview-container .text-gray-800   { color:var(--color-gray-800)!important; }
        .cv-preview-container .text-gray-900   { color:var(--color-gray-900)!important; }
        .cv-preview-container .text-gray-600   { color:var(--color-gray-600)!important; }
        .cv-preview-container .text-gray-500   { color:var(--color-gray-500)!important; }
        .cv-preview-container .border-gray-200 { border-color:var(--color-gray-200)!important; }
        .cv-preview-container .border-gray-100 { border-color:var(--color-gray-100)!important; }
        .cv-preview-container .bg-gray-100     { background-color:var(--color-gray-100)!important; }
        .cv-preview-container .bg-gray-50      { background-color:var(--color-gray-50)!important; }
        .cv-preview-container .text-black      { color:var(--color-black)!important; }
        .cv-preview-container .border-black    { border-color:var(--color-black)!important; }
      `}</style>

      {/* ── Toolbar ── */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-3 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-lg w-full sm:w-auto">
          {(["modern", "ats"] as const).map((t) => (
            <button key={t} onClick={() => setTemplate(t)}
              className={`flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all flex-1 sm:flex-none whitespace-nowrap ${
                template === t ? "bg-white text-blue-600 shadow-sm" : "text-gray-600 hover:text-gray-900"
              }`}
            >
              {t === "modern" ? <LayoutTemplate className="w-4 h-4" /> : <AlignLeft className="w-4 h-4" />}
              {t === "modern" ? "Modern" : "ATS Friendly"}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap justify-end">
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer bg-gray-50 px-3 py-2 rounded-md border border-gray-200">
            <input type="checkbox" checked={showUAEInfo} onChange={(e) => setShowUAEInfo(e.target.checked)}
              className="rounded text-blue-600 focus:ring-blue-500" />
            UAE Info
          </label>

          <button onClick={() => setShowTypo((v) => !v)}
            className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium border transition-all ${
              showTypo ? "bg-blue-50 text-blue-600 border-blue-200" : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100"
            }`}
          >
            <Settings2 className="w-4 h-4" /> Typography
            {showTypo ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>

          <button onClick={exportToPDF} disabled={isExporting}
            className="flex items-center justify-center gap-2 bg-blue-600 text-white px-5 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors shadow-sm flex-1 sm:flex-none disabled:opacity-70"
          >
            <Download className="w-4 h-4" />
            {isExporting ? "Exporting…" : "Export PDF"}
          </button>
        </div>
      </div>

      {/* ── Typography Panel ── */}
      {showTypo && (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5 space-y-5">
          {/* Panel header */}
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
              <Settings2 className="w-4 h-4 text-blue-600" />
              Typography &amp; Spacing
            </h3>
            <button onClick={() => setTypo(DEFAULTS)}
              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 border border-gray-200 px-2.5 py-1.5 rounded-md hover:bg-gray-50 transition-colors">
              <RotateCcw className="w-3 h-3" /> Reset defaults
            </button>
          </div>

          {/* Font family picker */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Font Family</p>
            <div className="flex gap-2 flex-wrap">
              {FONT_OPTIONS.map((f) => (
                <button key={f.value} onClick={() => setT("fontFamily", f.value)}
                  className={`px-4 py-2 rounded-lg text-sm border transition-all ${
                    typo.fontFamily === f.value
                      ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                      : "bg-white text-gray-700 border-gray-200 hover:border-blue-300 hover:bg-blue-50"
                  }`}
                  style={{ fontFamily: f.css }}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Sliders grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="space-y-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Font Sizes</p>
              <Slider label="Body text"       value={typo.bodySize}    min={8}  max={13} step={0.5} unit="pt" onChange={(v) => setT("bodySize",    v)} />
              <Slider label="Name / heading"  value={typo.nameSize}    min={16} max={28} step={1}   unit="pt" onChange={(v) => setT("nameSize",    v)} />
              <Slider label="Section titles"  value={typo.sectionSize} min={9}  max={14} step={0.5} unit="pt" onChange={(v) => setT("sectionSize", v)} />
            </div>
            <div className="space-y-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Spacing</p>
              <Slider label="Line spacing"    value={typo.lineSpacing} min={1.0} max={2.5} step={0.1}  unit="×"  onChange={(v) => setT("lineSpacing", v)} />
              <Slider label="Word spacing"    value={typo.wordSpacing} min={0}   max={0.3} step={0.05} unit="em" onChange={(v) => setT("wordSpacing", v)} />
              <Slider label="Section gap"     value={typo.sectionGap}  min={2}   max={12}  step={1}    unit="mm" onChange={(v) => setT("sectionGap",  v)} />
            </div>
            <div className="space-y-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Page Margins</p>
              <Slider label="Left / Right"    value={typo.marginH} min={10} max={30} step={1} unit="mm" onChange={(v) => setT("marginH", v)} />
              <Slider label="Top / Bottom"    value={typo.marginV} min={10} max={25} step={1} unit="mm" onChange={(v) => setT("marginV", v)} />
            </div>
          </div>

          {/* Live preview strip */}
          <div className="rounded-lg border border-blue-100 bg-blue-50 overflow-hidden">
            <div className="px-3 py-1.5 bg-blue-100 border-b border-blue-200">
              <p className="text-xs font-medium text-blue-700">Live Preview</p>
            </div>
            <div className="p-4 bg-white" style={{ fontFamily: fontCss, fontSize: bodyPx, lineHeight: lineH, wordSpacing: wordSp }}>
              <p className="font-bold uppercase text-center mb-1" style={{ fontSize: namePx }}>
                {profile.name || "Your Name"}
              </p>
              <p className="text-center text-gray-500 mb-3" style={{ fontSize: `calc(${bodyPx} - 1px)` }}>
                {[profile.location, profile.phone, profile.email].filter(Boolean).join("  |  ")}
              </p>
              <p className="font-bold uppercase border-b border-gray-300 pb-0.5 mb-1 text-gray-800" style={{ fontSize: sectionPx }}>
                Professional Summary
              </p>
              <p className="text-gray-700">
                {cvData.summary?.slice(0, 200) ||
                  "Your professional summary will appear here. Adjust the sliders above to see typography changes applied in real time across the full CV preview below."}
                {cvData.summary && cvData.summary.length > 200 ? "…" : ""}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── CV Preview ── */}
      <div className="bg-white shadow-xl border border-gray-200 rounded-lg flex justify-center cv-preview-container overflow-hidden">
        {template === "modern" ? (
          // ── Modern template ──────────────────────────────────────────────
          <div ref={cvRef}
            className="flex flex-col md:flex-row bg-white text-gray-800 mx-auto w-full max-w-[210mm]"
            style={{ minHeight: "297mm", fontFamily: fontCss, fontSize: bodyPx, lineHeight: lineH, wordSpacing: wordSp }}
          >
            {/* Left sidebar */}
            <div data-col="left"
              className="w-full md:w-[35%] bg-[#E8E9EB] flex flex-col"
              style={{ padding: `${marginVpx} ${marginHpx}` }}
            >
              {profile.photoUrl && (
                <div className="w-32 h-32 md:w-40 md:h-40 rounded-full overflow-hidden border-4 border-white shadow-md mx-auto mb-6 shrink-0">
                  <img src={profile.photoUrl} alt={profile.name} className="w-full h-full object-cover" crossOrigin="anonymous" />
                </div>
              )}

              {/* Contact */}
              <div className="mb-5">
                <h2 className="font-bold tracking-widest text-[#2C3545] uppercase border-b-2 border-[#2C3545] pb-1 mb-3" style={{ fontSize: sectionPx }}>Contact</h2>
                <div className="space-y-2 text-gray-700">
                  {profile.phone    && <div className="flex items-center gap-2"><Phone    className="w-3.5 h-3.5 text-[#2C3545] shrink-0" /><span className="break-all">{profile.phone}</span></div>}
                  {profile.email    && <div className="flex items-center gap-2"><Mail     className="w-3.5 h-3.5 text-[#2C3545] shrink-0" /><span className="break-all">{profile.email}</span></div>}
                  {profile.location && <div className="flex items-center gap-2"><MapPin   className="w-3.5 h-3.5 text-[#2C3545] shrink-0" /><span>{profile.location}</span></div>}
                  {cvData.linkedin  && <div className="flex items-center gap-2"><Linkedin className="w-3.5 h-3.5 text-[#2C3545] shrink-0" /><span className="break-all">{cvData.linkedin}</span></div>}
                </div>
              </div>

              {/* UAE Info */}
              {showUAEInfo && (cvData.dateOfBirth || cvData.nationality || profile.nationality ||
                cvData.visaStatus || profile.visaStatus || cvData.noticePeriod) && (
                <div className="mb-5">
                  <h2 className="font-bold tracking-widest text-[#2C3545] uppercase border-b-2 border-[#2C3545] pb-1 mb-3" style={{ fontSize: sectionPx }}>Info</h2>
                  <div className="space-y-2 text-gray-700">
                    {cvData.dateOfBirth && <div><span className="font-bold block text-[#2C3545]">Date of Birth</span><span>{cvData.dateOfBirth}</span></div>}
                    {(cvData.nationality || profile.nationality) && <div><span className="font-bold block text-[#2C3545]">Nationality</span><span>{cvData.nationality || profile.nationality}</span></div>}
                    {(cvData.visaStatus || profile.visaStatus) && <div><span className="font-bold block text-[#2C3545]">Visa Status</span><span className="capitalize">{cvData.visaStatus || profile.visaStatus}</span></div>}
                    {cvData.noticePeriod && <div><span className="font-bold block text-[#2C3545]">Notice Period</span><span>{cvData.noticePeriod}</span></div>}
                  </div>
                </div>
              )}

              {/* Skills */}
              {cvData.skills.length > 0 && (
                <div className="mb-5">
                  <h2 className="font-bold tracking-widest text-[#2C3545] uppercase border-b-2 border-[#2C3545] pb-1 mb-3" style={{ fontSize: sectionPx }}>Skills</h2>
                  <ul className="list-disc list-inside text-gray-700 space-y-1">
                    {cvData.skills.map((s, i) => <li key={i}>{s}</li>)}
                  </ul>
                </div>
              )}

              {/* Languages */}
              {cvData.languages.length > 0 && (
                <div className="mb-5">
                  <h2 className="font-bold tracking-widest text-[#2C3545] uppercase border-b-2 border-[#2C3545] pb-1 mb-3" style={{ fontSize: sectionPx }}>Languages</h2>
                  <ul className="list-disc list-inside text-gray-700 space-y-1">
                    {cvData.languages.map((l, i) => <li key={i}>{l}</li>)}
                  </ul>
                </div>
              )}

              {/* Certifications */}
              {cvData.certifications?.length && (
                <div className="mb-5">
                  <h2 className="font-bold tracking-widest text-[#2C3545] uppercase border-b-2 border-[#2C3545] pb-1 mb-3" style={{ fontSize: sectionPx }}>Certifications</h2>
                  <ul className="list-disc list-inside text-gray-700 space-y-1">
                    {cvData.certifications.map((c, i) => <li key={i} className="leading-snug">{c}</li>)}
                  </ul>
                </div>
              )}
            </div>

            {/* Right column */}
            <div data-col="right" className="w-full md:w-[65%] flex flex-col bg-white">
              {/* Dark header band */}
              <div className="bg-[#2C3545] text-white flex flex-col justify-center min-h-[160px] md:min-h-[200px]"
                style={{ padding: `${marginVpx} ${marginHpx}` }}>
                <h1 className="font-bold tracking-widest uppercase mb-2 break-words" style={{ fontSize: namePx, fontFamily: fontCss }}>
                  {profile.name}
                </h1>
                <h2 className="tracking-widest uppercase text-gray-300" style={{ fontSize: bodyPx, fontFamily: fontCss }}>
                  {profile.headline || "Professional"}
                </h2>
              </div>

              {/* Sections */}
              <div className="flex-1 space-y-6" style={{ padding: `${marginVpx} ${marginHpx}` }}>

                {cvData.summary && (
                  <section>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-8 h-8 rounded-full bg-[#2C3545] text-white flex items-center justify-center shrink-0"><User className="w-4 h-4" /></div>
                      <h3 className="font-bold tracking-widest text-[#2C3545] uppercase" style={{ fontSize: sectionPx }}>Profile</h3>
                    </div>
                    <div className="pl-11">
                      <p className="text-gray-700 whitespace-pre-wrap" style={{ fontSize: bodyPx, lineHeight: lineH, wordSpacing: wordSp }}>{cvData.summary}</p>
                    </div>
                  </section>
                )}

                {cvData.experience.length > 0 && (
                  <section>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-8 h-8 rounded-full bg-[#2C3545] text-white flex items-center justify-center shrink-0"><Briefcase className="w-4 h-4" /></div>
                      <h3 className="font-bold tracking-widest text-[#2C3545] uppercase" style={{ fontSize: sectionPx }}>Work Experience</h3>
                    </div>
                    <div className="pl-4">
                      <div className="border-l border-gray-300 pl-7 space-y-5 py-1">
                        {cvData.experience.map((exp, i) => (
                          <div key={i} className="relative">
                            <div className="absolute -left-[30px] top-1.5 w-3 h-3 bg-white border-2 border-[#2C3545] rounded-full" />
                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-baseline mb-1 gap-1">
                              <h4 className="font-bold text-gray-900" style={{ fontSize: bodyPx }}>{exp.company}</h4>
                              <span className="text-gray-600 font-medium" style={{ fontSize: `calc(${bodyPx} - 1px)` }}>
                                {exp.startDate} – {exp.current ? "Present" : exp.endDate}
                              </span>
                            </div>
                            <p className="font-bold text-[#2C3545] mb-1" style={{ fontSize: bodyPx }}>
                              {exp.position}{exp.location ? ` | ${exp.location}` : ""}
                            </p>
                            <div className="text-gray-700 whitespace-pre-wrap" style={{ fontSize: bodyPx, lineHeight: lineH, wordSpacing: wordSp }}>
                              {exp.description}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </section>
                )}

                {cvData.education.length > 0 && (
                  <section>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-8 h-8 rounded-full bg-[#2C3545] text-white flex items-center justify-center shrink-0"><GraduationCap className="w-4 h-4" /></div>
                      <h3 className="font-bold tracking-widest text-[#2C3545] uppercase" style={{ fontSize: sectionPx }}>Education</h3>
                    </div>
                    <div className="pl-4">
                      <div className="border-l border-gray-300 pl-7 space-y-5 py-1">
                        {cvData.education.map((edu, i) => (
                          <div key={i} className="relative">
                            <div className="absolute -left-[30px] top-1.5 w-3 h-3 bg-white border-2 border-[#2C3545] rounded-full" />
                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-baseline mb-1 gap-1">
                              <h4 className="font-bold text-gray-900" style={{ fontSize: bodyPx }}>{edu.degree}</h4>
                              <span className="text-gray-600 font-medium" style={{ fontSize: `calc(${bodyPx} - 1px)` }}>
                                {edu.startDate} – {edu.endDate}
                              </span>
                            </div>
                            <p className="font-bold text-[#2C3545] mb-0.5" style={{ fontSize: bodyPx }}>{edu.institution}</p>
                            <p className="text-gray-700" style={{ fontSize: bodyPx }}>{edu.field}</p>
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
          // ── ATS template ─────────────────────────────────────────────────
          <div ref={cvRef}
            className="bg-white text-black mx-auto w-full max-w-[210mm]"
            style={{ minHeight: "297mm", padding: `${marginVpx} ${marginHpx}`, fontFamily: fontCss, fontSize: bodyPx, lineHeight: lineH, wordSpacing: wordSp }}
          >
            <header className="text-center mb-4">
              <h1 className="font-bold uppercase mb-1" style={{ fontSize: namePx, letterSpacing: "0.08em" }}>
                {profile.name}
              </h1>
              <p style={{ fontSize: `calc(${bodyPx} - 1px)` }}>
                {[profile.location, profile.phone, profile.email, cvData.linkedin].filter(Boolean).join("  |  ")}
              </p>
            </header>

            {cvData.summary && (
              <section className="mb-4">
                <h2 className="font-bold uppercase border-b border-black pb-0.5 mb-2" style={{ fontSize: sectionPx }}>Professional Summary</h2>
                <p className="text-justify whitespace-pre-wrap">{cvData.summary}</p>
              </section>
            )}

            {cvData.skills.length > 0 && (
              <section className="mb-4">
                <h2 className="font-bold uppercase border-b border-black pb-0.5 mb-2" style={{ fontSize: sectionPx }}>Core Skills</h2>
                <p>{cvData.skills.join(", ")}</p>
              </section>
            )}

            {cvData.experience.length > 0 && (
              <section className="mb-4">
                <h2 className="font-bold uppercase border-b border-black pb-0.5 mb-2" style={{ fontSize: sectionPx }}>Professional Experience</h2>
                <div className="space-y-4">
                  {cvData.experience.map((exp, i) => (
                    <div key={i}>
                      <div className="flex justify-between items-baseline">
                        <h3 className="font-bold">{exp.position}</h3>
                        <span>{exp.startDate}–{exp.current ? "Present" : exp.endDate}</span>
                      </div>
                      <p className="italic mb-1">{exp.company}{exp.location ? `, ${exp.location}` : ""}</p>
                      <ul className="list-disc list-outside ml-5">
                        {exp.description.split("\n").filter((l) => l.trim()).map((l, j) => (
                          <li key={j}>{l.replace(/^[•\-\*]\s*/, "")}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {cvData.education.length > 0 && (
              <section className="mb-4">
                <h2 className="font-bold uppercase border-b border-black pb-0.5 mb-2" style={{ fontSize: sectionPx }}>Education</h2>
                <div className="space-y-1">
                  {cvData.education.map((edu, i) => (
                    <div key={i} className="flex justify-between items-baseline">
                      <p><span className="font-bold">{edu.degree}</span> — {edu.institution}</p>
                      <span>{edu.startDate}–{edu.endDate}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {cvData.certifications?.length && (
              <section className="mb-4">
                <h2 className="font-bold uppercase border-b border-black pb-0.5 mb-2" style={{ fontSize: sectionPx }}>Certifications</h2>
                <ul className="list-disc list-outside ml-5">
                  {cvData.certifications.map((c, i) => <li key={i}>{c}</li>)}
                </ul>
              </section>
            )}

            {cvData.languages?.length && (
              <section className="mb-4">
                <h2 className="font-bold uppercase border-b border-black pb-0.5 mb-2" style={{ fontSize: sectionPx }}>Languages</h2>
                <p>{cvData.languages.join(", ")}</p>
              </section>
            )}

            {showUAEInfo && (cvData.dateOfBirth || cvData.nationality || profile.nationality ||
              cvData.visaStatus || profile.visaStatus || cvData.noticePeriod) && (
              <section className="mb-4">
                <h2 className="font-bold uppercase border-b border-black pb-0.5 mb-2" style={{ fontSize: sectionPx }}>Additional Information</h2>
                <ul className="list-disc list-inside">
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