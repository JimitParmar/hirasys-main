"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  ArrowLeft, Users, UserPlus, Loader2, Mail, Shield, ShieldCheck,
  Eye, MoreVertical, Copy, CheckCircle, XCircle, Clock, Send,
  Building2, Crown, Briefcase, AlertTriangle,
} from "lucide-react";
import { formatRelativeTime, formatDateTime } from "@/lib/utils";
import toast from "react-hot-toast";
import Link from "next/link";
import { UpgradePrompt } from "@/components/shared/UpgradePrompt";
import { usePlanLimits } from "@/hooks/usePlanLimits";

const ROLE_CONFIG: Record<string, { label: string; color: string; icon: any; description: string }> = {
  ADMIN: {
    label: "Admin",
    color: "bg-purple-100 text-purple-700 border-purple-200",
    icon: Crown,
    description: "Full access — manage team, settings, billing, and everything",
  },
  HR: {
    label: "HR / Recruiter",
    color: "bg-[#EBF0FF] text-[#0245EF] border-[#A3BDFF]",
    icon: Briefcase,
    description: "Post jobs, manage candidates, build pipelines, schedule interviews",
  },
  INTERVIEWER: {
    label: "Interviewer",
    color: "bg-emerald-100 text-emerald-700 border-emerald-200",
    icon: Eye,
    description: "View assigned interviews, submit feedback",
  },
};

