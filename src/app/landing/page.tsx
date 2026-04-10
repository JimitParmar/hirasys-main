"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Briefcase, GitBranch, Code, Bot, Filter, DollarSign,
  Users, Zap, Star, ArrowRight, CheckCircle, MessageSquare,
  FileSearch, Award, BarChart3, Shield, Sparkles,
} from "lucide-react";
import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="border-b border-slate-100 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-[#0245EF] to-[#5B3FE6] rounded-lg flex items-center justify-center">
              <Briefcase className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-xl text-slate-800">Hirasys</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost">Sign In</Button>
            </Link>
            <Link href="/login">
              <Button className="bg-[#0245EF] hover:bg-[#0237BF]">Get Started Free</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="py-20 sm:py-32 bg-gradient-to-b from-indigo-50/50 to-white">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <Badge className="bg-[#D1DEFF] text-[#0237BF] mb-6 px-4 py-1">
            <Sparkles className="w-3 h-3 mr-1" /> AI-Powered Hiring Platform
          </Badge>

          <h1 className="text-5xl sm:text-6xl font-bold text-slate-900 leading-tight max-w-4xl mx-auto">
            Build Your Perfect
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#0245EF] to-[#5B3FE6]"> Hiring Pipeline</span>
          </h1>

          <p className="text-xl text-slate-500 mt-6 max-w-2xl mx-auto leading-relaxed">
            Visual pipeline builder. AI-powered screening. Integrated coding IDE.
            Adaptive interviews. Fair feedback for every candidate.
          </p>

          <div className="flex items-center justify-center gap-4 mt-10">
            <Link href="/login">
              <Button size="lg" className="h-12 px-8 bg-[#0245EF] hover:bg-[#0237BF] text-base">
                Start Hiring Free <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
            <Link href="/jobs">
              <Button size="lg" variant="outline" className="h-12 px-8 text-base">
                Browse Jobs
              </Button>
            </Link>
          </div>

          <p className="text-sm text-slate-400 mt-4">No credit card required • Free for up to 3 jobs</p>

          {/* Stats */}
          <div className="flex items-center justify-center gap-12 mt-16">
            {[
              { num: "75%", label: "Lower cost per hire" },
              { num: "3x", label: "Faster hiring" },
              { num: "100%", label: "Candidates get feedback" },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <p className="text-3xl font-bold text-[#0245EF]">{s.num}</p>
                <p className="text-sm text-slate-500">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900">Everything you need to hire better</h2>
            <p className="text-lg text-slate-500 mt-3">One platform replaces your entire hiring stack</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: GitBranch, title: "Visual Pipeline Builder", desc: "Drag-and-drop hiring workflows. Add filters, assessments, interviews — all connected visually.", color: "indigo" },
              { icon: FileSearch, title: "AI Resume Screening", desc: "Gemini AI scores every resume against your job description instantly. No manual screening.", color: "blue" },
              { icon: Code, title: "Integrated Code IDE", desc: "Monaco editor with multi-language support. Test cases, auto-grading, real execution.", color: "purple" },
              { icon: Bot, title: "AI Interviews", desc: "Adaptive AI interviews that follow up based on answers. Technical + behavioral modes.", color: "violet" },
              { icon: Filter, title: "Smart Filters", desc: "Top-N, Score Gate, Hybrid filters. Control exactly how many candidates pass each stage. All FREE.", color: "amber" },
              { icon: MessageSquare, title: "Rejection Feedback", desc: "Every rejected candidate gets personalized feedback. Strengths, improvements, resources.", color: "emerald" },
              { icon: BarChart3, title: "Real-time Cost Estimator", desc: "See exactly what your pipeline will cost before you publish. Savings vs no-filters shown.", color: "pink" },
              { icon: Shield, title: "Fair & Transparent", desc: "Candidates see real pipeline stages. No black boxes. Every decision is explainable.", color: "cyan" },
              { icon: Zap, title: "Auto-Execution", desc: "Pipeline runs itself. Auto-advance, auto-reject, auto-score. HR just reviews top candidates.", color: "orange" },
            ].map((f) => (
              <Card key={f.title} className="border-0 shadow-sm hover:shadow-md transition-all group">
                <CardContent className="p-6">
                  <div className={`w-10 h-10 rounded-lg bg-${f.color}-100 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                    <f.icon className={`w-5 h-5 text-${f.color}-600`} />
                  </div>
                  <h3 className="font-semibold text-slate-800 mb-2">{f.title}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">{f.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900">How it works</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {[
              { step: "1", title: "Build Pipeline", desc: "Drag nodes to create your hiring flow. Add filters to control candidate volume.", icon: GitBranch },
              { step: "2", title: "Publish Job", desc: "Link pipeline to job. Candidates apply and get auto-screened instantly.", icon: Briefcase },
              { step: "3", title: "Auto-Execute", desc: "Pipeline runs itself. Assessments, interviews, and filters happen automatically.", icon: Zap },
              { step: "4", title: "Hire the Best", desc: "Review top-ranked candidates. Everyone gets personalized feedback.", icon: Award },
            ].map((s) => (
              <div key={s.step} className="text-center">
                <div className="w-14 h-14 rounded-full bg-[#0245EF] text-white text-xl font-bold flex items-center justify-center mx-auto mb-4">
                  {s.step}
                </div>
                <h3 className="font-semibold text-slate-800 mb-2">{s.title}</h3>
                <p className="text-sm text-slate-500">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-20">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900">Simple pricing</h2>
            <p className="text-lg text-slate-500 mt-3">Pay for what you use. Filters are always free.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {/* Free */}
            <Card className="border-2 border-slate-200">
              <CardContent className="p-6">
                <h3 className="font-semibold text-lg">Free</h3>
                <p className="text-3xl font-bold mt-2">$0<span className="text-sm font-normal text-slate-400">/mo</span></p>
                <p className="text-sm text-slate-500 mt-2 mb-6">Perfect to get started</p>
                <ul className="space-y-2 text-sm">
                  {["3 job postings/month", "50 resume screens", "10 assessments", "5 AI interviews", "Basic templates"].map((f) => (
                    <li key={f} className="flex items-center gap-2 text-slate-600">
                      <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" /> {f}
                    </li>
                  ))}
                </ul>
                <Link href="/login">
                  <Button className="w-full mt-6" variant="outline">Get Started</Button>
                </Link>
              </CardContent>
            </Card>

            {/* Pro */}
            <Card className="border-2 border-[#0245EF] shadow-lg relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <Badge className="bg-[#0245EF]">Most Popular</Badge>
              </div>
              <CardContent className="p-6">
                <h3 className="font-semibold text-lg">Pro</h3>
                <p className="text-3xl font-bold mt-2">$179<span className="text-sm font-normal text-slate-400">/mo</span></p>
                <p className="text-sm text-slate-500 mt-2 mb-6">For growing teams</p>
                <ul className="space-y-2 text-sm">
                  {["Unlimited jobs", "Pipeline builder", "$500 usage credit", "All assessment types", "AI interviews", "Priority support"].map((f) => (
                    <li key={f} className="flex items-center gap-2 text-slate-600">
                      <CheckCircle className="w-4 h-4 text-[#0245EF] shrink-0" /> {f}
                    </li>
                  ))}
                </ul>
                <Link href="/login">
                  <Button className="w-full mt-6 bg-[#0245EF] hover:bg-[#0237BF]">Start Free Trial</Button>
                </Link>
              </CardContent>
            </Card>

            {/* Enterprise */}
            <Card className="border-2 border-slate-200">
              <CardContent className="p-6">
                <h3 className="font-semibold text-lg">Enterprise</h3>
                <p className="text-3xl font-bold mt-2">$599<span className="text-sm font-normal text-slate-400">/mo</span></p>
                <p className="text-sm text-slate-500 mt-2 mb-6">For large organizations</p>
                <ul className="space-y-2 text-sm">
                  {["Everything in Pro", "$2000 usage credit", "Custom nodes", "SSO/SAML", "Dedicated support", "Volume discounts"].map((f) => (
                    <li key={f} className="flex items-center gap-2 text-slate-600">
                      <CheckCircle className="w-4 h-4 text-purple-500 shrink-0" /> {f}
                    </li>
                  ))}
                </ul>
                <Link href="/login">
                  <Button className="w-full mt-6" variant="outline">Contact Sales</Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-gradient-to-r from-[#0245EF] to-[#4B32C4] text-white">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold">Ready to transform your hiring?</h2>
          <p className="text-lg text-[#A3BDFF] mt-3">
            Join companies that hire smarter. Every candidate gets feedback. Every hire is data-driven.
          </p>
          <div className="flex items-center justify-center gap-4 mt-8">
            <Link href="/login">
              <Button size="lg" className="bg-white text-[#0245EF] hover:bg-[#EBF0FF] h-12 px-8">
                Start Hiring Free <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-slate-200">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-6 h-6 bg-gradient-to-br from-[#0245EF] to-[#5B3FE6] rounded flex items-center justify-center">
              <Briefcase className="w-3 h-3 text-white" />
            </div>
            <span className="font-bold text-slate-800">Hirasys</span>
          </div>
          <p className="text-sm text-slate-400">
            Hiring, Intelligently Assisted • Where rejection comes with a roadmap
          </p>
          <p className="text-xs text-slate-300 mt-2">
            © {new Date().getFullYear()} Hirasys. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}