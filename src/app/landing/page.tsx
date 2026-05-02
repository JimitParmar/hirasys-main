"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  ArrowRight,
  CheckCircle,
  Play,
  MousePointerClick,
  SlidersHorizontal,
  Eye,
  Code,
  GitBranch,
  BarChart3,
  Bot,
  ChevronRight,
  Sparkles,
  Quote,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { Logo } from "@/components/shared/Logo";

export default function LandingPage() {
  const [activeFeature, setActiveFeature] = useState(0);

  const features = [
    {
      id: "builder",
      icon: GitBranch,
      tab: "Visual Builder",
      title: "Design your hiring pipeline visually",
      description:
        "Drag and drop stages, set filters, define how candidates move through your process. No code. No templates you can't customize. Your process, built your way.",
      image: "/screenshots/visual-builder.png",
      // Replace with your actual screenshot path
      bullets: [
        "Drag-and-drop stage builder",
        "Set pass/fail criteria per stage",
        "Preview candidate flow before going live",
      ],
    },
    {
      id: "assessment",
      icon: Code,
      tab: "Code Assessment",
      title: "Test real skills, not resume keywords",
      description:
        "Run coding assessments with actual code execution and auto-grading. Candidates write real code. You see real results. No more guessing who can actually do the job.",
      image: "/screenshots/code-assessment.png",
      bullets: [
        "Real code execution in-browser",
        "Auto-graded with detailed scoring",
        "Support for multiple languages",
      ],
    },
    {
      id: "screening",
      icon: Bot,
      tab: "AI Screening",
      title: "Every resume scored in seconds",
      description:
        "Hirasys reads every application and scores it against your role requirements. You see the ranked list. You decide who moves forward. The AI does the reading — you do the deciding.",
      image: "/screenshots/ai-screening.png",
      bullets: [
        "Scores based on YOUR criteria, not generic matching",
        "See why each candidate scored the way they did",
        "Override any score anytime",
      ],
    },
    {
      id: "pipeline",
      icon: BarChart3,
      tab: "Pipeline View",
      title: "See everything. Miss nothing.",
      description:
        "One view showing every candidate, every stage, every role. Know exactly where things stand without asking anyone or digging through tabs.",
      image: "/screenshots/pipeline-view.png",
      bullets: [
        "Real-time pipeline across all roles",
        "Filter by stage, score, or status",
        "Spot bottlenecks before they cost you a hire",
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* ============ NAV ============ */}
      <nav className="border-b border-slate-100 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Logo size="md" />
          <div className="flex items-center gap-3">
            <Link href="/contact">
              <Button variant="ghost" className="text-slate-600">
                Contact
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="ghost" className="text-slate-600">
                Sign In
              </Button>
            </Link>
            <Link href="/login">
              <Button className="bg-[#0245EF] hover:bg-[#0237BF]">
                Get Started Free
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* ============ HERO ============ */}
      <section className="pt-20 pb-8 sm:pt-28 sm:pb-12">
        <div className="max-w-6xl mx-auto px-4">
          <div className="max-w-3xl">
            <Badge className="bg-[#D1DEFF] text-[#0237BF] mb-6 px-3 py-1.5 text-sm font-medium">
              <Sparkles className="w-4 h-4 mr-1.5" />
              Not another ATS
            </Badge>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-900 leading-[1.1] tracking-tight">
              Your entire hiring process.
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#0245EF] to-[#5B3FE6]">
                One system.
              </span>
            </h1>

            <p className="text-lg sm:text-xl text-slate-500 mt-6 max-w-xl leading-relaxed">
              Build your pipeline visually. Screen candidates automatically.
              Run coding assessments. Make every hiring decision in one place —
              without giving up control.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 mt-8">
              <Link href="/login">
                <Button
                  size="lg"
                  className="h-12 px-8 bg-[#0245EF] hover:bg-[#0237BF] text-base"
                >
                  Try it free
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </Link>
              <Button
                size="lg"
                variant="outline"
                className="h-12 px-8 text-base border-slate-200 text-slate-700 hover:bg-slate-50"
                onClick={() => {
                  document
                    .getElementById("product-demo")
                    ?.scrollIntoView({ behavior: "smooth" });
                }}
              >
                <Play className="mr-2 w-4 h-4" />
                See how it works
              </Button>
            </div>

            <p className="text-sm text-slate-400 mt-4">
              Post your 1<sup className="text-xs">st</sup> job for free • No credit card
            </p>
          </div>
        </div>
      </section>

      {/* ============ HERO PRODUCT SCREENSHOT ============ */}
      <section className="pb-20">
        <div className="max-w-6xl mx-auto px-4">
          <div className="relative rounded-xl border border-slate-200 shadow-2xl shadow-slate-200/50 overflow-hidden bg-slate-50">
            {/* Replace with your actual hero screenshot */}
            <div className="aspect-[16/9] relative">
              <Image
                src="/screenshots/hero-dashboard.png"
                alt="Hirasys dashboard showing hiring pipeline"
                fill
                className="object-cover object-top"
                priority
              />
              {/* If you don't have the image yet, use this placeholder */}
              {/* <div className="w-full h-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
                <p className="text-slate-400 text-lg">Product screenshot goes here</p>
              </div> */}
            </div>

            {/* Floating badges on the screenshot */}
            <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-2 shadow-lg border border-slate-100">
              <p className="text-xs text-slate-500">Candidates screened</p>
              <p className="text-lg font-bold text-[#0245EF]">
                500 → 23 shortlisted
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ============ PROBLEM STATEMENT ============ */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 leading-tight">
            You shouldn't need 4 tools
            <br />
            to hire one person
          </h2>

          <div className="grid sm:grid-cols-2 gap-4 mt-12 text-left max-w-2xl mx-auto">
            {[
              { old: "ATS just to track applicants", now: "Pipeline + tracking in one place" },
              { old: "Separate tool for assessments", now: "Coding tests built in" },
              { old: "Spreadsheets for scoring", now: "AI scoring with full transparency" },
              { old: "Slack threads for decisions", now: "Decision flow inside the pipeline" },
            ].map((item) => (
              <div
                key={item.old}
                className="bg-white rounded-lg p-4 border border-slate-200"
              >
                <p className="text-sm text-slate-400 line-through">{item.old}</p>
                <p className="text-sm font-medium text-slate-800 mt-1">
                  <CheckCircle className="w-4 h-4 text-emerald-500 inline mr-1.5 -mt-0.5" />
                  {item.now}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ PRODUCT DEMO — TABBED FEATURE SHOWCASE ============ */}
      <section id="product-demo" className="py-20">
        <div className="max-w-6xl mx-auto px-2">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900">
              See what you're getting
            </h2>
            <p className="text-lg text-slate-500 mt-3">
              Not abstract features. The actual product.
            </p>
          </div>

          {/* Feature tabs */}
          <div className="flex flex-wrap justify-center gap-2 mb-10">
            {features.map((f, i) => (
              <button
                key={f.id}
                onClick={() => setActiveFeature(i)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  activeFeature === i
                    ? "bg-[#0245EF] text-white shadow-lg shadow-blue-200"
                    : "bg-white text-slate-600 border border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                }`}
              >
                <f.icon className="w-4 h-4" />
                {f.tab}
              </button>
            ))}
          </div>

          {/* Active feature content */}
          <div className="grid lg:grid-cols-5 gap-10 items-center">
            {/* Left — text */}
            <div className="col-span-2">
              <h3 className="text-2xl font-bold text-slate-900">
                {features[activeFeature].title}
              </h3>
              <p className="text-slate-500 mt-4 leading-relaxed">
                {features[activeFeature].description}
              </p>
              <ul className="mt-6 space-y-3">
                {features[activeFeature].bullets.map((b) => (
                  <li key={b} className="flex items-start gap-2.5 text-slate-700">
                    <CheckCircle className="w-5 h-5 text-emerald-500 mt-0.5 shrink-0" />
                    <span className="text-sm">{b}</span>
                  </li>
                ))}
              </ul>
              <Link href="/login" className="inline-block mt-6">
                <Button className="bg-[#0245EF] hover:bg-[#0237BF]">
                  Try this yourself
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </Link>
            </div>

            {/* Right — screenshot */}
            <div className="relative col-span-3 rounded-xl border border-slate-200 shadow-xl overflow-hidden bg-slate-50">
              <div className="aspect-[4/3] relative">
                <Image
                  src={features[activeFeature].image}
                  alt={features[activeFeature].title}
                  fill
                  className=" object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============ HOW IT WORKS ============ */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900">
              From job post to shortlist in 3 steps
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: "01",
                icon: MousePointerClick,
                title: "Build your pipeline",
                desc: "Use the visual builder to define stages, criteria, and candidate flow. Takes under 5 minutes.",
                image: "/screenshots/step-1-builder.png",
              },
              {
                step: "02",
                icon: SlidersHorizontal,
                title: "Candidates flow through",
                desc: "Applications are scored, assessed, and organized automatically. You see a ranked, filtered pipeline — not a pile of resumes.",
                image: "/screenshots/step-2-pipeline.png",
              },
              {
                step: "03",
                icon: Eye,
                title: "You make the calls",
                desc: "Review the shortlist. Advance, reject, or override anything. Every decision is yours. The system just gets you here faster.",
                image: "/screenshots/step-3-decisions.png",
              },
            ].map((step) => (
              <div key={step.step} className="text-center">
                <div className="relative rounded-lg border border-slate-200 shadow-md overflow-hidden bg-white mb-5">
                  <div className="aspect-[4/3] relative">
                    <Image
                      src={step.image}
                      alt={step.title}
                      fill
                      className="object-cover object-top"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-center gap-2 mb-2">
                  <span className="text-xs font-bold text-[#0245EF] bg-[#D1DEFF] rounded-full w-6 h-6 flex items-center justify-center">
                    {step.step}
                  </span>
                  <h3 className="font-semibold text-slate-900">{step.title}</h3>
                </div>
                <p className="text-sm text-slate-500 leading-relaxed">
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ THE CONTROL SECTION ============ */}
      <section className="py-20">
        <div className="max-w-5xl mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <Badge className="bg-emerald-50 text-emerald-700 mb-4">
                Your rules, always
              </Badge>
              <h2 className="text-3xl font-bold text-slate-900">
                Automation that knows its place
              </h2>
              <p className="text-slate-500 mt-4 leading-relaxed">
                Hirasys handles the volume — screening, scoring, organizing. But
                nothing moves without your say. No black box decisions. No
                candidates auto-rejected. You see everything, you control
                everything.
              </p>

              <div className="mt-8 space-y-4">
                {[
                  {
                    title: "Override any score or decision",
                    desc: "AI suggests. You decide. Always.",
                  },
                  {
                    title: "Pause the pipeline anytime",
                    desc: "Need to slow down? One click. Everything holds.",
                  },
                  {
                    title: "Add manual stages wherever you want",
                    desc: "Coffee chat, panel round, culture fit — add anything between automated stages.",
                  },
                  {
                    title: "See why every score was given",
                    desc: "Full transparency on every AI decision. No mystery rankings.",
                  },
                ].map((item) => (
                  <div key={item.title} className="flex gap-3">
                    <CheckCircle className="w-5 h-5 text-emerald-500 mt-0.5 shrink-0" />
                    <div>
                      <p className="font-medium text-slate-800 text-sm">
                        {item.title}
                      </p>
                      <p className="text-sm text-slate-500">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative rounded-xl border border-slate-200 shadow-xl overflow-hidden bg-slate-50">
              <div className="aspect-[4/3] relative">
                <Image
                  src="/screenshots/control-override.png"
                  alt="Manual override controls in Hirasys"
                  fill
                  className="object-cover object-top"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============ SOCIAL PROOF ============ */}
      {/* 
        NOTE: If you don't have real testimonials yet, use ONE of these options:
        Option A — Show "early access" companies (even 2-3 logos)
        Option B — Show a quote from a beta user
        Option C — Skip this section entirely until you have proof. 
                   Fake testimonials destroy trust faster than no testimonials.
      */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <p className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-8">
            Early teams using Hirasys
          </p>

          {/* Option A: Logo bar — uncomment when you have logos */}
          {/* <div className="flex justify-center items-center gap-10 opacity-40 grayscale">
            <Image src="/logos/company1.svg" alt="Company 1" width={120} height={40} />
            <Image src="/logos/company2.svg" alt="Company 2" width={120} height={40} />
            <Image src="/logos/company3.svg" alt="Company 3" width={120} height={40} />
          </div> */}

          {/* Option B: Single testimonial */}
          <Card className="max-w-2xl mx-auto border-0 shadow-md">
            <CardContent className="p-8">
              <Quote className="w-8 h-8 text-[#0245EF] opacity-20 mb-4" />
              <p className="text-lg text-slate-700 leading-relaxed italic">
                "We were drowning in 320+ applications per role and spending
                entire days just screening. Hirasys gave us a shortlist of 12
                candidates we actually wanted to talk to — in 4 days."
              </p>
              <div className="mt-6 flex items-center justify-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-200" />
                {/* Replace with actual avatar */}
                <div className="text-left">
                  
                  <p className="text-xs text-slate-500">
                    Midseas Infotech
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* ============ COMPARISON — WHY NOT JUST AN ATS ============ */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900">
              Not an ATS with AI bolted on
            </h2>
            <p className="text-lg text-slate-500 mt-3">
              Hirasys was built as one system from day one
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-4 pr-4 text-slate-500 font-medium"></th>
                  <th className="text-center py-4 px-4 text-slate-400 font-medium">
                    Typical ATS
                  </th>
                  <th className="text-center py-4 px-4 font-medium text-[#0245EF]">
                    Hirasys
                  </th>
                </tr>
              </thead>
              <tbody className="text-slate-600">
                {[
                  ["Visual pipeline builder", false, true],
                  ["Built-in coding assessments", false, true],
                  ["AI screening with manual override", false, true],
                  ["Decision flow inside the tool", false, true],
                  ["Predict pipeline outcomes before posting", false, true],
                  ["Candidate tracking", true, true],
                  ["Every candidate gets feedback", false, true],
                ].map(([feature, ats, hirasys]) => (
                  <tr key={feature as string} className="border-b border-slate-100">
                    <td className="py-3 pr-4 text-slate-700">{feature as string}</td>
                    <td className="py-3 px-4 text-center">
                      {ats ? (
                        <CheckCircle className="w-5 h-5 text-slate-300 mx-auto" />
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {hirasys ? (
                        <CheckCircle className="w-5 h-5 text-emerald-500 mx-auto" />
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ============ FINAL CTA ============ */}
      <section className="py-20 bg-gradient-to-br from-[#0245EF] to-[#3B28A7] text-white">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold leading-tight">
            See your entire hiring process
            <br />
            in one place
          </h2>

          <p className="text-lg text-blue-200 mt-4">
            Create a pipeline for any role in under 5 minutes.
            <br />
            See what your candidate funnel will look like before you go live.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center mt-8">
            <Link href="/login">
              <Button
                size="lg"
                className="h-12 px-8 bg-white text-[#0245EF] hover:bg-blue-50 text-base font-semibold"
              >
                Start for free
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
          </div>

          <p className="text-sm text-blue-300 mt-4">
            Post your 1<sup className="text-xs">st</sup> job for free • No credit card • Set up in minutes
          </p>
        </div>
      </section>

      {/* ============ FOOTER ============ */}
      <footer className="py-12 border-t border-slate-200 bg-white">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Logo size="md" />
              <span className="text-sm text-slate-400">
                Hiring, intelligently assisted
              </span>
            </div>
            <div className="flex gap-6 text-sm text-slate-400">
              <Link href="/privacy" className="hover:text-slate-600">
                Privacy
              </Link>
              <Link href="/terms" className="hover:text-slate-600">
                Terms
              </Link>
              <a href="/contact" className="hover:text-slate-600">
                Contact
              </a>
            </div>
          </div>
          <p className="text-xs text-slate-300 mt-6 text-center sm:text-left">
            © {new Date().getFullYear()} Hirasys. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}