export default function TeamPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [company, setCompany] = useState<any>(null);
  const [team, setTeam] = useState<any[]>([]);
  const [pendingInvites, setPendingInvites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [updating, setUpdating] = useState<string | null>(null);

  // Invite form
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("HR");
  const [inviting, setInviting] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const isAdmin = (user as any)?.role === "ADMIN";
  const { hasFeature, planName } = usePlanLimits();

if (!hasFeature("auditLogs")) {
  return (
    <UpgradePrompt
      feature="Audit Logs"
      message="Audit logs are available on the Enterprise plan."
      currentPlan={planName}
    />
  );
}
  useEffect(() => {
    if (!authLoading) {
      if (!user || !["ADMIN", "HR"].includes((user as any)?.role)) {
        router.push("/login");
      } else {
        fetchTeam();
      }
    }
  }, [authLoading, user]);

  const fetchTeam = async () => {
    try {
      const res = await fetch("/api/company");
      const data = await res.json();
      setCompany(data.company);
      setTeam(data.team || []);
      setPendingInvites(data.pendingInvites || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim()) {
      toast.error("Email is required");
      return;
    }

    setInviting(true);
    setInviteLink(null);
    try {
      const res = await fetch("/api/company/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setInviteLink(data.inviteUrl);
      toast.success(`Invitation created for ${inviteEmail}`);
      fetchTeam();
    } catch (err: any) {
      toast.error(err.message || "Failed to invite");
    } finally {
      setInviting(false);
    }
  };

  const updateMember = async (memberId: string, action: string, role?: string) => {
    setUpdating(memberId);
    try {
      const res = await fetch("/api/company/members", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId, action, role }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success(data.message);
      fetchTeam();
    } catch (err: any) {
      toast.error(err.message || "Failed to update");
    } finally {
      setUpdating(null);
    }
  };

  const revokeInvite = async (invitationId: string) => {
    try {
      const res = await fetch("/api/company/invite", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invitationId }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("Invitation revoked");
      fetchTeam();
    } catch {
      toast.error("Failed to revoke");
    }
  };

  const copyInviteLink = (link: string) => {
    navigator.clipboard.writeText(link);
    setCopied(true);
    toast.success("Link copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#0245EF]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Sub-header */}
      <div className="bg-white border-b border-slate-200 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto h-12 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/hr/dashboard">
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <Users className="w-5 h-5 text-[#0245EF]" />
            <span className="text-sm font-semibold text-slate-800">Team Management</span>
          </div>

          {isAdmin && (
            <Button
              size="sm"
              className="bg-[#0245EF] hover:bg-[#0237BF]"
              onClick={() => {
                setShowInviteDialog(true);
                setInviteEmail("");
                setInviteRole("HR");
                setInviteLink(null);
              }}
            >
              <UserPlus className="w-4 h-4 mr-2" /> Invite Member
            </Button>
          )}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Company info */}
        {company && (
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 bg-[#EBF0FF] rounded-xl flex items-center justify-center">
                <Building2 className="w-6 h-6 text-[#0245EF]" />
              </div>
              <div>
                <h2 className="font-semibold text-slate-800">{company.name}</h2>
                <p className="text-xs text-slate-400">
                  {team.length} team member{team.length !== 1 ? "s" : ""} •
                  {" "}{team.filter((m: any) => m.is_active).length} active •
                  {" "}{pendingInvites.length} pending invite{pendingInvites.length !== 1 ? "s" : ""}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {!company && (
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="p-4 flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              <div>
                <p className="text-sm font-medium text-amber-800">No company account</p>
                <p className="text-xs text-amber-600">
                  Create a company to start inviting team members.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Role Legend */}
        <div className="grid grid-cols-3 gap-3">
          {Object.entries(ROLE_CONFIG).map(([role, config]) => {
            const Icon = config.icon;
            const count = team.filter((m: any) => m.role === role).length;
            return (
              <div key={role} className="bg-white rounded-lg border border-slate-200 p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Icon className="w-4 h-4 text-slate-500" />
                  <span className="text-sm font-medium text-slate-700">{config.label}</span>
                  <Badge variant="outline" className="text-[10px] ml-auto">{count}</Badge>
                </div>
                <p className="text-[10px] text-slate-400">{config.description}</p>
              </div>
            );
          })}
        </div>

        {/* Team Members */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Team Members</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {team.length === 0 ? (
              <div className="p-8 text-center">
                <Users className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                <p className="text-sm text-slate-500">No team members yet</p>
                {isAdmin && (
                  <Button size="sm" className="mt-3 bg-[#0245EF]" onClick={() => setShowInviteDialog(true)}>
                    <UserPlus className="w-4 h-4 mr-1" /> Invite First Member
                  </Button>
                )}
              </div>
            ) : (
              <div className="divide-y">
                {team.map((member: any) => {
                  const roleConfig = ROLE_CONFIG[member.role] || ROLE_CONFIG.HR;
                  const RoleIcon = roleConfig.icon;
                  const isCurrentUser = member.id === (user as any)?.id;
                  const isBeingUpdated = updating === member.id;

                  return (
                    <div
                      key={member.id}
                      className={`flex items-center justify-between p-4 ${
                        !member.is_active ? "opacity-50 bg-slate-50" : ""
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#0245EF] to-[#5B3FE6] flex items-center justify-center">
                          <span className="text-sm font-bold text-white">
                            {member.first_name?.[0]}{member.last_name?.[0]}
                          </span>
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-slate-800">
                              {member.first_name} {member.last_name}
                              {isCurrentUser && (
                                <span className="text-xs text-slate-400 ml-1">(you)</span>
                              )}
                            </p>
                            {!member.is_active && (
                              <Badge variant="outline" className="text-[10px] text-red-500 border-red-200">
                                Deactivated
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-slate-400 flex items-center gap-1">
                            <Mail className="w-3 h-3" /> {member.email}
                          </p>
                          <p className="text-[10px] text-slate-300 mt-0.5">
                            {member.last_login_at
                              ? `Last active ${formatRelativeTime(member.last_login_at)}`
                              : "Never logged in"
                            }
                            {member.invited_by && " • Invited"}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className={`text-xs ${roleConfig.color}`}>
                          <RoleIcon className="w-3 h-3 mr-1" />
                          {roleConfig.label}
                        </Badge>

                        {isAdmin && !isCurrentUser && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8" disabled={isBeingUpdated}>
                                {isBeingUpdated ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <MoreVertical className="w-4 h-4" />
                                )}
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuItem
                                onClick={() => updateMember(member.id, "change_role", "ADMIN")}
                                disabled={member.role === "ADMIN"}
                              >
                                <Crown className="w-4 h-4 mr-2" /> Make Admin
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => updateMember(member.id, "change_role", "HR")}
                                disabled={member.role === "HR"}
                              >
                                <Briefcase className="w-4 h-4 mr-2" /> Make HR
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => updateMember(member.id, "change_role", "INTERVIEWER")}
                                disabled={member.role === "INTERVIEWER"}
                              >
                                <Eye className="w-4 h-4 mr-2" /> Make Interviewer
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              {member.is_active ? (
                                <DropdownMenuItem
                                  onClick={() => updateMember(member.id, "deactivate")}
                                  className="text-red-600"
                                >
                                  <XCircle className="w-4 h-4 mr-2" /> Deactivate
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem
                                  onClick={() => updateMember(member.id, "activate")}
                                  className="text-emerald-600"
                                >
                                  <CheckCircle className="w-4 h-4 mr-2" /> Activate
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pending Invitations */}
        {pendingInvites.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-500" />
                Pending Invitations
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {pendingInvites.map((invite: any) => {
                  const roleConfig = ROLE_CONFIG[invite.role] || ROLE_CONFIG.HR;
                  const inviteUrl = `${window.location.origin}/invite/${invite.token}`;

                  return (
                    <div key={invite.id} className="flex items-center justify-between p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                          <Mail className="w-5 h-5 text-amber-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-700">{invite.email}</p>
                          <p className="text-[10px] text-slate-400">
                            Invited {formatRelativeTime(invite.created_at)} •
                            Expires {formatRelativeTime(invite.expires_at)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={`text-xs ${roleConfig.color}`}>
                          {roleConfig.label}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs h-7"
                          onClick={() => copyInviteLink(inviteUrl)}
                        >
                          <Copy className="w-3 h-3 mr-1" /> Copy Link
                        </Button>
                        {isAdmin && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs h-7 text-red-500 hover:text-red-600 hover:bg-red-50"
                            onClick={() => revokeInvite(invite.id)}
                          >
                            <XCircle className="w-3 h-3 mr-1" /> Revoke
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Audit Log Link */}
        {isAdmin && (
          <Card className="border-slate-200">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <ShieldCheck className="w-5 h-5 text-[#0245EF]" />
                <div>
                  <p className="text-sm font-medium text-slate-700">Audit Log</p>
                  <p className="text-xs text-slate-400">View all changes made by team members</p>
                </div>
              </div>
              <Link href="/hr/audit">
                <Button variant="outline" size="sm">View Logs →</Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Invite Dialog */}
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-[#0245EF]" />
              Invite Team Member
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {!inviteLink ? (
              <>
                <div className="space-y-2">
                  <Label className="text-sm">Email Address</Label>
                  <Input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="colleague@company.com"
                    className="h-10"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm">Role</Label>
                  <div className="space-y-2">
                    {Object.entries(ROLE_CONFIG)
                      .filter(([role]) => {
                        if ((user as any)?.role === "ADMIN") return true;
                        return role === "INTERVIEWER";
                      })
                      .map(([role, config]) => {
                        const Icon = config.icon;
                        return (
                          <button
                            key={role}
                            type="button"
                            onClick={() => setInviteRole(role)}
                            className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 text-left transition-all ${
                              inviteRole === role
                                ? "border-[#0245EF] bg-[#EBF0FF]"
                                : "border-slate-200 hover:border-slate-300"
                            }`}
                          >
                            <Icon className={`w-5 h-5 ${inviteRole === role ? "text-[#0245EF]" : "text-slate-400"}`} />
                            <div>
                              <p className={`text-sm font-medium ${inviteRole === role ? "text-[#0245EF]" : "text-slate-700"}`}>
                                {config.label}
                              </p>
                              <p className="text-[10px] text-slate-400">{config.description}</p>
                            </div>
                          </button>
                        );
                      })}
                  </div>
                </div>
              </>
            ) : (
              <div className="space-y-4">
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 text-center">
                  <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                  <p className="text-sm font-medium text-emerald-800">Invitation Created!</p>
                  <p className="text-xs text-emerald-600 mt-1">
                    Share this link with <strong>{inviteEmail}</strong>
                  </p>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm">Invite Link</Label>
                  <div className="flex gap-2">
                    <Input
                      readOnly
                      value={inviteLink}
                      className="h-9 text-xs font-mono bg-slate-50"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      className="shrink-0 h-9"
                      onClick={() => copyInviteLink(inviteLink)}
                    >
                      {copied ? (
                        <CheckCircle className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                  <p className="text-[10px] text-slate-400">
                    Link expires in 7 days. They&apos;ll set their password when they accept.
                  </p>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            {!inviteLink ? (
              <>
                <Button variant="outline" onClick={() => setShowInviteDialog(false)}>Cancel</Button>
                <Button
                  onClick={handleInvite}
                  disabled={inviting || !inviteEmail.trim()}
                  className="bg-[#0245EF] hover:bg-[#0237BF]"
                >
                  {inviting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
                  Send Invite
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={() => {
                    setInviteLink(null);
                    setInviteEmail("");
                  }}
                >
                  Invite Another
                </Button>
                <Button onClick={() => setShowInviteDialog(false)} className="bg-[#0245EF] hover:bg-[#0237BF]">
                  Done
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}