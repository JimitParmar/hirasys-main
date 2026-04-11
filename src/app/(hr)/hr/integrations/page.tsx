"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  ArrowLeft, Loader2, Save, Globe, Trash2,
  CheckCircle, XCircle, ExternalLink, Webhook,
} from "lucide-react";
import toast from "react-hot-toast";
import Link from "next/link";

const PLATFORMS = [
  {
    id: "linkedin",
    name: "LinkedIn",
    icon: <Image src="linkedin.svg" width={24} height={24} alt="LinkedIn" />,
    color: "bg-blue-600",
    description: "Post jobs directly to LinkedIn Jobs",
    fields: [
      { key: "accessToken", label: "Access Token", type: "password", help: "Get from LinkedIn Developer Portal → OAuth 2.0" },
      { key: "companyId", label: "Company/Organization ID", type: "text", help: "Found in your LinkedIn company page URL", isConfig: true },
    ],
    docsUrl: "https://learn.microsoft.com/en-us/linkedin/talent/job-postings",
  },
  {
    id: "indeed",
    name: "Indeed",
    icon: Globe,
    color: "bg-blue-700",
    description: "Post sponsored jobs on Indeed",
    fields: [
      { key: "apiKey", label: "API Key", type: "password", help: "Get from Indeed Employer Dashboard" },
      { key: "employerId", label: "Employer ID", type: "text", help: "Your Indeed employer account ID", isConfig: true },
    ],
    docsUrl: "https://developer.indeed.com",
  },
  {
    id: "naukri",
    name: "Naukri",
    icon: Globe,
    color: "bg-blue-500",
    description: "Post jobs on Naukri.com (India)",
    fields: [
      { key: "apiKey", label: "API Key", type: "password", help: "Get from Naukri Partner Portal" },
      { key: "partnerId", label: "Partner ID", type: "text", help: "Your Naukri partner ID", isConfig: true },
    ],
    docsUrl: "https://www.naukri.com/employers",
  },
  {
    id: "custom_webhook",
    name: "Custom Webhook",
    icon: Webhook,
    color: "bg-slate-700",
    description: "Send job data to any URL (Zapier, Make, custom API)",
    fields: [
      { key: "apiKey", label: "Auth Token (optional)", type: "password", help: "Sent as Bearer token in Authorization header" },
      { key: "webhookUrl", label: "Webhook URL", type: "url", help: "POST request will be sent here when job is published", isConfig: true },
    ],
    docsUrl: null,
  },
];

export default function IntegrationsPage() {
  const { isHR, isLoading: authLoading } = useAuth();
  const [integrations, setIntegrations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [formData, setFormData] = useState<Record<string, Record<string, string>>>({});

  useEffect(() => { if (isHR) fetchIntegrations(); }, [isHR]);

  const fetchIntegrations = async () => {
    try {
      const res = await fetch("/api/integrations");
      const data = await res.json();
      setIntegrations(data.integrations || []);
    } catch {} finally { setLoading(false); }
  };

  const getIntegration = (platform: string) =>
    integrations.find((i) => i.platform === platform);

  const updateFormField = (platform: string, field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [platform]: { ...(prev[platform] || {}), [field]: value },
    }));
  };

  const saveIntegration = async (platformId: string) => {
    const platform = PLATFORMS.find((p) => p.id === platformId);
    if (!platform) return;

    setSaving(platformId);
    try {
      const data = formData[platformId] || {};
      const config: Record<string, string> = {};
      let apiKey = undefined;
      let accessToken = undefined;

      for (const field of platform.fields) {
        const value = data[field.key];
        if (!value) continue;
        if (field.key === "apiKey") apiKey = value;
        else if (field.key === "accessToken") accessToken = value;
        else if (field.isConfig) config[field.key] = value;
      }

      const res = await fetch("/api/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform: platformId,
          apiKey,
          accessToken,
          config: Object.keys(config).length > 0 ? config : undefined,
        }),
      });

      if (!res.ok) throw new Error("Failed to save");
      toast.success(`${platform.name} integration saved!`);
      fetchIntegrations();
    } catch (err: any) {
      toast.error(err.message || "Failed to save");
    } finally {
      setSaving(null);
    }
  };

  const removeIntegration = async (platformId: string) => {
    try {
      await fetch("/api/integrations", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform: platformId }),
      });
      toast.success("Integration removed");
      fetchIntegrations();
    } catch {
      toast.error("Failed to remove");
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#0245EF]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-200 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto h-12 flex items-center gap-3">
          <Link href="/hr/dashboard">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <span className="text-sm font-semibold text-slate-800">Job Portal Integrations</span>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Integrations</h1>
          <p className="text-slate-500 mt-1">
            Connect job portals to auto-publish your jobs. Candidates from all platforms land on Hirasys for screening.
          </p>
        </div>

        {PLATFORMS.map((platform) => {
          const existing = getIntegration(platform.id);
          const Icon = platform.icon;
          const isSaving = saving === platform.id;

          return (
            <Card key={platform.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 ${platform.color} rounded-lg flex items-center justify-center`}>
                     
                    </div>
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        {platform.name}
                        {existing ? (
                          <Badge className="bg-emerald-100 text-emerald-700 text-[10px]">
                            <CheckCircle className="w-3 h-3 mr-0.5" /> Connected
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] text-slate-400">
                            Not connected
                          </Badge>
                        )}
                      </CardTitle>
                      <CardDescription className="text-xs">{platform.description}</CardDescription>
                    </div>
                  </div>

                  {existing && (
                    <Button variant="ghost" size="sm" className="text-xs text-red-500 hover:text-red-600 hover:bg-red-50"
                      onClick={() => removeIntegration(platform.id)}>
                      <Trash2 className="w-3 h-3 mr-1" /> Remove
                    </Button>
                  )}
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {platform.fields.map((field) => (
                  <div key={field.key} className="space-y-1.5">
                    <Label className="text-sm">{field.label}</Label>
                    <Input
                      type={field.type === "password" ? "password" : "text"}
                      value={formData[platform.id]?.[field.key] || ""}
                      onChange={(e) => updateFormField(platform.id, field.key, e.target.value)}
                      placeholder={existing ? "••••••••  (saved)" : `Enter ${field.label.toLowerCase()}`}
                      className="h-9"
                    />
                    <p className="text-[10px] text-slate-400">{field.help}</p>
                  </div>
                ))}

                <div className="flex items-center justify-between pt-2">
                  {platform.docsUrl && (
                    <a href={platform.docsUrl} target="_blank" rel="noopener noreferrer"
                      className="text-xs text-[#0245EF] hover:underline flex items-center gap-1">
                      <ExternalLink className="w-3 h-3" /> API Documentation
                    </a>
                  )}
                  <Button size="sm" onClick={() => saveIntegration(platform.id)} disabled={isSaving}
                    className="bg-[#0245EF] hover:bg-[#0237BF]">
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />}
                    {existing ? "Update" : "Connect"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}