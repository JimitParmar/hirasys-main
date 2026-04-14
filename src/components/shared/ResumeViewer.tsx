"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Image from "next/image";
import {
  FileText,
  Download,
  ExternalLink,
  Eye,
  Code,
  Briefcase,
  GraduationCap,
  Wrench,
  Mail,
  Phone,
  MapPin,
  Globe,

  Award,
  FolderOpen,
  CheckCircle,
  XCircle,
  ChevronDown,
  Maximize2,
  Minimize2,
  Printer,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ResumeViewerProps {
  resumeText?: string | null;
  resumeUrl?: string | null;
  resumeParsed?: any;
  resumeScore?: number;
}

export function ResumeViewer({
  resumeText,
  resumeUrl,
  resumeParsed,
  resumeScore,
}: ResumeViewerProps) {
  const [viewMode, setViewMode] = useState<"document" | "analysis" | "raw" | "pdf">(
    resumeUrl ? "pdf" : "document"
  );
  const [fullscreen, setFullscreen] = useState(false);

  let parsed = resumeParsed;
  try {
    if (typeof parsed === "string") parsed = JSON.parse(parsed);
  } catch {
    parsed = null;
  }

  const hasUrl = !!resumeUrl;
  const hasText = !!resumeText && resumeText.length > 10;
  const hasParsed = !!parsed;
  const score = typeof resumeScore === "number" && resumeScore > 0 ? resumeScore : null;

  if (!hasUrl && !hasText) {
    return (
      <div className="text-center py-10 text-slate-400">
        <FileText className="w-12 h-12 mx-auto mb-3 text-slate-200" />
        <p className="text-sm font-medium">No resume available</p>
        <p className="text-xs mt-1">
          Candidate hasn&apos;t uploaded a resume yet
        </p>
      </div>
    );
  }

  const resumeContent = (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-0.5">
          {hasUrl && (
            <TabButton
              active={viewMode === "pdf"}
              onClick={() => setViewMode("pdf")}
              icon={<FileText className="w-3 h-3" />}
              label="PDF"
            />
          )}
          {hasText && (
            <TabButton
              active={viewMode === "document"}
              onClick={() => setViewMode("document")}
              icon={<Eye className="w-3 h-3" />}
              label="Document"
            />
          )}
          {hasParsed && (
            <TabButton
              active={viewMode === "analysis"}
              onClick={() => setViewMode("analysis")}
              icon={<Award className="w-3 h-3" />}
              label="AI Analysis"
            />
          )}
          {hasText && (
            <TabButton
              active={viewMode === "raw"}
              onClick={() => setViewMode("raw")}
              icon={<Code className="w-3 h-3" />}
              label="Raw"
            />
          )}
        </div>

        <div className="flex items-center gap-2">
          {score !== null && (
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                score >= 70
                  ? "bg-emerald-100 text-emerald-700"
                  : score >= 40
                    ? "bg-amber-100 text-amber-700"
                    : "bg-red-100 text-red-700"
              }`}
            >
              <div
                className={`w-2 h-2 rounded-full ${
                  score >= 70
                    ? "bg-emerald-500"
                    : score >= 40
                      ? "bg-amber-500"
                      : "bg-red-500"
                }`}
              />
              {Math.round(score)}% Match
            </div>
          )}

          {hasText && (
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-7"
              onClick={() => {
                const win = window.open("", "_blank");
                if (win) {
                  win.document.write(buildPrintableResume(resumeText!, parsed));
                }
              }}
            >
              <Printer className="w-3 h-3 mr-1" /> Print
            </Button>
          )}

          {hasUrl && (
            <a href={resumeUrl!} download>
              <Button variant="outline" size="sm" className="text-xs h-7">
                <Download className="w-3 h-3 mr-1" /> Download
              </Button>
            </a>
          )}

          <Button
            variant="outline"
            size="sm"
            className="text-xs h-7"
            onClick={() => setFullscreen(!fullscreen)}
          >
            {fullscreen ? (
              <Minimize2 className="w-3 h-3" />
            ) : (
              <Maximize2 className="w-3 h-3" />
            )}
          </Button>
        </div>
      </div>

      {/* PDF View */}
      {viewMode === "pdf" && hasUrl && (
        <div className="border rounded-lg overflow-hidden bg-slate-100">
          <iframe
            src={`${resumeUrl}#toolbar=1&navpanes=0&scrollbar=1`}
            className="w-full bg-white"
            style={{ height: fullscreen ? "80vh" : "600px" }}
            title="Resume PDF"
          />
        </div>
      )}

      {/* Document View — the pretty one */}
      {viewMode === "document" && hasText && (
        <DocumentView
          text={resumeText!}
          parsed={parsed}
          height={fullscreen ? "80vh" : "600px"}
        />
      )}

      {/* AI Analysis View */}
      {viewMode === "analysis" && hasParsed && (
        <AnalysisView parsed={parsed} score={score} />
      )}

      {/* Raw Text */}
      {viewMode === "raw" && hasText && (
        <div
          className="bg-slate-950 rounded-lg p-5 overflow-y-auto font-mono"
          style={{ maxHeight: fullscreen ? "80vh" : "600px" }}
        >
          <pre className="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">
            {resumeText}
          </pre>
        </div>
      )}
    </div>
  );

  if (fullscreen) {
    return (
      <Dialog open={fullscreen} onOpenChange={setFullscreen}>
        <DialogContent className="max-w-5xl max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#0245EF]" />
              Resume
            </DialogTitle>
          </DialogHeader>
          {resumeContent}
        </DialogContent>
      </Dialog>
    );
  }

  return resumeContent;
}

