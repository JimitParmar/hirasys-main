"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Calendar, Loader2, Video, UserPlus, X, Users, Mail, Trash2, Save,
} from "lucide-react";
import toast from "react-hot-toast";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  interview: any;
  onUpdated: () => void;
}

interface Interviewer {
  id?: string;
  name: string;
  email: string;
  role: string;
  isExternal: boolean;
}

export function EditF2FDialog({ open, onOpenChange, interview, onUpdated }: Props) {
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [duration, setDuration] = useState("60");
  const [meetingLink, setMeetingLink] = useState("");
  const [interviewType, setInterviewType] = useState("technical");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const [interviewers, setInterviewers] = useState<Interviewer[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState("Tech Lead");
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [selectedTeamMember, setSelectedTeamMember] = useState("none");

  // Load interview data
  useEffect(() => {
    if (interview && open) {
      const d = new Date(interview.scheduled_at);
      setDate(d.toISOString().split("T")[0]);
      setTime(d.toTimeString().substring(0, 5));
      setDuration(String(interview.duration || 60));
      setMeetingLink(interview.meeting_link || "");
      setInterviewType(interview.interview_type || "technical");
      setNotes(interview.notes || "");

      let metadata = interview.metadata || {};
      try {
        if (typeof metadata === "string") metadata = JSON.parse(metadata);
      } catch { metadata = {}; }

      setInterviewers(metadata.interviewers || []);
      fetchTeamMembers();
    }
  }, [interview, open]);

  const fetchTeamMembers = async () => {
    try {
      const res = await fetch("/api/team");
      const data = await res.json();
      setTeamMembers(data.members || []);
    } catch {}
  };

  const addTeamMember = () => {
    if (selectedTeamMember === "none") return;
    const member = teamMembers.find((m) => m.id === selectedTeamMember);
    if (!member || interviewers.some((i) => i.id === member.id)) return;

    setInterviewers([...interviewers, {
      id: member.id,
      name: `${member.first_name} ${member.last_name}`,
      email: member.email,
      role: member.department || member.role,
      isExternal: false,
    }]);
    setSelectedTeamMember("none");
  };

  const addExternalPerson = () => {
    if (!newName.trim() || !newEmail.trim()) {
      toast.error("Name and email required");
      return;
    }
    if (interviewers.some((i) => i.email === newEmail.trim())) {
      toast.error("Already added");
      return;
    }
    setInterviewers([...interviewers, {
      name: newName.trim(), email: newEmail.trim(),
      role: newRole.trim() || "Interviewer", isExternal: true,
    }]);
    setNewName(""); setNewEmail(""); setNewRole("Tech Lead"); setShowAddForm(false);
  };

  const handleSave = async () => {
    if (!date || interviewers.length === 0) {
      toast.error("Date and at least one interviewer required");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/f2f", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "edit",
          interviewId: interview.id,
          scheduledAt: new Date(`${date}T${time || "10:00"}`).toISOString(),
          duration: parseInt(duration),
          meetingLink: meetingLink || null,
          interviewType,
          notes: notes || null,
          interviewers,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success("Interview updated! ✅");
      onOpenChange(false);
      onUpdated();
    } catch (err: any) {
      toast.error(err.message || "Failed to update");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = async () => {
    setCancelling(true);
    try {
      const res = await fetch("/api/f2f", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "cancel",
          interviewId: interview.id,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success("Interview cancelled");
      setShowCancelConfirm(false);
      onOpenChange(false);
      onUpdated();
    } catch (err: any) {
      toast.error(err.message || "Failed to cancel");
    } finally {
      setCancelling(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-[#0245EF]" />
              Edit Interview
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Date & Time */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-sm">Date *</Label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-9" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Time *</Label>
                <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="h-9" />
              </div>
            </div>

            {/* Duration & Type */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-sm">Duration</Label>
                <Select value={duration} onValueChange={setDuration}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">30 min</SelectItem>
                    <SelectItem value="45">45 min</SelectItem>
                    <SelectItem value="60">60 min</SelectItem>
                    <SelectItem value="90">90 min</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Type</Label>
                <Select value={interviewType} onValueChange={setInterviewType}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="technical">Technical</SelectItem>
                    <SelectItem value="behavioral">Behavioral</SelectItem>
                    <SelectItem value="hiring_manager">Hiring Manager</SelectItem>
                    <SelectItem value="culture_fit">Culture Fit</SelectItem>
                    <SelectItem value="panel">Panel</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Meeting Link */}
            <div className="space-y-2">
              <Label className="text-sm"><Video className="w-4 h-4 inline mr-1" />Meeting Link</Label>
              <Input value={meetingLink} onChange={(e) => setMeetingLink(e.target.value)} placeholder="https://meet.google.com/..." className="h-9" />
            </div>

            {/* Interviewers */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold flex items-center gap-2">
                <Users className="w-4 h-4 text-[#0245EF]" /> Interviewers
              </Label>

              {interviewers.map((person, i) => (
                <div key={i} className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-[#D1DEFF] flex items-center justify-center">
                      <span className="text-[10px] font-semibold text-[#0245EF]">
                        {person.name.split(" ").map((n) => n[0]).join("").substring(0, 2)}
                      </span>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-700">{person.name}</p>
                      <p className="text-[10px] text-slate-400">{person.email} • {person.role}</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setInterviewers(interviewers.filter((_, idx) => idx !== i))}>
                    <X className="w-3 h-3 text-slate-400" />
                  </Button>
                </div>
              ))}

              {/* Add from team */}
              <div className="flex gap-2">
                <Select value={selectedTeamMember} onValueChange={setSelectedTeamMember}>
                  <SelectTrigger className="h-8 flex-1 text-xs"><SelectValue placeholder="Add team member..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none" disabled>Select...</SelectItem>
                    {teamMembers.map((m) => (
                      <SelectItem key={m.id} value={m.id} disabled={interviewers.some((i) => i.id === m.id)}>
                        {m.first_name} {m.last_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="outline" size="sm" className="h-8" onClick={addTeamMember} disabled={selectedTeamMember === "none"}>
                  <UserPlus className="w-3 h-3" />
                </Button>
              </div>

              {!showAddForm ? (
                <Button variant="ghost" size="sm" className="text-xs text-[#0245EF]" onClick={() => setShowAddForm(true)}>
                  <UserPlus className="w-3 h-3 mr-1" /> Add external person
                </Button>
              ) : (
                <div className="bg-slate-50 rounded-lg p-3 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Name" className="h-8 text-xs" />
                    <Input value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="Email" className="h-8 text-xs" />
                  </div>
                  <Input value={newRole} onChange={(e) => setNewRole(e.target.value)} placeholder="Role" className="h-8 text-xs" />
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => setShowAddForm(false)}>Cancel</Button>
                    <Button size="sm" className="text-xs h-7 bg-[#0245EF]" onClick={addExternalPerson}>Add</Button>
                  </div>
                </div>
              )}
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label className="text-sm">Notes</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Agenda, areas to evaluate..." rows={2} className="text-sm" />
            </div>
          </div>

          <DialogFooter className="flex justify-between sm:justify-between">
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowCancelConfirm(true)}
            >
              <Trash2 className="w-4 h-4 mr-1" /> Cancel Interview
            </Button>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
              <Button
                onClick={handleSave}
                disabled={saving || !date || interviewers.length === 0}
                className="bg-[#0245EF] hover:bg-[#0237BF]"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />}
                Save Changes
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Confirmation */}
      <AlertDialog open={showCancelConfirm} onOpenChange={setShowCancelConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel this interview?</AlertDialogTitle>
            <AlertDialogDescription>
              The candidate will be notified. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Interview</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancel}
              className="bg-red-600 hover:bg-red-700"
              disabled={cancelling}
            >
              {cancelling ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              Cancel Interview
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}