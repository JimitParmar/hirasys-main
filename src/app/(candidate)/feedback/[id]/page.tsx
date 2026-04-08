"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, Loader2, Heart, TrendingUp, BookOpen,
  Briefcase, Star, ExternalLink,
} from "lucide-react";
import Link from "next/link";

export default function FeedbackPage() {
  const { id } = useParams();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [feedback, setFeedback] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.push("/login");
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated) fetchFeedback();
  }, [isAuthenticated, id]);

  const fetchFeedback = async () => {
    try {
      const res = await fetch(`/api/feedback?applicationId=${id}`);
      const data = await res.json();
      setFeedback(data.feedback);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (!feedback) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <BookOpen className="w-12 h-12 text-slate-300 mb-4" />
        <p className="text-slate-500">No feedback available yet.</p>
        <Link href="/applications">
          <Button variant="outline" className="mt-4">Back to Applications</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center gap-3">
          <Link href="/applications">
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <span className="font-semibold text-slate-800">Your Feedback</span>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {/* Greeting */}
        <Card className="border-0 shadow-lg bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
          <CardContent className="p-6">
            <Heart className="w-8 h-8 mb-3 opacity-80" />
            <p className="text-lg font-medium">{feedback.greeting}</p>
            <p className="text-sm opacity-80 mt-2">
              We appreciate you taking the time to apply and go through our hiring process.
              Here&apos;s some personalized feedback to help you grow.
            </p>
          </CardContent>
        </Card>

        {/* Strengths */}
        {feedback.strengths?.length > 0 && (
          <Card>
            <CardContent className="p-6">
              <h3 className="font-semibold text-slate-800 flex items-center gap-2 mb-4">
                <Star className="w-5 h-5 text-amber-500" />
                Your Strengths
              </h3>
              <div className="space-y-3">
                {feedback.strengths.map((s: any, i: number) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 mt-2 shrink-0" />
                    <div>
                      <p className="font-medium text-slate-700">{s.area}</p>
                      <p className="text-sm text-slate-500">{s.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Skill Scores */}
        {feedback.skillScores?.length > 0 && (
          <Card>
            <CardContent className="p-6">
              <h3 className="font-semibold text-slate-800 flex items-center gap-2 mb-4">
                <TrendingUp className="w-5 h-5 text-indigo-500" />
                Skill Profile
              </h3>
              <div className="space-y-3">
                {feedback.skillScores.map((s: any, i: number) => (
                  <div key={i}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-600">{s.skill}</span>
                      <span className={`font-semibold ${
                        s.score >= 70 ? "text-emerald-600" :
                        s.score >= 40 ? "text-amber-600" : "text-red-500"
                      }`}>
                        {s.score >= 70 ? "Strong" : s.score >= 40 ? "Developing" : "Focus Area"}
                      </span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full">
                      <div
                        className={`h-full rounded-full transition-all ${
                          s.score >= 70 ? "bg-emerald-500" :
                          s.score >= 40 ? "bg-amber-500" : "bg-red-400"
                        }`}
                        style={{ width: `${s.score}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Improvements */}
        {feedback.improvements?.length > 0 && (
          <Card>
            <CardContent className="p-6">
              <h3 className="font-semibold text-slate-800 flex items-center gap-2 mb-4">
                <BookOpen className="w-5 h-5 text-blue-500" />
                Areas to Develop
              </h3>
              <div className="space-y-4">
                {feedback.improvements.map((imp: any, i: number) => (
                  <div key={i} className="bg-blue-50 rounded-lg p-4">
                    <p className="font-medium text-blue-800">{imp.area}</p>
                    <p className="text-sm text-blue-600 mt-1">{imp.tip}</p>
                    {imp.resources?.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {imp.resources.map((r: string, j: number) => (
                          <Badge key={j} variant="outline" className="text-xs bg-white text-blue-700 border-blue-200">
                            <ExternalLink className="w-3 h-3 mr-1" /> {r}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Encouragement */}
        {feedback.encouragement && (
          <Card className="border-emerald-200 bg-emerald-50">
            <CardContent className="p-6 text-center">
              <p className="text-emerald-700 font-medium">{feedback.encouragement}</p>
            </CardContent>
          </Card>
        )}

        {/* Recommended Roles */}
        {feedback.recommendedRoles?.length > 0 && (
          <Card>
            <CardContent className="p-6">
              <h3 className="font-semibold text-slate-800 flex items-center gap-2 mb-3">
                <Briefcase className="w-5 h-5 text-purple-500" />
                Roles You Might Be a Great Fit For
              </h3>
              <div className="flex flex-wrap gap-2">
                {feedback.recommendedRoles.map((role: string, i: number) => (
                  <Badge key={i} className="bg-purple-100 text-purple-700">{role}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="text-center pt-4">
          <Link href="/jobs">
            <Button className="bg-indigo-600 hover:bg-indigo-700">
              Browse More Jobs →
            </Button>
          </Link>
        </div>

        <p className="text-center text-xs text-slate-400 pb-8">
          This feedback is based on job requirements and is meant to help you grow.
          It does not compare you to other candidates.
        </p>
      </div>
    </div>
  );
}