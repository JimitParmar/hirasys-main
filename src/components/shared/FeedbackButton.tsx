"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { MessageSquare, Send, X, Loader2 } from "lucide-react";
import toast from "react-hot-toast";

export function FeedbackButton() {
  const [open, setOpen] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [type, setType] = useState<"bug" | "feature" | "general">("general");
  const [sending, setSending] = useState(false);

  const submit = async () => {
    if (!feedback.trim()) return;
    setSending(true);

    try {
      await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          message: feedback,
          page: window.location.pathname,
          userAgent: navigator.userAgent,
        }),
      });
      toast.success("Thanks for the feedback! 🙏");
      setFeedback("");
      setOpen(false);
    } catch {
      toast.error("Failed to send feedback");
    } finally {
      setSending(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-4 right-4 z-50 bg-[#0245EF] text-white p-3 rounded-full shadow-lg hover:bg-[#0237BF] transition-all"
        title="Send Feedback"
      >
        <MessageSquare className="w-5 h-5" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-80 bg-white rounded-xl shadow-2xl border p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-sm text-slate-800">
          Send Feedback
        </h3>
        <button onClick={() => setOpen(false)}>
          <X className="w-4 h-4 text-slate-400" />
        </button>
      </div>

      <div className="flex gap-1 mb-3">
        {(["bug", "feature", "general"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setType(t)}
            className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
              type === t
                ? "bg-[#0245EF] text-white"
                : "bg-slate-100 text-slate-500 hover:bg-slate-200"
            }`}
          >
            {t === "bug" ? "🐛 Bug" : t === "feature" ? "💡 Feature" : "💬 General"}
          </button>
        ))}
      </div>

      <textarea
        value={feedback}
        onChange={(e) => setFeedback(e.target.value)}
        placeholder="What's on your mind?"
        className="w-full h-24 text-sm border rounded-lg p-2 resize-none focus:outline-none focus:ring-2 focus:ring-[#0245EF]/20 focus:border-[#0245EF]"
      />

      <Button
        onClick={submit}
        disabled={!feedback.trim() || sending}
        className="w-full mt-2 bg-[#0245EF]"
        size="sm"
      >
        {sending ? (
          <Loader2 className="w-4 h-4 animate-spin mr-1" />
        ) : (
          <Send className="w-4 h-4 mr-1" />
        )}
        Send
      </Button>
    </div>
  );
}