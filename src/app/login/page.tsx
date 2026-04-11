"use client";

import React, { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2, ArrowRight, User, Building2, Eye, EyeOff } from "lucide-react";
import { Logo } from "@/components/shared/Logo";
import toast from "react-hot-toast";

export default function LoginPage() {
  const { login, register } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Login
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Register
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regFirstName, setRegFirstName] = useState("");
  const [regLastName, setRegLastName] = useState("");
  const [regRole, setRegRole] = useState("CANDIDATE");
  const [regCompany, setRegCompany] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await login(loginEmail, loginPassword);
      toast.success("Welcome back!");
      window.location.href = "/";
    } catch (err: any) {
      toast.error(err.message || "Invalid credentials");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await register({
        email: regEmail,
        password: regPassword,
        firstName: regFirstName,
        lastName: regLastName,
        role: regRole,
        company: regCompany || undefined,
      });
      toast.success("Account created! 🎉");
      window.location.href = "/";
    } catch (err: any) {
      // Check if error has suggestion
      if (err.suggestion) {
        toast.error(err.message, { duration: 8000 });
      } else {
        toast.error(err.message || "Registration failed");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex max-h-screen ">
      {/* Left Side — Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#0245EF] relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0245EF] via-[#0237BF] to-[#011B5F]" />

        {/* Decorative circles */}
        <div className="absolute top-20 left-20 w-64 h-64 bg-white/5 rounded-full" />
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-white/5 rounded-full" />
        <div className="absolute top-1/2 left-1/3 w-48 h-48 bg-white/5 rounded-full" />

        <div className="relative z-10 flex flex-col justify-between p-12 text-white w-full">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Logo size="md" showText={false} variant="white"/>
            </div>
            <p className="text-white/60 text-sm">Hiring, Intelligently Assisted</p>
          </div>

          <div className="space-y-8">
            <h2 className="text-4xl font-bold leading-tight">
              Build your perfect
              <br />hiring pipeline
              <br />
              <span className="text-white/70">in seconds.</span>
            </h2>

            <div className="space-y-4">
              {[
                { icon: "🤖", text: "AI assisted visual flow builder" },
                { icon: "💻", text: "Built-in coding IDE with auto-grading" },
                { icon: "🎯", text: "Every candidate gets personalized feedback" },
                { icon: "⚡", text: "80% cheaper than competitors" },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-xl">{item.icon}</span>
                  <span className="text-white/80 text-sm">{item.text}</span>
                </div>
              ))}
            </div>
          </div>

          <p className="text-white/40 text-xs">
            Trusted by companies who believe in fair hiring.
          </p>
        </div>
      </div>

      {/* Right Side — Auth Forms */}
      <div className="flex-1 flex-col items-center justify-center p-36 bg-slate-50">
        
        <div className="w-full ">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <Logo size="lg" showText={true} linkTo="/landing" />
            <p className="text-slate-500 mt-2 text-sm">Hiring, Intelligently Assisted</p>
          </div>

          <Card className="shadow-xl border-0 bg-white">
            <Tabs defaultValue="login">
              <div className="px-6 pt-6">
                <TabsList className="flex h-11 bg-slate-100 p-1 rounded-lg">
  <TabsTrigger
    value="login"
    className="flex-1 px-4 text-sm font-medium rounded-md transition-all data-[state=active]:bg-[#0245EF] data-[state=active]:text-white data-[state=active]:shadow-sm data-[state=inactive]:text-slate-500 data-[state=inactive]:hover:text-slate-700"
  >
    Sign In
  </TabsTrigger>
  <TabsTrigger
    value="register"
    className="flex-1 px-4 text-sm font-medium rounded-md transition-all data-[state=active]:bg-[#0245EF] data-[state=active]:text-white data-[state=active]:shadow-sm data-[state=inactive]:text-slate-500 data-[state=inactive]:hover:text-slate-700"
  >
    Create Account
  </TabsTrigger>
</TabsList>
              </div>

              <CardContent className="p-6">
                {/* LOGIN */}
                <TabsContent value="login" className="mt-0 space-y-4">
  <div className="text-center mb-2">
    <h2 className="text-xl font-semibold text-slate-800">Welcome back</h2>
    <p className="text-sm text-slate-500">Sign in to your account</p>
  </div>

  <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="login-email" className="text-sm font-medium">Email</Label>
                      <Input
                        id="login-email"
                        type="email"
                        placeholder="you@company.com"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        required
                        className="h-11"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="login-password" className="text-sm font-medium">Password</Label>
                      <div className="relative">
                        <Input
                          id="login-password"
                          type={showPassword ? "text" : "password"}
                          placeholder="••••••••"
                          value={loginPassword}
                          onChange={(e) => setLoginPassword(e.target.value)}
                          required
                          className="h-11 pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <Button
                      type="submit"
                      className="w-full h-11 bg-[#0245EF] hover:bg-[#0237BF] text-base font-medium"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        <ArrowRight className="w-4 h-4 mr-2" />
                      )}
                      Sign In
                    </Button>
                  </form>
                </TabsContent>

                {/* REGISTER */}
                <TabsContent value="register" className="mt-0 space-y-4">
  <div className="text-center mb-2">
    <h2 className="text-xl font-semibold text-slate-800">Get started</h2>
    <p className="text-sm text-slate-500">Create your free account</p>
  </div>

  <form onSubmit={handleRegister} className="space-y-4">
                    {/* Role selection — prominent */}
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setRegRole("CANDIDATE")}
                        className={`p-4 rounded-xl border-2 text-center transition-all ${
                          regRole === "CANDIDATE"
                            ? "border-[#0245EF] bg-[#EBF0FF]"
                            : "border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        <User className={`w-6 h-6 mx-auto mb-1 ${
                          regRole === "CANDIDATE" ? "text-[#0245EF]" : "text-slate-400"
                        }`} />
                        <p className={`text-sm font-medium ${
                          regRole === "CANDIDATE" ? "text-[#0245EF]" : "text-slate-600"
                        }`}>Job Seeker</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">Find jobs & apply</p>
                      </button>
                      <button
                        type="button"
                        onClick={() => setRegRole("HR")}
                        className={`p-4 rounded-xl border-2 text-center transition-all ${
                          regRole === "HR"
                            ? "border-[#0245EF] bg-[#EBF0FF]"
                            : "border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        <Building2 className={`w-6 h-6 mx-auto mb-1 ${
                          regRole === "HR" ? "text-[#0245EF]" : "text-slate-400"
                        }`} />
                        <p className={`text-sm font-medium ${
                          regRole === "HR" ? "text-[#0245EF]" : "text-slate-600"
                        }`}>HR / Recruiter</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">Post jobs & hire</p>
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-sm">First Name</Label>
                        <Input value={regFirstName} onChange={(e) => setRegFirstName(e.target.value)} required className="h-10" placeholder="John" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-sm">Last Name</Label>
                        <Input value={regLastName} onChange={(e) => setRegLastName(e.target.value)} required className="h-10" placeholder="Doe" />
                      </div>
                    </div>

                    {regRole === "HR" && (
                      <div className="space-y-1.5">
                        <Label className="text-sm">Company</Label>
                        <Input value={regCompany} onChange={(e) => setRegCompany(e.target.value)} className="h-10" placeholder="Your Company" />
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <Label className="text-sm">Email</Label>
                      <Input type="email" value={regEmail} onChange={(e) => setRegEmail(e.target.value)} required className="h-10" placeholder="you@company.com" />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-sm">Password</Label>
                      <Input type="password" value={regPassword} onChange={(e) => setRegPassword(e.target.value)} required minLength={8} className="h-10" placeholder="Min 8 characters" />
                    </div>

                    <Button
                      type="submit"
                      className="w-full h-11 bg-[#0245EF] hover:bg-[#0237BF] text-base font-medium"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin " />
                      ) : (
                        <ArrowRight className="w-4 h-4 " />
                      )}
                      Create Account
                    </Button>
                  </form>
                </TabsContent>
              </CardContent>
            </Tabs>
          </Card>

          <p className="text-center text-xs text-slate-400 mt-6">
            By continuing, you agree to Hirasys Terms of Service and Privacy Policy.
          </p>
        </div>
      </div>
    </div>
  );
}