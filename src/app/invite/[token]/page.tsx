"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Logo } from "@/components/shared/Logo";
import { Loader2, ArrowRight, CheckCircle, XCircle } from "lucide-react";
import toast from "react-hot-toast";

export default function InvitePage() {
  const { token } = useParams();
  const router = useRouter();
  const [invitation, setInvitation] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    validateToken();
  }, [token]);

  const validateToken = async () => {
    try {
      const res = await fetch(`/api/invite/validate?token=${token}`);
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setInvitation(data.invitation);
      }
    } catch {
      setError("Failed to validate invitation");
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/invite/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          firstName,
          lastName,
          password,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success("Account created! Redirecting to login...");
      setTimeout(() => router.push("/login"), 2000);
    } catch (err: any) {
      toast.error(err.message || "Failed to accept invitation");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#0245EF]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-slate-800 mb-2">Invalid Invitation</h2>
            <p className="text-slate-500">{error}</p>
            <Button onClick={() => router.push("/login")} className="mt-6">Go to Login</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <Logo size="lg" showText={true} asLink={false} />
        </div>

        <Card className="shadow-xl border-0">
          <CardContent className="p-6">
            <div className="text-center mb-6">
              <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto mb-3" />
              <h2 className="text-xl font-semibold text-slate-800">You&apos;re Invited!</h2>
              <p className="text-sm text-slate-500 mt-1">
                Join as <strong className="text-[#0245EF]">{invitation?.role}</strong> at{" "}
                <strong>{invitation?.company_name || "the team"}</strong>
              </p>
            </div>

            <form onSubmit={handleAccept} className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm">Email</Label>
                <Input value={invitation?.email || ""} disabled className="h-10 bg-slate-50" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-sm">First Name</Label>
                  <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} required className="h-10" />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">Last Name</Label>
                  <Input value={lastName} onChange={(e) => setLastName(e.target.value)} required className="h-10" />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm">Password</Label>
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                  required minLength={8} className="h-10" placeholder="Min 8 characters" />
              </div>

              <Button type="submit" className="w-full h-11 bg-[#0245EF] hover:bg-[#0237BF]" disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ArrowRight className="w-4 h-4 mr-2" />}
                Join Team
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}