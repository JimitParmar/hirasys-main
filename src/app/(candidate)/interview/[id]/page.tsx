"use client";

import React, { useEffect, useState, useRef } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Bot, User, Send, Loader2, Clock, CheckCircle,
  ArrowLeft,
} from "lucide-react";
import { formatRelativeTime, parseDBTimestamp } from "@/lib/utils";
import toast from "react-hot-toast";
import Link from "next/link";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export default function InterviewPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();

  const applicationId = searchParams.get("applicationId");
  const interviewType = (params.id as string) || "ai_technical_interview";

  const [interview, setInterview] = useState<any>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [questionsAsked, setQuestionsAsked] = useState(0);
  const [maxQuestions, setMaxQuestions] = useState(10);
  const [startTime, setStartTime] = useState(Date.now());

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isAuthenticated && applicationId) startInterview();
  }, [isAuthenticated, applicationId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const startInterview = async () => {
    try {
      const typeMap: Record<string, string> = {
        ai_technical_interview: "TECHNICAL",
        ai_behavioral_interview: "BEHAVIORAL",
      };

      const res = await fetch("/api/interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "start",
          applicationId,
          interviewType: typeMap[interviewType] || "TECHNICAL",
        }),
      });

      const data = await res.json();

      if (data.error === "Already completed") {
        setIsComplete(true);
        setInterview(data.interview);
        let msgs = data.interview?.messages || [];
        if (typeof msgs === "string") msgs = JSON.parse(msgs);
        setMessages(msgs);
        return;
      }

      if (data.interview) {
        setInterview(data.interview);
        let msgs = data.interview.messages || [];
        if (typeof msgs === "string") msgs = JSON.parse(msgs);
        setMessages(msgs);
        setMaxQuestions(data.interview.max_questions || 10);
        setQuestionsAsked(data.interview.questions_asked || 1);
        
        if (data.interview.status === "COMPLETED") {
          setIsComplete(true);
        }
                if (data.interview.started_at) {
          setStartTime(parseDBTimestamp(data.interview.started_at).getTime());
        }
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to start interview");
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || sending || isComplete) return;

    const userMessage = inputMessage.trim();
    setInputMessage("");
    setSending(true);

    const newUserMsg: Message = {
      role: "user",
      content: userMessage,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, newUserMsg]);

    try {
      const res = await fetch("/api/interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "message",
          interviewId: interview.id,
          message: userMessage,
        }),
      });

      const data = await res.json();

      if (data.messages) {
        let msgs = data.messages;
        if (typeof msgs === "string") msgs = JSON.parse(msgs);
        setMessages(msgs);
      }

      if (data.isComplete) {
        setIsComplete(true);
        toast.success("Interview complete! 🎉", { duration: 5000 });
      } else {
        setQuestionsAsked(data.questionsAsked || questionsAsked + 1);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to send message");
      setMessages((prev) => prev.filter((m) => m !== newUserMsg));
    } finally {
      setSending(false);
      textareaRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const elapsedMinutes = Math.floor((Date.now() - startTime) / 60000);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#0245EF] mx-auto mb-4" />
          <p className="text-slate-500">Preparing your interview...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-slate-50">
      {/* Header */}
      <div className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-3">
          <Link href="/applications">
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <Bot className="w-6 h-6 text-[#0245EF]" />
          <div>
            <h1 className="font-semibold text-sm text-slate-800">
              AI {interviewType.includes("behavioral") ? "Behavioral" : "Technical"} Interview
            </h1>
            <p className="text-[11px] text-slate-400">
              Question {Math.min(questionsAsked, maxQuestions)} of {maxQuestions}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2">
            <div className="w-32 h-2 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#0245EF] rounded-full transition-all duration-500"
                style={{ width: `${(questionsAsked / maxQuestions) * 100}%` }}
              />
            </div>
            <span className="text-xs text-slate-400">
              {Math.round((questionsAsked / maxQuestions) * 100)}%
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-sm text-slate-500 bg-slate-100 px-3 py-1 rounded-lg">
            <Clock className="w-4 h-4" />
            <span className="font-mono">{elapsedMinutes}m</span>
          </div>

          {isComplete && (
            <Badge className="bg-emerald-100 text-emerald-700">
              <CheckCircle className="w-3 h-3 mr-1" /> Complete
            </Badge>
          )}
        </div>
      </div>

      {/* Chat Area */}
      <ScrollArea className="flex-1">
        <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
          {/* Welcome card */}
          {messages.length <= 1 && !isComplete && (
            <div className="bg-[#EBF0FF] border border-[#D1DEFF] rounded-xl p-4 text-center">
              <Bot className="w-10 h-10 text-[#0245EF] mx-auto mb-2" />
              <h2 className="font-semibold text-[#011B5F]">AI Interview</h2>
              <p className="text-sm text-[#0245EF] mt-1">
                Answer each question thoughtfully. Take your time — there&apos;s no rush.
                Press Enter to send, Shift+Enter for new line.
              </p>
            </div>
          )}

          {/* Messages */}
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
            >
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                  msg.role === "assistant" ? "bg-[#D1DEFF]" : "bg-emerald-100"
                }`}
              >
                {msg.role === "assistant" ? (
                  <Bot className="w-5 h-5 text-[#0245EF]" />
                ) : (
                  <User className="w-5 h-5 text-emerald-600" />
                )}
              </div>

              <div className={`max-w-[75%] ${msg.role === "user" ? "text-right" : ""}`}>
                <div
                  className={`inline-block rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    msg.role === "assistant"
                      ? "bg-white border border-slate-200 text-slate-700 rounded-tl-md"
                      : "bg-[#0245EF] text-white rounded-tr-md"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                </div>
                <p className="text-[10px] text-slate-400 mt-1 px-1">
                  {msg.role === "assistant" ? "AI Interviewer" : "You"}
                  {msg.timestamp && ` • ${formatRelativeTime(msg.timestamp)}`}
                </p>
              </div>
            </div>
          ))}

          {/* Typing indicator */}
          {sending && (
            <div className="flex gap-3">
              <div className="w-9 h-9 rounded-full bg-[#D1DEFF] flex items-center justify-center">
                <Bot className="w-5 h-5 text-[#0245EF]" />
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-md px-4 py-3">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}

          {/* Interview Complete — Single card, no duplicates */}
          {isComplete && (
            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-[#A3BDFF] rounded-xl p-6 text-center space-y-4">
              <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto" />
              <div>
                <h3 className="font-bold text-lg text-slate-800">
                  Interview Complete! 🎉
                </h3>
                <p className="text-sm text-slate-500 mt-2 max-w-md mx-auto">
                  Thank you for taking the time to complete this interview.
                  Your responses have been recorded and will be reviewed by the hiring team.
                </p>
                <p className="text-xs text-slate-400 mt-3">
                  You&apos;ll be notified about next steps through your application tracker.
                </p>
              </div>

              <div className="bg-white rounded-lg p-4 border border-[#D1DEFF] max-w-sm mx-auto">
                <div className="flex items-center justify-center gap-6 text-sm">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-[#0245EF]">
                      {messages.filter((m) => m.role === "user").length}
                    </p>
                    <p className="text-xs text-slate-400">Questions Answered</p>
                  </div>
                  <div className="w-px h-10 bg-slate-200" />
                  <div className="text-center">
                    <p className="text-2xl font-bold text-[#0245EF]">
                      {Math.round((Date.now() - startTime) / 60000)}
                    </p>
                    <p className="text-xs text-slate-400">Minutes</p>
                  </div>
                </div>
              </div>

              <Button
                onClick={() => router.push("/applications")}
                className="bg-[#0245EF] hover:bg-[#0237BF]"
              >
                Back to Applications
              </Button>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Input Area — only show when interview is active */}
      {!isComplete && (
        <div className="border-t border-slate-200 bg-white p-4">
          <div className="max-w-3xl mx-auto flex gap-3">
            <Textarea
              ref={textareaRef}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your answer... (Enter to send, Shift+Enter for new line)"
              disabled={sending}
              rows={2}
              className="flex-1 resize-none text-sm min-h-[44px] max-h-[120px]"
              autoFocus
            />
            <Button
              onClick={sendMessage}
              disabled={sending || !inputMessage.trim()}
              className="bg-[#0245EF] hover:bg-[#0237BF] h-auto px-4"
            >
              {sending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </Button>
          </div>
          <p className="text-center text-[10px] text-slate-400 mt-2">
            Question {Math.min(questionsAsked, maxQuestions)} of {maxQuestions} •
            Take your time to answer thoughtfully
          </p>
        </div>
      )}
    </div>
  );
}