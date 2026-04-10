"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { NotificationBell } from "@/components/shared/NotificationBell";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Briefcase, MapPin, Clock, DollarSign, Search, Building2,
  ChevronRight, Users, Loader2, LogOut, Bell, User,
  SlidersHorizontal, X,
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import Link from "next/link";

interface Job {
  id: string;
  title: string;
  description: string;
  department: string;
  location: string;
  type: string;
  experienceMin: number;
  experienceMax: number;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string;
  skills: string[];
  requirements: string[];
  createdAt: string;
  poster: { firstName: string; lastName: string; company: string | null };
  _count: { applications: number };
}

const typeLabels: Record<string, string> = {
  full_time: "Full Time",
  part_time: "Part Time",
  contract: "Contract",
  internship: "Internship",
};

const typeColors: Record<string, string> = {
  full_time: "bg-blue-100 text-blue-700",
  part_time: "bg-purple-100 text-purple-700",
  contract: "bg-orange-100 text-orange-700",
  internship: "bg-green-100 text-green-700",
};

export default function JobsPage() {
  const { user, isAuthenticated, isLoading: authLoading, logout } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [total, setTotal] = useState(0);

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async (query?: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (query) params.set("search", query);
      const res = await fetch(`/api/jobs?${params}`);
      const data = await res.json();
      setJobs(data.jobs || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error("Failed to fetch jobs:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchJobs(search);
  };

  const filteredJobs = typeFilter === "all"
    ? jobs
    : jobs.filter((j) => j.type === typeFilter);

  const departments = [...new Set(jobs.map((j) => j.department))];

  return (
    <div className="min-h-screen bg-slate-50">
      

      {/* Hero + Search */}
      <div className="bg-gradient-to-br from-[#0245EF] via-[#02298F] to-[#3B26A3] text-white">
        <div className="max-w-6xl mx-auto px-4 py-16 text-center">
          <h1 className="text-4xl font-bold mb-3">
            Find Your Next Opportunity
          </h1>
          <p className="text-[#A3BDFF] mb-8 text-lg max-w-2xl mx-auto">
            {total} open positions • AI-powered matching • Personalized feedback on every application
          </p>

          <form onSubmit={handleSearch} className="max-w-2xl mx-auto">
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by title, skill, company, or keyword..."
                  className="h-12 pl-12 bg-white text-slate-800 border-0 text-base shadow-lg"
                />
              </div>
              <Button
                type="submit"
                size="lg"
                className="h-12 px-8 bg-white text-[#0245EF] hover:bg-[#EBF0FF] shadow-lg font-semibold"
              >
                Search
              </Button>
            </div>
          </form>

          {/* Quick filters */}
          <div className="flex items-center justify-center gap-2 mt-6 flex-wrap">
            {["all", "full_time", "part_time", "contract", "internship"].map((t) => (
              <Button
                key={t}
                variant="ghost"
                size="sm"
                onClick={() => setTypeFilter(t)}
                className={`rounded-full text-xs ${
                  typeFilter === t
                    ? "bg-white/20 text-white"
                    : "text-[#A3BDFF] hover:bg-white/10 hover:text-white"
                }`}
              >
                {t === "all" ? "All Jobs" : typeLabels[t]}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Job Listings */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-[#0245EF]" />
          </div>
        ) : filteredJobs.length === 0 ? (
          <div className="text-center py-20">
            <Briefcase className="w-16 h-16 text-slate-200 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-slate-600">No jobs found</h3>
            <p className="text-slate-400 mt-2">
              {search ? "Try a different search term" : "Check back later for new opportunities"}
            </p>
            {search && (
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => { setSearch(""); fetchJobs(); }}
              >
                <X className="w-4 h-4 mr-2" /> Clear search
              </Button>
            )}
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-6">
              <p className="text-sm text-slate-500">
                Showing <span className="font-semibold text-slate-700">{filteredJobs.length}</span> jobs
              </p>

              {departments.length > 1 && (
                <div className="flex gap-2 flex-wrap">
                  {departments.slice(0, 5).map((dept) => (
                    <Badge
                      key={dept}
                      variant="outline"
                      className="cursor-pointer hover:bg-[#EBF0FF]"
                      onClick={() => fetchJobs(dept)}
                    >
                      {dept}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-4">
              {filteredJobs.map((job) => (
                <Link key={job.id} href={`/jobs/${job.id}`}>
                  <Card className="hover:shadow-lg transition-all duration-300 hover:border-[#A3BDFF] cursor-pointer group mb-4">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          {/* Title row */}
                          <div className="flex items-center gap-3 mb-2 flex-wrap">
                            <h2 className="text-lg font-semibold text-slate-800 group-hover:text-[#0245EF] transition-colors">
                              {job.title}
                            </h2>
                            <Badge className={`shrink-0 ${typeColors[job.type] || "bg-slate-100 text-slate-700"}`}>
                              {typeLabels[job.type] || job.type}
                            </Badge>
                          </div>

                          {/* Meta row */}
                          <div className="flex items-center gap-4 text-sm text-slate-500 mb-3 flex-wrap">
                            <span className="flex items-center gap-1.5">
                              <Building2 className="w-4 h-4 text-slate-400" />
                              {job.poster?.company || "Company"}
                            </span>
                            <span className="flex items-center gap-1.5">
                              <MapPin className="w-4 h-4 text-slate-400" />
                              {job.location}
                            </span>
                            <span className="flex items-center gap-1.5">
                              <Clock className="w-4 h-4 text-slate-400" />
                              {job.experienceMin}-{job.experienceMax} yrs
                            </span>
                            {job.salaryMin && (
                              <span className="flex items-center gap-1.5">
                                <DollarSign className="w-4 h-4 text-slate-400" />
                                {job.salaryCurrency} {(job.salaryMin / 1000).toFixed(0)}K
                                {job.salaryMax && `–${(job.salaryMax / 1000).toFixed(0)}K`}
                              </span>
                            )}
                          </div>

                          {/* Description preview */}
                          <p className="text-sm text-slate-500 line-clamp-2 mb-3">
                            {job.description}
                          </p>

                          {/* Skills */}
                          {job.skills?.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                              {job.skills.slice(0, 6).map((skill) => (
                                <Badge
                                  key={skill}
                                  variant="outline"
                                  className="text-xs bg-[#EBF0FF] text-[#0245EF] border-[#A3BDFF]"
                                >
                                  {skill}
                                </Badge>
                              ))}
                              {job.skills.length > 6 && (
                                <Badge variant="outline" className="text-xs text-slate-400">
                                  +{job.skills.length - 6}
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Right side */}
                        <div className="flex flex-col items-end gap-2 shrink-0">
                          <div className="flex items-center gap-1 text-xs text-slate-400">
                            <Users className="w-3 h-3" />
                            {job._count?.applications || 0} applied
                          </div>
                          <div className="text-xs text-slate-400">
                            {formatDate(job.createdAt)}
                          </div>
                          <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-[#0245EF] transition-colors mt-4" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white mt-12">
        <div className="max-w-6xl mx-auto px-4 py-8 text-center">
          <p className="text-sm text-slate-400">
            Hirasys — Hiring, Intelligently Assisted • Every rejection comes with a roadmap
          </p>
        </div>
      </footer>
    </div>
  );
}