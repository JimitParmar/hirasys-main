"use client";

import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Upload,
  FileText,
  Loader2,
  CheckCircle,
  X,
  File,
  AlertCircle,
} from "lucide-react";
import toast from "react-hot-toast";

interface ResumeUploadProps {
  value: string;
  onChange: (text: string) => void;
  placeholder?: string;
}

export function ResumeUpload({
  value,
  onChange,
  placeholder,
}: ResumeUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileUploaded, setFileUploaded] = useState(false);
  const [mode, setMode] = useState<"upload" | "paste">("upload");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate
    const allowedTypes = [
      "application/pdf",
      "text/plain",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];

    if (!allowedTypes.includes(file.type)) {
      toast.error("Please upload a PDF, TXT, or DOC file");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("File too large. Max 10MB.");
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("resume", file);

      const res = await fetch("/api/upload/resume", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error);

      onChange(data.text);
      setFileName(file.name);
      setFileUploaded(true);

      // ✅ FIX: Do NOT switch to paste mode — stay on upload tab
      // setMode("paste");  ← REMOVED

      toast.success(
        `Resume uploaded! ${data.charCount || data.text?.length || 0} characters extracted.`
      );
    } catch (err: any) {
      toast.error(err.message || "Failed to upload");
    } finally {
      setUploading(false);
      // Reset input so same file can be uploaded again
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    const dt = new DataTransfer();
    dt.items.add(file);
    if (fileInputRef.current) {
      fileInputRef.current.files = dt.files;
      fileInputRef.current.dispatchEvent(
        new Event("change", { bubbles: true })
      );
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleRemove = () => {
    onChange("");
    setFileName(null);
    setFileUploaded(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Resume *</Label>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => setMode("upload")}
            className={`text-xs px-2 py-1 rounded-md transition-colors ${
              mode === "upload"
                ? "bg-[#D1DEFF] text-[#0237BF] font-medium"
                : "text-slate-400 hover:text-slate-600"
            }`}
          >
            Upload PDF
          </button>
          <button
            type="button"
            onClick={() => setMode("paste")}
            className={`text-xs px-2 py-1 rounded-md transition-colors ${
              mode === "paste"
                ? "bg-[#D1DEFF] text-[#0237BF] font-medium"
                : "text-slate-400 hover:text-slate-600"
            }`}
          >
            Paste Text
          </button>
        </div>
      </div>

      {/* ==========================================
          UPLOAD MODE
          ========================================== */}
      {mode === "upload" && (
        <>
          {fileUploaded && value ? (
            /* File uploaded successfully — show status */
            <div className="space-y-3">
              <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-emerald-500" />
                  <div>
                    <p className="text-sm font-medium text-emerald-700">
                      Resume uploaded
                    </p>
                    {fileName && (
                      <p className="text-xs text-emerald-500 flex items-center gap-1">
                        <File className="w-3 h-3" /> {fileName}
                      </p>
                    )}
                    <p className="text-[10px] text-emerald-400">
                      {value.length} characters extracted
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-slate-400"
                  onClick={handleRemove}
                >
                  <X className="w-3 h-3 mr-1" /> Remove
                </Button>
              </div>

              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="w-3 h-3 mr-1" /> Upload Different
                File
              </Button>

              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.txt,.doc,.docx"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>
          ) : (
            /* No file yet — show dropzone */
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center hover:border-[#7599FF] hover:bg-[#EBF0FF]/30 transition-all cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.txt,.doc,.docx"
                onChange={handleFileUpload}
                className="hidden"
              />

              {uploading ? (
                <div className="space-y-2">
                  <Loader2 className="w-8 h-8 text-[#0245EF] mx-auto animate-spin" />
                  <p className="text-sm text-[#0245EF] font-medium">
                    Parsing resume...
                  </p>
                  <p className="text-xs text-slate-400">
                    Extracting text from your file
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="w-12 h-12 bg-[#D1DEFF] rounded-xl mx-auto flex items-center justify-center">
                    <Upload className="w-6 h-6 text-[#0245EF]" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-700">
                      Upload your resume
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      PDF, TXT, DOC • Max 10MB
                    </p>
                    <p className="text-xs text-slate-400">
                      Drag & drop or click to browse
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ==========================================
          PASTE MODE
          ========================================== */}
      {mode === "paste" && (
        <div className="space-y-2">
          {fileUploaded && value && (
            <div className="flex items-center gap-2 mb-1">
              <Badge
                variant="outline"
                className="text-[10px] text-emerald-600 border-emerald-200"
              >
                <CheckCircle className="w-3 h-3 mr-0.5" />
                Parsed from {fileName || "PDF"}
              </Badge>
              <span className="text-[10px] text-slate-400">
                You can edit the text below
              </span>
            </div>
          )}

          <Textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={
              placeholder ||
              `Paste your resume here...\n\nExample:\nJohn Doe — Senior Developer\n5 years experience in React, TypeScript, Node.js\n\nExperience:\n- Built e-commerce platform at XYZ Corp\n- Led frontend team of 4 developers\n\nSkills: React, TypeScript, Next.js, Node.js, PostgreSQL`
            }
            rows={8}
            className="text-sm"
          />

          {value && (
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>{value.length} characters</span>
              {value.length < 100 && (
                <span className="text-amber-500 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> Add more
                  detail for better matching
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}