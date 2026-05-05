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
  Menu,
  X,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { Logo } from "@/components/shared/Logo";

export default function LandingPage() {
  const [activeFeature, setActiveFeature] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const features = [
    {
      id: "builder",
      icon: GitBranch,
      tab: "Visual Builder",
      title: "Design your hiring pipeline visually",
      description:
        "Drag and drop stages, set filters, define how candidates move through your process. No code. No templates you can't customize. Your process, built your way.",
      image: "/screenshots/visual-builder.png",
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
    <div className="min-h-screen bg-white overflow-x-hidden">
      {/* ============ NAV ============ */}
      <nav className="border-b border-slate-100 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Logo size="md" />

          {/* Desktop nav */}
          <div className="hidden sm:flex items-center gap-3">
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

          {/* Mobile hamburger */}
          <button
            className="sm:hidden p-2 text-slate-600"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="sm:hidden border-t border-slate-100 bg-white px-4 py-4 space-y-2">
            <Link
              href="/contact"
              onClick={() => setMobileMenuOpen(false)}
              className="block"
            >
              <Button variant="ghost" className="w-full justify-start text-slate-600">
                Contact
              </Button>
            </Link>
            <Link
              href="/login"
              onClick={() => setMobileMenuOpen(false)}
              className="block"
            >
              <Button variant="ghost" className="w-full justify-start text-slate-600">
                Sign In
              </Button>
            </Link>
            <Link
              href="/login"
              onClick={() => setMobileMenuOpen(false)}
              className="block"
            >
              <Button className="w-full bg-[#0245EF] hover:bg-[#0237BF]">
                Get Started Free
              </Button>
            </Link>
          </div>
        )}
      </nav>

      {/* ============ HERO ============ */}
      <section className="pt-12 pb-6 sm:pt-20 sm:pb-8 md:pt-28 md:pb-12">
        <div className="max-w-6xl mx-auto px-4">
          <div className="max-w-3xl">
            <Badge className="bg-[#D1DEFF] text-[#0237BF] mb-4 sm:mb-6 px-3 py-1.5 text-xs sm:text-sm font-medium">
              <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5" />
              Not another ATS
            </Badge>

            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-slate-900 leading-[1.1] tracking-tight">
              Your entire hiring process.
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#0245EF] to-[#5B3FE6]">
                One system.
              </span>
            </h1>

            <p className="text-base sm:text-lg md:text-xl text-slate-500 mt-4 sm:mt-6 max-w-xl leading-relaxed">
              Build your pipeline visually. 
              Review candidates in a structured way.
              Run assessments. Make every hiring decision in one place —
              without giving up control.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 mt-6 sm:mt-8">
              <Link href="/login" className="w-full sm:w-auto">
                <Button
                  size="lg"
                  className="w-full sm:w-auto h-12 px-8 bg-[#0245EF] hover:bg-[#0237BF] text-base"
                >
                  Try it free
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </Link>
              <Button
                size="lg"
                variant="outline"
                className="w-full sm:w-auto h-12 px-8 text-base border-slate-200 text-slate-700 hover:bg-slate-50"
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

            <p className="text-xs sm:text-sm text-slate-400 mt-4">
              Post your 1<sup className="text-xs">st</sup> job for free • No
              credit card
            </p>
          </div>
        </div>
      </section>

      {/* ============ HERO PRODUCT SCREENSHOT ============ */}
      <section className="pb-12 sm:pb-20">
        <div className="max-w-6xl mx-auto px-4">
          <div className="relative rounded-lg sm:rounded-xl border border-slate-200 shadow-xl sm:shadow-2xl shadow-slate-200/50 overflow-hidden bg-slate-50">
            <div className="aspect-[16/10] sm:aspect-[16/9] relative">
              <Image
                src="/screenshots/hero-dashboard.png"
                alt="Hirasys dashboard showing hiring pipeline"
                fill
                className="object-cover object-top"
                priority
              />
            </div>

            {/* Floating badge — hidden on very small screens */}
            <div className="hidden sm:block absolute top-4 right-4 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-2 shadow-lg border border-slate-100">
              <p className="text-xs text-slate-500">Candidates screened</p>
              <p className="text-lg font-bold text-[#0245EF]">
                500 → 23 shortlisted
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ============ PROBLEM STATEMENT ============ */}
      <section className="py-12 sm:py-20 bg-slate-50">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-slate-900 leading-tight">
            You shouldn&apos;t need 4 tools
            <br className="hidden sm:block" />
            <span className="sm:hidden"> </span>
            to hire one person
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mt-8 sm:mt-12 text-left max-w-2xl mx-auto">
            {[
              {
                old: "ATS just to track applicants",
                now: "Pipeline + tracking in one place",
              },
              {
                old: "Separate tool for assessments",
                now: "Coding tests built in",
              },
              {
                old: "Spreadsheets for scoring",
                now: "AI scoring with full transparency",
              },
              {
                old: "Slack threads for decisions",
                now: "Decision flow inside the pipeline",
              },
            ].map((item) => (
              <div
                key={item.old}
                className="bg-white rounded-lg p-3 sm:p-4 border border-slate-200"
              >
                <p className="text-xs sm:text-sm text-slate-400 line-through">
                  {item.old}
                </p>
                <p className="text-xs sm:text-sm font-medium text-slate-800 mt-1">
                  <CheckCircle className="w-4 h-4 text-emerald-500 inline mr-1.5 -mt-0.5" />
                  {item.now}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ PRODUCT DEMO — TABBED FEATURE SHOWCASE ============ */}
      <section id="product-demo" className="py-12 sm:py-20">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-8 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-slate-900">
              See what you&apos;re getting
            </h2>
            <p className="text-base sm:text-lg text-slate-500 mt-3">
              Not features. The actual system.
            </p>
          </div>

          {/* Feature tabs — horizontal scroll on mobile */}
          <div className="flex gap-2 mb-8 sm:mb-10 overflow-x-auto pb-2 sm:pb-0 sm:flex-wrap sm:justify-center scrollbar-hide">
            {features.map((f, i) => (
              <button
                key={f.id}
                onClick={() => setActiveFeature(i)}
                className={`flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap shrink-0 ${
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

          {/* Active feature content — stacked on mobile */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 sm:gap-10 items-center">
            {/* Text — full width on mobile, 2 cols on desktop */}
            <div className="lg:col-span-2 order-2 lg:order-1">
              <h3 className="text-xl sm:text-2xl font-bold text-slate-900">
                {features[activeFeature].title}
              </h3>
              <p className="text-sm sm:text-base text-slate-500 mt-3 sm:mt-4 leading-relaxed">
                {features[activeFeature].description}
              </p>
              <ul className="mt-4 sm:mt-6 space-y-2 sm:space-y-3">
                {features[activeFeature].bullets.map((b) => (
                  <li
                    key={b}
                    className="flex items-start gap-2.5 text-slate-700"
                  >
                    <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500 mt-0.5 shrink-0" />
                    <span className="text-xs sm:text-sm">{b}</span>
                  </li>
                ))}
              </ul>
              <Link href="/login" className="inline-block mt-4 sm:mt-6">
                <Button className="bg-[#0245EF] hover:bg-[#0237BF]">
                  Try this yourself
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </Link>
            </div>

            {/* Screenshot — full width on mobile, 3 cols on desktop */}
            <div className="lg:col-span-3 order-1 lg:order-2 relative rounded-lg sm:rounded-xl border border-slate-200 shadow-lg sm:shadow-xl overflow-hidden bg-slate-50">
              <div className="aspect-[4/3] sm:aspect-[43/25] relative">
                <Image
                  src={features[activeFeature].image}
                  alt={features[activeFeature].title}
                  fill
                  className="object-contain bg-white"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============ HOW IT WORKS ============ */}
      <section className="py-12 sm:py-20 bg-slate-50">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-10 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-slate-900">
              From job post <ArrowRight/> shortlist in 2 steps
            </h2>
          </div>

          <div className="grid gap-8 sm:gap-12">
            {[
              {
                step: "01",
                icon: MousePointerClick,
                title: "Build your pipeline",
                desc: "Use the visual builder to define stages, filters, and evaluation criteria in minutes.",
                video: "/screenshots/Visual-Builder-Video.mp4",
              },
              {
                step: "02",
                icon: SlidersHorizontal,
                title: "Candidates flow through",
                desc: "Applications are scored, assessed, and organized automatically. You see a ranked, filtered pipeline — not a pile of resumes.",
                video: "/screenshots/candidate-flow.mp4",
              },
            ].map((step) => (
              <div key={step.step} className="text-center px-0 sm:px-12">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <span className="text-xs font-bold text-[#0245EF] bg-[#D1DEFF] rounded-full w-6 h-6 flex items-center justify-center">
                    {step.step}
                  </span>
                  <h3 className="font-semibold text-slate-900">
                    {step.title}
                  </h3>
                </div>
                <p className="text-xs sm:text-sm text-slate-500 leading-relaxed mb-4 sm:mb-6 max-w-lg mx-auto">
                  {step.desc}
                </p>
                <div className="relative rounded-lg border border-slate-200 shadow-md overflow-hidden bg-white">
                  <div className="aspect-[16/10] sm:aspect-[43/25] relative">
                    <video
                      src={step.video}
                      autoPlay
                      muted
                      loop
                      playsInline
                      className="absolute inset-0 w-full h-full object-cover object-top"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ THE CONTROL SECTION ============ */}
      <section className="py-12 sm:py-20">
        <div className="max-w-5xl mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-12 items-center">
            <div className="order-2 lg:order-1">
              <Badge className="bg-emerald-50 text-emerald-700 mb-4">
                Your rules, always
              </Badge>
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">
                You stay in control
              </h2>
              <p className="text-sm sm:text-base text-slate-500 mt-4 leading-relaxed">
                Hirasys helps you handle volume — screening, scoring, organizing. But
                every decision stays with you. No black box decisions. Add manual stages wherever you want.
                You see everything, you control
                everything.
              </p>

              <div className="mt-6 sm:mt-8 space-y-3 sm:space-y-4">
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
                      <p className="font-medium text-slate-800 text-xs sm:text-sm">
                        {item.title}
                      </p>
                      <p className="text-xs sm:text-sm text-slate-500">
                        {item.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="order-1 lg:order-2 relative rounded-lg sm:rounded-xl border border-slate-200 shadow-lg sm:shadow-xl bg-white overflow-hidden">
              <div className="aspect-[4/3] sm:aspect-[8/7] relative bg-white">
                <video
                  src="/screenshots/control-override.mp4"
                  autoPlay
                  muted
                  loop
                  playsInline
                  className="absolute inset-0 w-full h-full object-cover object-top bg-white"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============ SOCIAL PROOF ============ */}
      <section className="py-12 sm:py-20 bg-slate-50">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <p className="text-xs sm:text-sm font-medium text-slate-400 uppercase tracking-wider mb-6 sm:mb-8">
            Early teams using Hirasys
          </p>

          <Card className="max-w-2xl mx-auto border-0 shadow-md">
            <CardContent className="p-5 sm:p-8">
              <Quote className="w-6 h-6 sm:w-8 sm:h-8 text-[#0245EF] opacity-20 mb-3 sm:mb-4" />
              <p className="text-base sm:text-lg text-slate-700 leading-relaxed italic">
                &quot;We were drowning in 320+ applications per role and
                spending entire days just screening. Hirasys gave us a shortlist
                of 12 candidates we actually wanted to talk to — in 4
                days.&quot;
              </p>
              <div className="mt-4 sm:mt-6 flex items-center justify-center gap-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-slate-200" />
                <div className="text-left">
                  <p className="text-xs text-slate-500">Midseas Infotech</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* ============ COMPARISON — WHY NOT JUST AN ATS ============ */}
      <section className="py-12 sm:py-20">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center mb-8 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">
              Not an ATS with AI bolted on
            </h2>
            <p className="text-base sm:text-lg text-slate-500 mt-3">
              Hirasys was built as one system from day one
            </p>
          </div>

          <div className="overflow-x-auto -mx-4 px-4">
            <table className="w-full text-xs sm:text-sm min-w-[400px]">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-3 sm:py-4 pr-4 text-slate-500 font-medium"></th>
                  <th className="text-center py-3 sm:py-4 px-2 sm:px-4 text-slate-400 font-medium">
                    Typical ATS
                  </th>
                  <th className="text-center py-3 sm:py-4 px-2 sm:px-4 font-medium text-[#0245EF]">
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
                  <tr
                    key={feature as string}
                    className="border-b border-slate-100"
                  >
                    <td className="py-2.5 sm:py-3 pr-4 text-slate-700">
                      {feature as string}
                    </td>
                    <td className="py-2.5 sm:py-3 px-2 sm:px-4 text-center">
                      {ats ? (
                        <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-slate-300 mx-auto" />
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                    <td className="py-2.5 sm:py-3 px-2 sm:px-4 text-center">
                      {hirasys ? (
                        <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500 mx-auto" />
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
      <section className="py-12 sm:py-20 bg-gradient-to-br from-[#0245EF] to-[#3B28A7] text-white">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold leading-tight">
            See your entire hiring process
            <br className="hidden sm:block" />
            <span className="sm:hidden"> </span>
            in one place
          </h2>

          <p className="text-sm sm:text-lg text-blue-200 mt-4">
            Create a pipeline for any role in under 5 minutes.
            <br className="hidden sm:block" />
            <span className="sm:hidden"> </span>
            See what your candidate funnel will look like before you go live.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center mt-6 sm:mt-8">
            <Link href="/login" className="w-full sm:w-auto">
              <Button
                size="lg"
                className="w-full sm:w-auto h-12 px-8 bg-white text-[#0245EF] hover:bg-blue-50 text-base font-semibold"
              >
                Start for free
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
          </div>

          <p className="text-xs sm:text-sm text-blue-300 mt-4">
            Post your 1<sup className="text-xs">st</sup> job for free • No
            credit card • Set up in minutes
          </p>
        </div>
      </section>

      {/* ============ FOOTER ============ */}
      <footer className="py-8 sm:py-12 border-t border-slate-200 bg-white">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
            <div className="flex items-center gap-4">
              <Logo size="md" />
              <span className="text-xs sm:text-sm text-slate-400">
                Hiring, intelligently assisted
              </span>
            </div>
            <div className="flex gap-6 text-xs sm:text-sm text-slate-400">
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
          <p className="text-[10px] sm:text-xs text-slate-300 mt-4 sm:mt-6 text-center sm:text-left">
            © {new Date().getFullYear()} Hirasys. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}