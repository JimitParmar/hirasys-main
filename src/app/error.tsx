"use client";

import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-red-50 to-white flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <AlertTriangle className="w-10 h-10 text-red-400" />
        </div>

        <h2 className="text-xl font-semibold text-slate-800 mb-3">Something went wrong</h2>
        <p className="text-slate-500 mb-6">
          {error.message || "An unexpected error occurred. Please try again."}
        </p>

        <div className="flex items-center justify-center gap-3">
          <Button onClick={reset} className="bg-[#0245EF] hover:bg-[#0237BF]">
            <RefreshCw className="w-4 h-4 mr-2" /> Try Again
          </Button>
          <Link href="/">
            <Button variant="outline">
              <Home className="w-4 h-4 mr-2" /> Go Home
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}