// ==========================================
// TAB BUTTON
// ==========================================

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
        active
          ? "bg-white shadow-sm text-slate-800"
          : "text-slate-500 hover:text-slate-700"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

// ==========================================
// DOCUMENT VIEW — looks like a real resume
// ==========================================

function DocumentView({
  text,
  parsed,
  height,
}: {
  text: string;
  parsed: any;
  height: string;
}) {
  const sections = parseIntoSections(text);
  const contactInfo = extractContactInfo(text);

  return (
    <div
      className="overflow-y-auto"
      style={{ maxHeight: height }}
    >
      {/* Paper effect */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm mx-auto max-w-[800px]">
        {/* Header — candidate name + contact */}
        <div className="px-8 pt-8 pb-4 border-b-2 border-slate-800">
          {/* Try to find name from first line */}
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            {extractName(text, parsed)}
          </h1>

          {/* Contact row */}
          {contactInfo.length > 0 && (
            <div className="flex items-center gap-4 mt-2 flex-wrap">
              {contactInfo.map((info, i) => (
                <span
                  key={i}
                  className="flex items-center gap-1 text-xs text-slate-500"
                >
                  {info.icon}
                  {info.url ? (
                    <a
                      href={info.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#0245EF] hover:underline"
                    >
                      {info.text}
                    </a>
                  ) : (
                    info.text
                  )}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Body */}
        <div className="px-8 py-6 space-y-5">
          {sections.length > 0 ? (
            sections.map((section, i) => (
              <div key={i}>
                {/* Section header */}
                <div className="flex items-center gap-2 mb-2 pb-1 border-b border-slate-200">
                  <SectionIcon type={section.type} />
                  <h2 className="text-sm font-bold text-slate-800 uppercase tracking-widest">
                    {section.title}
                  </h2>
                </div>

                {/* Section content */}
                <div className="space-y-1.5 pl-0.5">
                  {section.items.map((item, j) => (
                    <ResumeItem key={j} item={item} />
                  ))}
                </div>
              </div>
            ))
          ) : (
            // Fallback: smart line-by-line rendering
            <SmartTextRenderer text={text} />
          )}
        </div>
      </div>
    </div>
  );
}

// ==========================================
// RESUME LINE ITEM
// ==========================================

interface LineItem {
  type: "heading" | "subheading" | "bullet" | "text" | "skills" | "date-title" | "blank";
  text: string;
  secondary?: string;
}

function ResumeItem({ item }: { item: LineItem }) {
  switch (item.type) {
    case "heading":
      return (
        <p className="text-[13px] font-semibold text-slate-800 pt-1">
          {item.text}
          {item.secondary && (
            <span className="text-[#0245EF] font-normal ml-2 text-xs">
              {item.secondary}
            </span>
          )}
        </p>
      );

    case "subheading":
      return (
        <p className="text-xs text-slate-500 italic">
          {item.text}
        </p>
      );

    case "date-title":
      return (
        <div className="flex items-center justify-between pt-1.5">
          <p className="text-[13px] font-semibold text-slate-800">
            {item.text}
          </p>
          {item.secondary && (
            <span className="text-xs text-slate-400 font-mono shrink-0">
              {item.secondary}
            </span>
          )}
        </div>
      );

    case "bullet":
      return (
        <div className="flex items-start gap-2 text-xs text-slate-600 leading-relaxed">
          <span className="text-slate-400 mt-0.5 shrink-0 select-none">
            ▸
          </span>
          <span>{highlightTechTerms(item.text)}</span>
        </div>
      );

    case "skills":
      return (
        <div className="flex flex-wrap gap-1.5 py-1">
          {item.text.split(/[,;|•·]/).map((skill, i) => {
            const trimmed = skill.trim();
            if (!trimmed) return null;
            return (
              <span
                key={i}
                className="px-2 py-0.5 bg-slate-100 text-slate-700 text-[11px] rounded-md font-medium"
              >
                {trimmed}
              </span>
            );
          })}
        </div>
      );

    case "blank":
      return <div className="h-1" />;

    default:
      return (
        <p className="text-xs text-slate-600 leading-relaxed">
          {item.text}
        </p>
      );
  }
}

// ==========================================
// ANALYSIS VIEW — AI insights
// ==========================================

function AnalysisView({
  parsed,
  score,
}: {
  parsed: any;
  score: number | null;
}) {
  return (
    <div className="bg-white border rounded-lg overflow-hidden">
      {/* Score header */}
      {score !== null && (
        <div
          className={`p-5 ${
            score >= 70
              ? "bg-gradient-to-r from-emerald-50 to-emerald-100/50"
              : score >= 40
                ? "bg-gradient-to-r from-amber-50 to-amber-100/50"
                : "bg-gradient-to-r from-red-50 to-red-100/50"
          }`}
        >
          <div className="flex items-center gap-4">
            <div className="relative w-16 h-16">
              <svg className="w-16 h-16 -rotate-90">
                <circle
                  cx="32"
                  cy="32"
                  r="28"
                  stroke="#E2E8F0"
                  strokeWidth="3"
                  fill="none"
                />
                <circle
                  cx="32"
                  cy="32"
                  r="28"
                  stroke={
                    score >= 70
                      ? "#10B981"
                      : score >= 40
                        ? "#F59E0B"
                        : "#EF4444"
                  }
                  strokeWidth="3"
                  fill="none"
                  strokeDasharray={`${(score / 100) * 176} 176`}
                  strokeLinecap="round"
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-lg font-bold text-slate-700">
                {Math.round(score)}
              </span>
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-700">
                Resume Match Score
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                {score >= 70
                  ? "Strong match for this position"
                  : score >= 40
                    ? "Partial match — some gaps identified"
                    : "Low match — significant gaps"}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="p-5 space-y-5">
        {/* Summary */}
        {parsed.summary && (
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
              Summary
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed bg-slate-50 rounded-lg p-3">
              {parsed.summary}
            </p>
          </div>
        )}

        {/* Skills Match */}
        {(parsed.matchedSkills?.length > 0 ||
          parsed.missingSkills?.length > 0) && (
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
              Skills Analysis
            </h3>
            <div className="space-y-2">
              {parsed.matchedSkills?.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {parsed.matchedSkills.map((s: string) => (
                    <Badge
                      key={s}
                      className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-medium"
                    >
                      <CheckCircle className="w-3 h-3 mr-0.5" />
                      {s}
                    </Badge>
                  ))}
                </div>
              )}
              {parsed.missingSkills?.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {parsed.missingSkills.map((s: string) => (
                    <Badge
                      key={s}
                      variant="outline"
                      className="text-red-500 border-red-200 text-[11px]"
                    >
                      <XCircle className="w-3 h-3 mr-0.5" />
                      {s}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Experience & Education */}
        <div className="grid grid-cols-2 gap-4">
          {parsed.experience && (
            <div className="bg-slate-50 rounded-lg p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                <h4 className="text-[10px] font-bold text-slate-400 uppercase">
                  Experience
                </h4>
              </div>
              <p className="text-xs text-slate-600">
                {parsed.experience}
              </p>
            </div>
          )}
          {parsed.education && (
            <div className="bg-slate-50 rounded-lg p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <GraduationCap className="w-3.5 h-3.5 text-slate-400" />
                <h4 className="text-[10px] font-bold text-slate-400 uppercase">
                  Education
                </h4>
              </div>
              <p className="text-xs text-slate-600">
                {parsed.education}
              </p>
            </div>
          )}
        </div>

        {/* Strengths & Concerns */}
        {(parsed.strengths?.length > 0 ||
          parsed.concerns?.length > 0) && (
          <div className="grid grid-cols-2 gap-4">
            {parsed.strengths?.length > 0 && (
              <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-100">
                <h4 className="text-[10px] font-bold text-emerald-600 uppercase mb-1.5">
                  💪 Strengths
                </h4>
                <ul className="space-y-1">
                  {parsed.strengths.map(
                    (s: string, i: number) => (
                      <li
                        key={i}
                        className="text-xs text-slate-600 flex items-start gap-1.5"
                      >
                        <span className="text-emerald-500 shrink-0">
                          ▸
                        </span>
                        {s}
                      </li>
                    )
                  )}
                </ul>
              </div>
            )}
            {parsed.concerns?.length > 0 && (
              <div className="bg-amber-50 rounded-lg p-3 border border-amber-100">
                <h4 className="text-[10px] font-bold text-amber-600 uppercase mb-1.5">
                  ⚠️ Gaps
                </h4>
                <ul className="space-y-1">
                  {parsed.concerns.map(
                    (c: string, i: number) => (
                      <li
                        key={i}
                        className="text-xs text-slate-600 flex items-start gap-1.5"
                      >
                        <span className="text-amber-500 shrink-0">
                          ▸
                        </span>
                        {c}
                      </li>
                    )
                  )}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ==========================================
// SMART TEXT RENDERER — when sections can't be parsed
// ==========================================

function SmartTextRenderer({ text }: { text: string }) {
  const lines = text.split("\n");

  return (
    <div className="space-y-0.5">
      {lines.map((line, i) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={i} className="h-2" />;

        const isHeader = isLikelyHeader(trimmed);
        const isBullet = /^[•\-\*▸–]\s/.test(trimmed) || /^\d+[\.\)]\s/.test(trimmed);
        const isDate = /\b(20\d{2}|19\d{2})\s*[-–]\s*(20\d{2}|19\d{2}|Present|Current)\b/i.test(trimmed);

        if (isHeader) {
          return (
            <div key={i} className="pt-4 pb-1 border-b border-slate-200 first:pt-0">
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-widest">
                {trimmed.replace(/:$/, "")}
              </h2>
            </div>
          );
        }

        if (isBullet) {
          const bulletText = trimmed.replace(/^[•\-\*▸–]\s*/, "").replace(/^\d+[\.\)]\s*/, "");
          return (
            <div key={i} className="flex items-start gap-2 text-xs text-slate-600 leading-relaxed pl-1">
              <span className="text-slate-400 mt-0.5 shrink-0">▸</span>
              <span>{highlightTechTerms(bulletText)}</span>
            </div>
          );
        }

        if (isDate && trimmed.length < 80) {
          return (
            <p key={i} className="text-[13px] font-medium text-slate-700 pt-2">
              {highlightDatesInline(trimmed)}
            </p>
          );
        }

        // Check if short + bold-looking (role title, company name)
        if (trimmed.length < 60 && !trimmed.includes(".") && i > 0) {
          const prevLine = lines[i - 1]?.trim() || "";
          if (!prevLine || isLikelyHeader(prevLine)) {
            return (
              <p key={i} className="text-[13px] font-semibold text-slate-800 pt-1">
                {trimmed}
              </p>
            );
          }
        }

        return (
          <p key={i} className="text-xs text-slate-600 leading-relaxed">
            {trimmed}
          </p>
        );
      })}
    </div>
  );
}

// ==========================================
// SECTION ICON
// ==========================================

function SectionIcon({ type }: { type: string }) {
  const icons: Record<string, React.ElementType> = {
    summary: FileText,
    experience: Briefcase,
    education: GraduationCap,
    skills: Wrench,
    projects: FolderOpen,
    certifications: Award,
    achievements: Award,
    contact: Mail,
    default: FileText,
  };

  const Icon = icons[type] || icons.default;
  return <Icon className="w-3.5 h-3.5 text-[#0245EF]" />;
}

// ==========================================
// HELPERS
// ==========================================

function extractName(text: string, parsed: any): string {
  if (parsed?.name) return parsed.name;

  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return "Candidate";

  // First non-empty line that's not a section header and not too long
  for (const line of lines.slice(0, 5)) {
    if (
      line.length > 3 &&
      line.length < 50 &&
      !isLikelyHeader(line) &&
      !line.includes("@") &&
      !/^\d/.test(line) &&
      !/^(http|www)/i.test(line)
    ) {
      return line;
    }
  }

  return lines[0]?.substring(0, 40) || "Candidate";
}

interface ContactItem {
  icon: React.ReactNode;
  text: string;
  url?: string;
}

function extractContactInfo(text: string): ContactItem[] {
  const items: ContactItem[] = [];
  const lines = text.substring(0, 1000);

  const email = lines.match(/[\w.-]+@[\w.-]+\.\w+/);
  if (email) {
    items.push({
      icon: <Mail className="w-3 h-3" />,
      text: email[0],
      url: `mailto:${email[0]}`,
    });
  }

  const phone = lines.match(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
  if (phone) {
    items.push({
      icon: <Phone className="w-3 h-3" />,
      text: phone[0],
    });
  }

  const linkedin = lines.match(/linkedin\.com\/in\/[\w-]+/i);
  if (linkedin) {
    items.push({
      icon: <Image src='linkedin.svg' alt='linkedin' className="w-3 h-3" />,
      text: linkedin[0].replace("linkedin.com/in/", ""),
      url: `https://${linkedin[0]}`,
    });
  }

  const github = lines.match(/github\.com\/[\w-]+/i);
  if (github) {
    items.push({
      icon: <Image src='github.svg' alt='github' className="w-3 h-3" />,
      text: github[0].replace("github.com/", ""),
      url: `https://${github[0]}`,
    });
  }

  const location = lines.match(/(?:^|\n)\s*([A-Z][a-z]+(?:\s[A-Z][a-z]+)*,\s*[A-Z]{2})\s*(?:\n|$)/m);
  if (location) {
    items.push({
      icon: <MapPin className="w-3 h-3" />,
      text: location[1],
    });
  }

  const website = lines.match(/(?:https?:\/\/)?(?:www\.)?[\w-]+\.[\w.]+(?!.*(?:linkedin|github))/i);
  if (website && !website[0].includes("@")) {
    items.push({
      icon: <Globe className="w-3 h-3" />,
      text: website[0],
      url: website[0].startsWith("http") ? website[0] : `https://${website[0]}`,
    });
  }

  return items;
}

interface ParsedSection {
  title: string;
  type: string;
  items: LineItem[];
}

function parseIntoSections(text: string): ParsedSection[] {
  const lines = text.split("\n");
  const sections: ParsedSection[] = [];
  let current: ParsedSection | null = null;

  const sectionMap: Record<string, string> = {
    summary: "summary",
    objective: "summary",
    profile: "summary",
    about: "summary",
    experience: "experience",
    "work experience": "experience",
    employment: "experience",
    "work history": "experience",
    "professional experience": "experience",
    education: "education",
    academic: "education",
    qualifications: "education",
    skills: "skills",
    "technical skills": "skills",
    technologies: "skills",
    "tech stack": "skills",
    "core competencies": "skills",
    projects: "projects",
    "personal projects": "projects",
    "key projects": "projects",
    certifications: "certifications",
    certificates: "certifications",
    achievements: "achievements",
    awards: "achievements",
    honors: "achievements",
    publications: "achievements",
    contact: "contact",
    references: "contact",
  };

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (!trimmed) {
      current?.items.push({ type: "blank", text: "" });
      continue;
    }

    if (isLikelyHeader(trimmed)) {
      const headerLower = trimmed.toLowerCase().replace(/[^a-z\s]/g, "").trim();
      const sectionType = Object.entries(sectionMap).find(([key]) =>
        headerLower.includes(key)
      )?.[1] || "default";

      if (current && current.items.length > 0) {
        sections.push(current);
      }

      current = {
        title: trimmed.replace(/:$/, ""),
        type: sectionType,
        items: [],
      };
      continue;
    }

    if (!current) {
      // Lines before first section — skip contact info (already extracted)
      continue;
    }

    // Parse line type
    const isBullet = /^[•\-\*▸–]\s/.test(trimmed) || /^\d+[\.\)]\s/.test(trimmed);
    const dateMatch = trimmed.match(
      /(.+?)\s*[|–-]\s*((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4}\s*[-–]\s*(?:(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4}|Present|Current))/i
    ) || trimmed.match(
      /(.+?)\s*[|–-]\s*(\d{4}\s*[-–]\s*(?:\d{4}|Present|Current))/i
    );

    if (current.type === "skills" && !isBullet) {
      current.items.push({ type: "skills", text: trimmed });
    } else if (isBullet) {
      const bulletText = trimmed.replace(/^[•\-\*▸–]\s*/, "").replace(/^\d+[\.\)]\s*/, "");
      current.items.push({ type: "bullet", text: bulletText });
    } else if (dateMatch) {
      current.items.push({
        type: "date-title",
        text: dateMatch[1].trim(),
        secondary: dateMatch[2].trim(),
      });
    } else if (trimmed.length < 60 && !trimmed.includes(".")) {
      current.items.push({ type: "heading", text: trimmed });
    } else {
      current.items.push({ type: "text", text: trimmed });
    }
  }

  if (current && current.items.length > 0) {
    sections.push(current);
  }

  return sections;
}

function isLikelyHeader(line: string): boolean {
  const trimmed = line.trim();
  if (trimmed.length < 3 || trimmed.length > 60) return false;
  if (trimmed.endsWith(":")) return true;
  if (trimmed === trimmed.toUpperCase() && /^[A-Z\s&/]+$/.test(trimmed)) return true;

  const headerWords = [
    "experience", "education", "skills", "projects", "summary",
    "objective", "certifications", "achievements", "awards",
    "publications", "references", "contact", "profile",
    "qualifications", "competencies", "technologies",
    "employment", "work history", "technical", "professional",
  ];

  return headerWords.some(
    (w) => trimmed.toLowerCase().replace(/[^a-z\s]/g, "").trim().includes(w)
  );
}

function highlightTechTerms(text: string): React.ReactNode {
  const terms =
    /\b(React|TypeScript|JavaScript|Python|Java|C\+\+|Node\.js|Next\.js|AWS|Azure|GCP|Docker|Kubernetes|SQL|PostgreSQL|MongoDB|Redis|GraphQL|REST|API|CI\/CD|Git|Agile|Scrum|TDD|Microservices|Serverless|Machine Learning|AI|Deep Learning|TensorFlow|PyTorch|Pandas|NumPy|Figma|Sketch|Tailwind|Vue|Angular|Spring|Django|Flask|Express|Go|Rust|Swift|Kotlin)\b/g;

  const parts = text.split(terms);
  return parts.map((part, i) => {
    if (terms.test(part)) {
      terms.lastIndex = 0;
      return (
        <span key={i} className="font-semibold text-slate-800">
          {part}
        </span>
      );
    }
    terms.lastIndex = 0;
    return part;
  });
}

function highlightDatesInline(text: string): React.ReactNode {
  const datePattern =
    /(\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4}\b|\b20\d{2}\b|\b19\d{2}\b|\bPresent\b|\bCurrent\b)/gi;

  const parts = text.split(datePattern);
  return parts.map((part, i) => {
    if (datePattern.test(part)) {
      datePattern.lastIndex = 0;
      return (
        <span key={i} className="text-[#0245EF] font-medium">
          {part}
        </span>
      );
    }
    datePattern.lastIndex = 0;
    return part;
  });
}

function buildPrintableResume(text: string, parsed: any): string {
  const name = extractName(text, parsed);
  return `
    <html>
    <head>
      <title>Resume — ${name}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Georgia', 'Times New Roman', serif; max-width: 800px; margin: 0 auto; padding: 40px; color: #1e293b; line-height: 1.5; }
        h1 { font-size: 24px; border-bottom: 2px solid #1e293b; padding-bottom: 8px; margin-bottom: 4px; }
        h2 { font-size: 13px; text-transform: uppercase; letter-spacing: 2px; color: #0245EF; border-bottom: 1px solid #e2e8f0; padding: 16px 0 4px; margin-bottom: 8px; }
        .contact { font-size: 12px; color: #64748b; margin-bottom: 16px; }
        .item-title { font-size: 13px; font-weight: bold; margin-top: 8px; }
        .item-date { font-size: 12px; color: #64748b; float: right; }
        .bullet { font-size: 12px; padding-left: 16px; position: relative; margin: 2px 0; }
        .bullet::before { content: "▸"; position: absolute; left: 0; color: #94a3b8; }
        p { font-size: 12px; margin: 2px 0; }
        .skills { display: flex; flex-wrap: wrap; gap: 6px; }
        .skill { background: #f1f5f9; padding: 2px 8px; border-radius: 4px; font-size: 11px; }
        @media print { body { padding: 20px; } }
      </style>
    </head>
    <body>
      <h1>${name}</h1>
      <pre style="font-family: inherit; white-space: pre-wrap; font-size: 12px; line-height: 1.6;">${text}</pre>
      <script>window.print();</script>
    </body>
    </html>
  `;
}