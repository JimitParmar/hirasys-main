"use client";

import React from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { NotificationBell } from "./NotificationBell";
import { Logo } from "./Logo";
import {
  Briefcase, LogOut, LayoutDashboard, GitBranch,
  PlusCircle, Search, User, FileText, Globe, Users
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function AppHeader() {
  const { user, isAuthenticated, isHR, isCandidate, logout, isLoading } = useAuth();
  const pathname = usePathname();

  if (isLoading || !isAuthenticated) return null;

  // Don't show on pipeline builder (it has its own header)
  if (pathname === "/pipeline") return null;
  // Don't show on assessment/interview pages
  if (pathname.startsWith("/assessment/") || pathname.startsWith("/interview/")) return null;
  // Don't show on landing
  if (pathname === "/landing") return null;

  const isActive = (path: string) => pathname === path || pathname.startsWith(path + "/");

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="h-14 flex items-center justify-between">
          {/* Logo + Nav */}
          <div className="flex items-center gap-6">
            <Logo size="md" showText={true} linkTo={isHR ? "/hr/dashboard" : "/jobs"} />

            <nav className="flex items-center gap-1">
              {isHR ? (
                <>
                  <NavLink href="/hr/dashboard" icon={LayoutDashboard} label="Dashboard" active={isActive("/hr/dashboard")} />
                  <NavLink href="/hr/jobs/new" icon={PlusCircle} label="Post Job" active={isActive("/hr/jobs/new")} />
                  <NavLink href="/pipeline" icon={GitBranch} label="Pipelines" active={isActive("/pipeline")} />
                  <NavLink href="/hr/integrations" icon={Globe} label="Integrations" active={isActive("/hr/integrations")} />
                  <NavLink href="/hr/team" icon={Users} label="Team" active={isActive("/hr/team")} />
                </>
              ) : (
                <>
                  <NavLink href="/jobs" icon={Search} label="Jobs" active={isActive("/jobs")} />
                  <NavLink href="/applications" icon={FileText} label="Applications" active={isActive("/applications")} />
                  <NavLink href="/profile" icon={User} label="Profile" active={isActive("/profile")} />
                </>
              )}
            </nav>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2">
            <NotificationBell />

            <div className="hidden sm:flex items-center gap-2 ml-2 pl-2 border-l border-slate-200">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#4775FF] to-purple-500 flex items-center justify-center">
                <span className="text-xs font-bold text-white">
                  {user?.firstName?.[0]}{user?.lastName?.[0]}
                </span>
              </div>
              <div className="hidden md:block">
                <p className="text-sm font-medium text-slate-700 leading-none">
                  {user?.firstName}
                </p>
                <p className="text-[10px] text-slate-400 leading-none mt-0.5">
                  {isHR ? user?.company || "HR" : "Candidate"}
                </p>
              </div>
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={logout}
              className="h-8 w-8 text-slate-400 hover:text-red-500"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}

function NavLink({
  href, icon: Icon, label, active,
}: {
  href: string; icon: React.ElementType; label: string; active: boolean;
}) {
  return (
    <Link href={href}>
      <Button
        variant="ghost"
        size="sm"
        className={`h-9 gap-1.5 text-sm font-medium transition-colors ${
          active
            ? "text-[#0245EF] bg-[#EBF0FF] hover:bg-[#EBF0FF]"
            : "text-slate-500 hover:text-slate-800"
        }`}
      >
        <Icon className="w-4 h-4" />
        <span className="hidden sm:inline">{label}</span>
      </Button>
    </Link>
  );
}