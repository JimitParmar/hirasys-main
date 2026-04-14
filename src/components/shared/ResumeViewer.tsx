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
  User,
  Briefcase,
  GraduationCap,
  Wrench,
  Mail,
  Phone,
  MapPin,
  Globe,

  ChevronDown,
} from "lucide-react";

interface ResumeViewerProps {
  resumeText?: string | null;
  resumeUrl?: string | null;
  resumeParsed?: any;
  resumeScore?: number;
  compact?: boolean;
}

export function ResumeViewer({
  resumeText,
  resumeUrl,
  resumeParsed,
  resumeScore,
  compact = false,
}: ResumeViewerProps) {
  const [viewMode, setViewMode] = useState<"formatted" | "raw" | "pdf">(
    resumeUrl ? "pdf" : "formatted"
  );
  const [showFullText, setShowFullText] = useState(false);

  // Parse the resume data
  let parsed = resumeParsed;
  try {
    if (typeof parsed === "string") parsed = JSON.parse(parsed);
  } catch {
    parsed = null;
  }

  // Try to extract sections from plain text
  const sections = resumeText
    ? parseResumeTextIntoSections(resumeText)
    : null;

  const hasUrl = !!resumeUrl;
  const hasText = !!resumeText && resumeText.length > 10;
  const hasParsed = !!parsed;

  if (!hasUrl && !hasText) {
    return (
      <div className="text-center py-6 text-slate-400">
        <FileText className="w-10 h-10 mx-auto mb-2 text-slate-200" />
        <p className="text-sm">No resume available</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* View mode toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-0.5">
          {hasUrl && (
            <button
              onClick={() => setViewMode("pdf")}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                viewMode === "pdf"
                  ? "bg-white shadow text-slate-800"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <FileText className="w-3 h-3 inline mr-1" />
              PDF
            </button>
          )}
          <button
            onClick={() => setViewMode("formatted")}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
              viewMode === "formatted"
                ? "bg-white shadow text-slate-800"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <Eye className="w-3 h-3 inline mr-1" />
            Formatted
          </button>
          <button
            onClick={() => setViewMode("raw")}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
              viewMode === "raw"
                ? "bg-white shadow text-slate-800"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <Code className="w-3 h-3 inline mr-1" />
            Raw Text
          </button>
        </div>

        {hasUrl && (
          <div className="flex items-center gap-2">
            <a
              href={resumeUrl!}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="outline" size="sm" className="text-xs h-7">
                <ExternalLink className="w-3 h-3 mr-1" /> Open
              </Button>
            </a>
            <a href={resumeUrl!} download>
              <Button variant="outline" size="sm" className="text-xs h-7">
                <Download className="w-3 h-3 mr-1" /> Download
              </Button>
            </a>
          </div>
        )}
      </div>

      {/* ==========================================
          PDF VIEW — iframe embed
          ========================================== */}
      {viewMode === "pdf" && hasUrl && (
        <div className="border rounded-lg overflow-hidden bg-white">
          <iframe
            src={`${resumeUrl}#toolbar=1&navpanes=0`}
            className="w-full h-[600px]"
            title="Resume PDF"
          />
        </div>
      )}

      {/* ==========================================
          FORMATTED VIEW — structured sections
          ========================================== */}
      {viewMode === "formatted" && (
        <div className="bg-white border rounded-lg overflow-hidden">
          {/* AI-parsed data at top */}
          {hasParsed && (
            <div className="p-4 space-y-4">
              {/* Score + Summary */}
              {(resumeScore || parsed.summary) && (
                <div className="flex items-start gap-4">
                  {resumeScore !== undefined &&
                    resumeScore > 0 && (
                      <div className="text-center shrink-0">
                        <div
                          className={`text-2xl font-bold ${
                            resumeScore >= 70
                              ? "text-emerald-600"
                              : resumeScore >= 40
                                ? "text-amber-600"
                                : "text-red-500"
                          }`}
                        >
                          {Math.round(resumeScore)}%
                        </div>
                        <p className="text-[10px] text-slate-400">
                          Match
                        </p>
                      </div>
                    )}
                  {parsed.summary && (
                    <p className="text-sm text-slate-600 leading-relaxed">
                      {parsed.summary}
                    </p>
                  )}
                </div>
              )}

              {/* Skills */}
              {(parsed.matchedSkills?.length > 0 ||
                parsed.missingSkills?.length > 0) && (
                <div>
                  <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                    <Wrench className="w-3 h-3" /> Skills
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {parsed.matchedSkills?.map(
                      (skill: string) => (
                        <Badge
                          key={skill}
                          className="bg-emerald-100 text-emerald-700 text-[11px]"
                        >
                          ✓ {skill}
                        </Badge>
                      )
                    )}
                    {parsed.missingSkills?.map(
                      (skill: string) => (
                        <Badge
                          key={skill}
                          variant="outline"
                          className="text-red-500 border-red-200 text-[11px]"
                        >
                          ✗ {skill}
                        </Badge>
                      )
                    )}
                  </div>
                </div>
              )}

              {/* Strengths / Concerns */}
              {(parsed.strengths?.length > 0 ||
                parsed.concerns?.length > 0) && (
                <div className="grid grid-cols-2 gap-3">
                  {parsed.strengths?.length > 0 && (
                    <div className="bg-emerald-50 rounded-lg p-3">
                      <h4 className="text-xs font-semibold text-emerald-700 mb-1">
                        💪 Strengths
                      </h4>
                      <ul className="space-y-0.5">
                        {parsed.strengths.map(
                          (s: string, i: number) => (
                            <li
                              key={i}
                              className="text-[11px] text-slate-600"
                            >
                              • {s}
                            </li>
                          )
                        )}
                      </ul>
                    </div>
                  )}
                  {parsed.concerns?.length > 0 && (
                    <div className="bg-amber-50 rounded-lg p-3">
                      <h4 className="text-xs font-semibold text-amber-700 mb-1">
                        ⚠️ Concerns
                      </h4>
                      <ul className="space-y-0.5">
                        {parsed.concerns.map(
                          (c: string, i: number) => (
                            <li
                              key={i}
                              className="text-[11px] text-slate-600"
                            >
                              • {c}
                            </li>
                          )
                        )}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* Experience / Education */}
              <div className="grid grid-cols-2 gap-3">
                {parsed.experience && (
                  <div className="flex items-start gap-2">
                    <Briefcase className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase">
                        Experience
                      </p>
                      <p className="text-xs text-slate-600">
                        {parsed.experience}
                      </p>
                    </div>
                  </div>
                )}
                {parsed.education && (
                  <div className="flex items-start gap-2">
                    <GraduationCap className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase">
                        Education
                      </p>
                      <p className="text-xs text-slate-600">
                        {parsed.education}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Parsed text sections */}
          {hasText && sections && (
            <div
              className={`${hasParsed ? "border-t" : ""} divide-y divide-slate-100`}
            >
              {sections.map((section, i) => (
                <ResumeSection
                  key={i}
                  title={section.title}
                  content={section.content}
                  icon={section.icon}
                />
              ))}
            </div>
          )}

          {/* Fallback: nicely formatted plain text */}
          {hasText && !sections?.length && (
            <div className={`p-4 ${hasParsed ? "border-t" : ""}`}>
              <FormattedResumeText
                text={resumeText!}
                expanded={showFullText}
              />
              {resumeText!.length > 1500 && (
                <button
                  onClick={() => setShowFullText(!showFullText)}
                  className="text-xs text-[#0245EF] hover:underline mt-2 flex items-center gap-1"
                >
                  <ChevronDown
                    className={`w-3 h-3 transition-transform ${showFullText ? "rotate-180" : ""}`}
                  />
                  {showFullText ? "Show less" : "Show full resume"}
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* ==========================================
          RAW TEXT VIEW
          ========================================== */}
      {viewMode === "raw" && hasText && (
        <div className="bg-slate-900 rounded-lg p-4 max-h-[500px] overflow-y-auto">
          <pre className="text-xs text-slate-300 whitespace-pre-wrap font-mono leading-relaxed">
            {resumeText}
          </pre>
        </div>
      )}

      {viewMode === "raw" && !hasText && (
        <div className="text-center py-6 text-slate-400">
          <p className="text-sm">No text extracted from resume</p>
        </div>
      )}
    </div>
  );
}

// ==========================================
// SECTION COMPONENT
// ==========================================

function ResumeSection({
  title,
  content,
  icon,
}: {
  title: string;
  content: string;
  icon?: string;
}) {
  const [expanded, setExpanded] = useState(true);

  const IconMap: Record<string, React.ElementType> = {
    user: User,
    briefcase: Briefcase,
    graduation: GraduationCap,
    wrench: Wrench,
    mail: Mail,
    globe: Globe,
    default: FileText,
  };

  const Icon = IconMap[icon || "default"] || FileText;

  return (
    <div>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-[#0245EF]" />
          <h3 className="text-sm font-semibold text-slate-700">
            {title}
          </h3>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-slate-400 transition-transform ${expanded ? "rotate-180" : ""}`}
        />
      </button>
      {expanded && (
        <div className="px-4 pb-3">
          <FormattedResumeText text={content} expanded={true} />
        </div>
      )}
    </div>
  );
}

// ==========================================
// FORMATTED TEXT — makes plain text look nice
// ==========================================

function FormattedResumeText({
  text,
  expanded,
}: {
  text: string;
  expanded: boolean;
}) {
  const displayText = expanded ? text : text.substring(0, 1500);
  const lines = displayText.split("\n");

  return (
    <div className="space-y-1">
      {lines.map((line, i) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={i} className="h-2" />;

        // Detect headers (ALL CAPS, or short lines with no periods)
        const isHeader =
          (trimmed === trimmed.toUpperCase() &&
            trimmed.length > 2 &&
            trimmed.length < 60 &&
            !trimmed.includes(".")) ||
          trimmed.endsWith(":") ||
          /^(EXPERIENCE|EDUCATION|SKILLS|PROJECTS|CERTIFICATIONS|SUMMARY|OBJECTIVE|WORK HISTORY|PROFESSIONAL|TECHNICAL|ACHIEVEMENTS|AWARDS|PUBLICATIONS|REFERENCES|CONTACT|PROFILE|ABOUT)/i.test(
            trimmed
          );

        // Detect bullet points
        const isBullet =
          trimmed.startsWith("•") ||
          trimmed.startsWith("-") ||
          trimmed.startsWith("*") ||
          trimmed.startsWith("–") ||
          /^\d+[\.\)]\s/.test(trimmed);

        // Detect dates (2020-2023, Jan 2020 - Present, etc.)
        const hasDate =
          /\b(20\d{2}|19\d{2})\b/.test(trimmed) &&
          trimmed.length < 100;

        // Detect email/phone/links
        const isContact =
          /[@]/.test(trimmed) ||
          /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/.test(trimmed) ||
          /https?:\/\//.test(trimmed) ||
          /linkedin|github/i.test(trimmed);

        if (isHeader) {
          return (
            <h4
              key={i}
              className="text-xs font-bold text-slate-800 uppercase tracking-wider pt-3 pb-1 border-b border-slate-100"
            >
              {trimmed.replace(/:$/, "")}
            </h4>
          );
        }

        if (isBullet) {
          const bulletText = trimmed.replace(
            /^[•\-\*–]\s*/,
            ""
          );
          return (
            <div
              key={i}
              className="flex items-start gap-2 text-xs text-slate-600 pl-2"
            >
              <span className="text-[#0245EF] mt-0.5 shrink-0">
                •
              </span>
              <span className="leading-relaxed">
                {highlightKeywords(bulletText)}
              </span>
            </div>
          );
        }

        if (isContact) {
          return (
            <p
              key={i}
              className="text-xs text-slate-500 flex items-center gap-1"
            >
              {trimmed.includes("@") && (
                <Mail className="w-3 h-3 shrink-0" />
              )}
              {/linkedin/i.test(trimmed) && (
                <Image src="/linkedin.svg" alt = 'Linkedin' className="w-3 h-3 shrink-0" />
              )}
              {/github/i.test(trimmed) && (
                <Image src="/github.svg" alt="github" className="w-3 h-3 shrink-0" />
              )}
              {/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/.test(trimmed) && (
                <Phone className="w-3 h-3 shrink-0" />
              )}
              <span>{trimmed}</span>
            </p>
          );
        }

        if (hasDate && !isBullet) {
          return (
            <p
              key={i}
              className="text-xs text-slate-700 font-medium pt-1"
            >
              {highlightDates(trimmed)}
            </p>
          );
        }

        // Regular text
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
// TEXT PARSING HELPERS
// ==========================================

interface ParsedSection {
  title: string;
  content: string;
  icon: string;
}

function parseResumeTextIntoSections(
  text: string
): ParsedSection[] | null {
  const sectionHeaders = [
    {
      patterns:
        /^(SUMMARY|OBJECTIVE|PROFILE|ABOUT ME|PROFESSIONAL SUMMARY)/im,
      title: "Summary",
      icon: "user",
    },
    {
      patterns:
        /^(EXPERIENCE|WORK EXPERIENCE|EMPLOYMENT|WORK HISTORY|PROFESSIONAL EXPERIENCE)/im,
      title: "Experience",
      icon: "briefcase",
    },
    {
      patterns:
        /^(EDUCATION|ACADEMIC|QUALIFICATIONS|DEGREES)/im,
      title: "Education",
      icon: "graduation",
    },
    {
      patterns:
        /^(SKILLS|TECHNICAL SKILLS|TECHNOLOGIES|TECH STACK|CORE COMPETENCIES)/im,
      title: "Skills",
      icon: "wrench",
    },
    {
      patterns:
        /^(PROJECTS|PERSONAL PROJECTS|KEY PROJECTS)/im,
      title: "Projects",
      icon: "briefcase",
    },
    {
      patterns:
        /^(CERTIFICATIONS|CERTIFICATES|LICENSES)/im,
      title: "Certifications",
      icon: "graduation",
    },
    {
      patterns:
        /^(ACHIEVEMENTS|AWARDS|HONORS|ACCOMPLISHMENTS)/im,
      title: "Achievements",
      icon: "default",
    },
    {
      patterns: /^(CONTACT|PERSONAL INFO|DETAILS)/im,
      title: "Contact",
      icon: "mail",
    },
  ];

  const lines = text.split("\n");
  const sections: ParsedSection[] = [];
  let currentSection: ParsedSection | null = null;
  let contentLines: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      contentLines.push("");
      continue;
    }

    // Check if this line is a section header
    let matched = false;
    for (const header of sectionHeaders) {
      if (header.patterns.test(trimmed)) {
        // Save previous section
        if (currentSection) {
          currentSection.content = contentLines.join("\n").trim();
          if (currentSection.content.length > 10) {
            sections.push(currentSection);
          }
        }

        currentSection = {
          title: header.title,
          content: "",
          icon: header.icon,
        };
        contentLines = [];
        matched = true;
        break;
      }
    }

    if (!matched) {
      contentLines.push(trimmed);
    }
  }

  // Save last section
  if (currentSection) {
    currentSection.content = contentLines.join("\n").trim();
    if (currentSection.content.length > 10) {
      sections.push(currentSection);
    }
  }

  // If no sections found, return null (will use plain text display)
  if (sections.length < 2) return null;

  return sections;
}

function highlightKeywords(text: string): React.ReactNode {
  // Bold commonly important keywords
  const keywords =
    /\b(React|TypeScript|JavaScript|Python|Node\.js|Next\.js|AWS|Docker|Kubernetes|SQL|PostgreSQL|MongoDB|GraphQL|REST|API|CI\/CD|Git|Agile|Scrum|Lead|Senior|Manager|Director|VP|CTO|CEO|Revenue|Growth|\d+%|\$[\d,]+[KMB]?)\b/gi;

  const parts = text.split(keywords);
  return parts.map((part, i) => {
    if (keywords.test(part)) {
      // Reset lastIndex since we're reusing the regex
      keywords.lastIndex = 0;
      return (
        <strong key={i} className="text-slate-800">
          {part}
        </strong>
      );
    }
    // Reset here too
    keywords.lastIndex = 0;
    return part;
  });
}

function highlightDates(text: string): React.ReactNode {
  const datePattern =
    /(\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]?\s+\d{4}\b|\b20\d{2}\b|\b19\d{2}\b|\bPresent\b|\bCurrent\b)/gi;

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