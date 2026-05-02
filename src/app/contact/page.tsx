"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Logo } from "@/components/shared/Logo";
import Image from "next/image";
import {
  Mail,
  Send,
  ArrowLeft,
  CheckCircle,
  Loader2,
  MessageSquare,
  Clock,
  Building2,
} from "lucide-react";
import Link from "next/link";

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    company: "",
    subject: "",
    message: "",
    type: "general",
  });

  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle"
  );

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("sending");

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setStatus("sent");
        setFormData({
          name: "",
          email: "",
          company: "",
          subject: "",
          message: "",
          type: "general",
        });
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <nav className="border-b border-slate-100 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Logo size="md" />
          <div className="flex items-center gap-3">
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

      <div className="max-w-6xl mx-auto px-4 py-16 sm:py-12">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-600 mb-10"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to home
        </Link>

        <div className="grid lg:grid-cols-5 gap-16">
          {/* LEFT — Info */}
          <div className="lg:col-span-2">
            <h1 className="text-3xl sm:text-4xl font-bold text-slate-900">
              Get in touch
            </h1>

            <p className="text-slate-500 mt-4 leading-relaxed">
              Have a question about Hirasys? Want to see a demo? Or just want to
              talk about your hiring process? We would love to hear from you.
            </p>

            <div className="mt-10 space-y-6">
              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-lg bg-[#D1DEFF] flex items-center justify-center shrink-0">
                  <Mail className="w-5 h-5 text-[#0245EF]" />
                </div>
                <div>
                  <p className="font-medium text-slate-800 text-sm">
                    Email us directly
                  </p>
                  <a
                    href="mailto:support@hirasys.in"
                    className="text-sm text-[#0245EF] hover:underline"
                  >
                    support@hirasys.in
                  </a>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-lg bg-[#D1DEFF] flex items-center justify-center shrink-0">
                  <Clock className="w-5 h-5 text-[#0245EF]" />
                </div>
                <div>
                  <p className="font-medium text-slate-800 text-sm">
                    Response time
                  </p>
                  <p className="text-sm text-slate-500">
                    We typically reply within 24 hours
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-lg bg-[#D1DEFF] flex items-center justify-center shrink-0">
                  <MessageSquare className="w-5 h-5 text-[#0245EF]" />
                </div>
                <div>
                  <p className="font-medium text-slate-800 text-sm">
                    Want a live demo?
                  </p>
                  <p className="text-sm text-slate-500">
                    Select &quot;Request a demo&quot; in the form and we will
                    set up a 15-minute walkthrough
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT — Form */}
          <div className="lg:col-span-3 min-h-[600px]">
  {status === "sent" ? (
    <Card className="border-0 shadow-lg">
      <CardContent className="p-10 text-center min-h-[600px] flex flex-col items-center justify-center">
        <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-8 h-8 text-emerald-500" />
        </div>
        <h3 className="text-xl font-bold text-slate-900">
          Message sent
        </h3>
        <p className="text-slate-500 mt-2">
          We will get back to you within 24 hours.
        </p>
        <Button
          className="mt-6 bg-[#0245EF] hover:bg-[#0237BF]"
          onClick={() => setStatus("idle")}
        >
          Send another message
        </Button>
      </CardContent>
    </Card>
  ) : (
    <Card className="border-0 shadow-lg">
      <CardContent className="p-8">
                  <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Type buttons */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        What is this about?
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { value: "general", label: "General question" },
                          { value: "demo", label: "Request a demo" },
                          { value: "support", label: "Support / Bug" },
                          { value: "partnership", label: "Partnership" },
                        ].map((option) => (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() =>
                              setFormData((prev) => ({
                                ...prev,
                                type: option.value,
                              }))
                            }
                            className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                              formData.type === option.value
                                ? "bg-[#0245EF] text-white shadow-sm"
                                : "bg-slate-50 text-slate-600 border border-slate-200 hover:border-slate-300"
                            }`}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Name + Email */}
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">
                          Your name
                          <span className="text-red-400 ml-0.5">*</span>
                        </label>
                        <input
                          type="text"
                          name="name"
                          required
                          value={formData.name}
                          onChange={handleChange}
                          placeholder="Alex Johnson"
                          className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-[#0245EF] focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">
                          Work email
                          <span className="text-red-400 ml-0.5">*</span>
                        </label>
                        <input
                          type="email"
                          name="email"
                          required
                          value={formData.email}
                          onChange={handleChange}
                          placeholder="alex@company.com"
                          className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-[#0245EF] focus:border-transparent"
                        />
                      </div>
                    </div>

                    {/* Company */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">
                        Company
                      </label>
                      <div className="relative">
                        <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                        <input
                          type="text"
                          name="company"
                          value={formData.company}
                          onChange={handleChange}
                          placeholder="Your company name"
                          className="w-full h-10 pl-10 pr-3 rounded-lg border border-slate-200 text-sm text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-[#0245EF] focus:border-transparent"
                        />
                      </div>
                    </div>

                    {/* Subject */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">
                        Subject
                        <span className="text-red-400 ml-0.5">*</span>
                      </label>
                      <input
                        type="text"
                        name="subject"
                        required
                        value={formData.subject}
                        onChange={handleChange}
                        placeholder="What can we help with?"
                        className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-[#0245EF] focus:border-transparent"
                      />
                    </div>

                    {/* Message */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">
                        Message
                        <span className="text-red-400 ml-0.5">*</span>
                      </label>
                      <textarea
                        name="message"
                        required
                        rows={5}
                        value={formData.message}
                        onChange={handleChange}
                        placeholder="Tell us more..."
                        className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-[#0245EF] focus:border-transparent resize-none"
                      />
                    </div>

                    {/* Error */}
                    {status === "error" && (
                      <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-lg">
                        Something went wrong. Please try again or email us at{" "}
                        <a
                          href="mailto:support@hirasys.in"
                          className="underline font-medium"
                        >
                          support@hirasys.in
                        </a>
                      </div>
                    )}

                    {/* Submit */}
                    <Button
                      type="submit"
                      disabled={status === "sending"}
                      className="w-full h-11 bg-[#0245EF] hover:bg-[#0237BF] text-base"
                    >
                      {status === "sending" ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4 mr-2" />
                          Send message
                        </>
                      )}
                    </Button>

                    <p className="text-xs text-slate-400 text-center">
                      We will respond within 24 hours. No spam, ever.
                    </p>
                  </form>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
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
              <Link href="/contact" className="hover:text-slate-600">
                Contact
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}