import Link from "next/link";
import { Briefcase, ArrowLeft, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 bg-[#D1DEFF] rounded-full flex items-center justify-center mx-auto mb-6">
          <Briefcase className="w-10 h-10 text-[#4775FF]" />
        </div>

        <h1 className="text-6xl font-bold text-[#0245EF] mb-2">404</h1>
        <h2 className="text-xl font-semibold text-slate-800 mb-3">Page not found</h2>
        <p className="text-slate-500 mb-8">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>

        <div className="flex items-center justify-center gap-3">
          <Link href="/">
            <Button className="bg-[#0245EF] hover:bg-[#0237BF]">
              <Home className="w-4 h-4 mr-2" /> Go Home
            </Button>
          </Link>
          <Link href="/jobs">
            <Button variant="outline">
              Browse Jobs
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}