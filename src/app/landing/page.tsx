"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Briefcase, GitBranch, Code, Bot, Filter,
  Users, Zap, ArrowRight, CheckCircle,
  FileSearch, Award, BarChart3, Shield, Sparkles,
} from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/shared/Logo";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">

      {/* Nav */}
      <nav className="border-b border-slate-100 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Logo size="md"/>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost">Sign In</Button>
            </Link>
            <Link href="/login">
              <Button className="bg-[#0245EF] hover:bg-[#0237BF]">
                Get Started
              </Button>
              
            </Link>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="py-20 sm:py-32 bg-gradient-to-b from-indigo-50/50 to-white text-center">
        <div className="max-w-5xl mx-auto px-4">

          <Badge className="bg-[#D1DEFF] text-[#0237BF] mb-6 px-4 py-2">
            <Sparkles className="w-3 h-3 mr-1" />
            Stop reviewing hundreds of resumes
          </Badge>

          <h1 className="text-5xl sm:text-6xl font-bold text-slate-900 leading-tight">
            Only see the candidates that
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#0245EF] to-[#5B3FE6]">
              {" "}actually matter
            </span>
          </h1>

          <p className="text-xl text-slate-500 mt-6 max-w-2xl mx-auto">
            Hirasys filters applicants through your hiring process automatically —  
            <span className="font-medium text-slate-700"> while you stay in control of every decision.</span>
          </p>

          <div className="flex-col justify-center gap-4 mt-10">
            <Link href="/login">
              <Button size="lg" className="h-12 px-8 bg-[#0245EF] hover:bg-[#0237BF]">
                Try with a sample job <ArrowRight className="ml-2 w-5 h-5"/>
              </Button>
            </Link>
            <p className="text-sm text-slate-400 mt-4">
  No credit card required • Free for up to 3 jobs
</p>
          </div>

          {/* Stats */}
          <div className="flex justify-center gap-12 mt-16">
            {[
              { num: "500 → 20", label: "Applicants to shortlist" },
              { num: "80%", label: "Less manual screening" },
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

      {/* DIFFERENTIATOR */}
      <section className="py-20 bg-slate-50 text-center">
        <div className="max-w-4xl mx-auto px-4">

          <h2 className="text-3xl font-bold text-slate-900">
            See your hiring funnel before you even start
          </h2>

          <p className="text-lg text-slate-500 mt-4">
            Know exactly how many candidates you’ll end up with — before posting the job.
          </p>

          <div className="flex justify-center gap-8 mt-10 text-lg font-medium text-slate-700">
            <span>500 applicants</span>
            <span>→</span>
            <span>120 screened</span>
            <span>→</span>
            <span>40 assessed</span>
            <span>→</span>
            <span className="text-[#0245EF] font-bold">20 shortlisted</span>
          </div>

          <p className="mt-6 text-slate-500">
            No guesswork. No surprises. Just predictable hiring.
          </p>

        </div>
      </section>

      {/* FEATURES */}
      <section className="py-20">
        <div className="max-w-6xl mx-auto px-4">

          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900">
              You define the process. Hirasys runs it.
            </h2>
            <p className="text-lg text-slate-500 mt-3">
              Automation handles the volume. You make the decisions.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">

            {[
              {
                icon: GitBranch,
                title: "Design your hiring process",
                desc: "Visually build your pipeline and control how candidates move through each stage.",
              },
              {
                icon: FileSearch,
                title: "Stop manual screening",
                desc: "Every application is scored instantly based on your role.",
              },
              {
                icon: Code,
                title: "Test real skills",
                desc: "Run coding assessments with real execution and auto-grading.",
              },
              {
                icon: Bot,
                title: "Screen before interviews",
                desc: "Evaluate candidates before you spend time talking to them.",
              },
              {
                icon: Filter,
                title: "Control your funnel",
                desc: "Decide exactly how many candidates move forward at each stage.",
              },
              {
                icon: BarChart3,
                title: "Predict outcomes",
                desc: "See hiring cost and candidate flow before you publish.",
              },
            ].map((f) => (
              <Card key={f.title} className="border-0 shadow-sm hover:shadow-md transition">
                <CardContent className="p-6">
                  <f.icon className="w-6 h-6 text-[#0245EF] mb-3"/>
                  <h3 className="font-semibold text-slate-800 mb-2">{f.title}</h3>
                  <p className="text-sm text-slate-500">{f.desc}</p>
                </CardContent>
              </Card>
            ))}

          </div>
        </div>
      </section>

      {/* TRUST */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-4xl mx-auto px-4 text-center">

          <h2 className="text-3xl font-bold text-slate-900">
            Designed for control, not blind automation
          </h2>

          <p className="text-lg text-slate-500 mt-4">
            Hirasys reduces your workload — without taking away your control.
          </p>

          <div className="grid md:grid-cols-2 gap-6 mt-10 text-left">
            {[
              "Review candidates anytime",
              "Override any decision",
              "Add manual interview stages",
              "Pause or adjust anytime",
            ].map((t) => (
              <div key={t} className="flex items-center gap-2 text-slate-700">
                <CheckCircle className="w-5 h-5 text-emerald-500"/>
                {t}
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-gradient-to-r from-[#0245EF] to-[#4B32C4] text-white text-center">
        <div className="max-w-3xl mx-auto px-4">

          <h2 className="text-3xl font-bold">
            Try it with a real role in under 2 minutes
          </h2>

          <p className="text-lg text-[#A3BDFF] mt-4">
            See how your hiring process performs before you even post the job.
          </p>

          <Link href="/login">
            <Button size="lg" className="mt-8 bg-white text-[#0245EF] hover:bg-[#EBF0FF]">
              Create your first pipeline <ArrowRight className="ml-2 w-5 h-5"/>
            </Button>
          </Link>

        </div>
      </section>

      {/* Footer */}
     <footer className="py-12 border-t border-slate-200">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
             <Logo size="md"/>
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