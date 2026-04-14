"use client";

import React, { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Loader2,
  Lock,
  CheckCircle,
  AlertTriangle,
  Eye,
  EyeOff,
  ArrowRight,
} from "lucide-react";
import { Logo } from "@/components/shared/Logo";
import toast from "react-hot-toast";
import Link from "next/link";

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <Card className="max-w-md w-full shadow-xl border-0">
          <CardContent className="p-8 text-center space-y-4">
            <AlertTriangle className="w-14 h-14 text-amber-500 mx-auto" />
            <h2 className="text-xl font-semibold text-slate-800">
              Invalid Reset Link
            </h2>
            <p className="text-sm text-slate-500">
              This password reset link is invalid or has expired. Please
              request a new one.
            </p>
            <Link href="/login">
              <Button className="bg-[#0245EF] hover:bg-[#0237BF]">
                Back to Login
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords don't match");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Reset failed");
      }

      setSuccess(true);
      toast.success("Password reset successfully!");
    } catch (err: any) {
      toast.error(err.message || "Failed to reset password");
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <Card className="max-w-md w-full shadow-xl border-0">
          <CardContent className="p-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
              <CheckCircle className="w-8 h-8 text-emerald-600" />
            </div>
            <h2 className="text-xl font-semibold text-slate-800">
              Password Reset!
            </h2>
            <p className="text-sm text-slate-500">
              Your password has been successfully reset. You can now sign
              in with your new password.
            </p>
            <Button
              onClick={() => router.push("/login")}
              className="w-full bg-[#0245EF] hover:bg-[#0237BF]"
            >
              <ArrowRight className="w-4 h-4 mr-2" />
              Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Logo size="lg" showText={true} linkTo="/" />
        </div>

        <Card className="shadow-xl border-0">
          <CardContent className="p-8 space-y-6">
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-[#EBF0FF] flex items-center justify-center mx-auto mb-3">
                <Lock className="w-6 h-6 text-[#0245EF]" />
              </div>
              <h2 className="text-xl font-semibold text-slate-800">
                Set new password
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                Must be at least 8 characters long.
              </p>
            </div>

            <form onSubmit={handleReset} className="space-y-4">
              <div className="space-y-2">
                <Label
                  htmlFor="new-password"
                  className="text-sm font-medium"
                >
                  New Password
                </Label>
                <div className="relative">
                  <Input
                    id="new-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                    autoFocus
                    className="h-11 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                {/* Strength indicator */}
                {password.length > 0 && (
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex gap-1 flex-1">
                      {[1, 2, 3, 4].map((level) => {
                        let strength = 0;
                        if (password.length >= 8) strength++;
                        if (/[A-Z]/.test(password)) strength++;
                        if (/[0-9]/.test(password)) strength++;
                        if (/[^A-Za-z0-9]/.test(password)) strength++;

                        return (
                          <div
                            key={level}
                            className={`h-1.5 flex-1 rounded-full transition-all ${
                              level <= strength
                                ? strength <= 1
                                  ? "bg-red-400"
                                  : strength <= 2
                                    ? "bg-amber-400"
                                    : strength <= 3
                                      ? "bg-blue-400"
                                      : "bg-emerald-400"
                                : "bg-slate-200"
                            }`}
                          />
                        );
                      })}
                    </div>
                    <span className="text-[10px] text-slate-400">
                      {password.length < 8
                        ? "Too short"
                        : (() => {
                            let s = 0;
                            if (password.length >= 8) s++;
                            if (/[A-Z]/.test(password)) s++;
                            if (/[0-9]/.test(password)) s++;
                            if (/[^A-Za-z0-9]/.test(password)) s++;
                            return ["", "Weak", "Fair", "Good", "Strong"][
                              s
                            ];
                          })()}
                    </span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="confirm-password"
                  className="text-sm font-medium"
                >
                  Confirm Password
                </Label>
                <Input
                  id="confirm-password"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={8}
                  className={`h-11 ${
                    confirmPassword.length > 0
                      ? password === confirmPassword
                        ? "border-emerald-300 focus:ring-emerald-200"
                        : "border-red-300 focus:ring-red-200"
                      : ""
                  }`}
                />
                {confirmPassword.length > 0 &&
                  password !== confirmPassword && (
                    <p className="text-xs text-red-500">
                      Passwords don&apos;t match
                    </p>
                  )}
              </div>

              <Button
                type="submit"
                className="w-full h-11 bg-[#0245EF] hover:bg-[#0237BF] text-base font-medium"
                disabled={
                  isLoading ||
                  password.length < 8 ||
                  password !== confirmPassword
                }
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Lock className="w-4 h-4 mr-2" />
                )}
                Reset Password
              </Button>
            </form>

            <div className="text-center">
              <Link
                href="/login"
                className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
              >
                Remember your password? Sign in
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <Loader2 className="w-8 h-8 animate-spin text-[#0245EF]" />
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}