"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Share2, Globe, Copy, CheckCircle,
  ExternalLink, Code,
} from "lucide-react";


import linkedinIcon  from "@/assets/linkedin.svg";
import twitterIcon  from "@/assets/twitter.svg";
import toast from "react-hot-toast";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jobId: string;
  jobTitle: string;
}

export function ShareJobDialog({ open, onOpenChange, jobId, jobTitle }: Props) {
  const [links, setLinks] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [showEmbed, setShowEmbed] = useState(false);

  const generateLinks = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/jobs/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId,
          platforms: ["linkedin", "twitter", "indeed", "wellfound", "naukri"],
        }),
      });
      const data = await res.json();
      setLinks(data);
    } catch {
      toast.error("Failed to generate links");
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    if (open && !links) generateLinks();
  }, [open]);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    toast.success(`${label} copied!`);
    setTimeout(() => setCopied(null), 2000);
  };

  const platforms = [
    { id: "linkedin", label: "LinkedIn", icon: <Image src="linkedin.svg" alt="LinkedIn" />, color: "bg-blue-600" },
    { id: "twitter", label: "Twitter/X", icon: <Image src="x.svg" alt="Twitter/X" />, color: "bg-black" },
    { id: "indeed", label: "Indeed", icon: Globe, color: "bg-blue-700" },
    { id: "naukri", label: "Naukri", icon: Globe, color: "bg-blue-500" },
    { id: "wellfound", label: "Wellfound", icon: Globe, color: "bg-black" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="w-5 h-5 text-[#0245EF]" />
            Share Job Posting
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <p className="text-sm text-slate-500">
            Share <strong>{jobTitle}</strong> on job portals and social media.
          </p>

          {/* Direct Apply Link */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Direct Apply Link</Label>
            <div className="flex gap-2">
              <Input
                readOnly
                value={links?.directUrl || `${window.location.origin}/jobs/${jobId}`}
                className="h-9 text-sm font-mono bg-slate-50"
              />
              <Button
                variant="outline"
                size="sm"
                className="shrink-0 h-9"
                onClick={() => copyToClipboard(
                  links?.directUrl || `${window.location.origin}/jobs/${jobId}`,
                  "Link"
                )}
              >
                {copied === "Link" ? <CheckCircle className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
            <p className="text-[10px] text-slate-400">
              Paste this anywhere. Candidates land directly on your job page with one-click apply.
            </p>
          </div>

          {/* Platform buttons */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Share on Platforms</Label>
            <div className="grid grid-cols-2 gap-2">
              {platforms.map((p) => {
                const Icon = p.icon;
                const link = links?.links?.[p.id];
                const note = links?.links?.[`${p.id}_note`];

                return (
                  <button
                    key={p.id}
                    onClick={() => {
                      if (link && !note) {
                        window.open(link, "_blank");
                      } else {
                        toast(note || `Copy your job link and paste on ${p.label}`, {
                          icon: "📋",
                          duration: 4000,
                        });
                      }
                    }}
                    className="flex items-center gap-2 p-3 rounded-lg border border-slate-200 hover:border-[#0245EF] hover:bg-[#EBF0FF] transition-colors text-left"
                  >
                    <div className={`w-8 h-8 rounded ${p.color} flex items-center justify-center`}>
                      
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-700">{p.label}</p>
                      <p className="text-[10px] text-slate-400">
                        {link && !note ? "Click to share" : "Copy & paste"}
                      </p>
                    </div>
                    <ExternalLink className="w-3 h-3 text-slate-300 ml-auto" />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Embed Code */}
          <div className="space-y-2">
            <button
              onClick={() => setShowEmbed(!showEmbed)}
              className="text-sm text-[#0245EF] hover:underline flex items-center gap-1"
            >
              <Code className="w-3 h-3" />
              {showEmbed ? "Hide" : "Show"} embed code
            </button>
            {showEmbed && links?.embedCode && (
              <div className="relative">
                <pre className="text-xs bg-slate-900 text-slate-300 p-3 rounded-lg overflow-x-auto">
                  {links.embedCode}
                </pre>
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute top-2 right-2 h-6 text-[10px] text-slate-400"
                  onClick={() => copyToClipboard(links.embedCode, "Embed code")}
                >
                  {copied === "Embed code" ? "Copied!" : "Copy"}
                </Button>
              </div>
            )}
          </div>

          <div className="bg-[#EBF0FF] rounded-lg p-3 text-xs text-[#02298F]">
            💡 <strong>Tip:</strong> When candidates apply through any platform, they land on Hirasys where your pipeline automatically screens, tests, and interviews them.
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}