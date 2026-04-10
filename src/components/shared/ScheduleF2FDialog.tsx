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
import { Calendar, Loader2, Video, UserPlus, X, Users, Mail } from "lucide-react";
import toast from "react-hot-toast";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  applicationId: string;
  candidateName: string;
  onScheduled: () => void;
}

interface Interviewer {
  id?: string;
  name: string;
  email: string;
  role: string;
  isExternal: boolean;
}

export function ScheduleF2FDialog({ open, onOpenChange, applicationId, candidateName, onScheduled }: Props) {
  const [date, setDate] = useState("");
  const [time, setTime] = useState("10:00");
  const [duration, setDuration] = useState("60");
  const [meetingLink, setMeetingLink] = useState("");
  const [interviewType, setInterviewType] = useState("technical");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  // Interviewers
  const [interviewers, setInterviewers] = useState<Interviewer[]>([]);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState("Tech Lead");
  const [selectedTeamMember, setSelectedTeamMember] = useState("none");

  // Fetch team members (HR and Interviewers from the system)
  useEffect(() => {
    if (open) fetchTeamMembers();
  }, [open]);

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
    if (!member) return;

    // Check if already added
    if (interviewers.some((i) => i.id === member.id)) {
      toast.error("Already added");
      return;
    }

    setInterviewers([
      ...interviewers,
      {
        id: member.id,
        name: `${member.first_name} ${member.last_name}`,
        email: member.email,
        role: member.department || member.role,
        isExternal: false,
      },
    ]);
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

    setInterviewers([
      ...interviewers,
      {
        name: newName.trim(),
        email: newEmail.trim(),
        role: newRole.trim() || "Interviewer",
        isExternal: true,
      },
    ]);

    setNewName("");
    setNewEmail("");
    setNewRole("Tech Lead");
    setShowAddForm(false);
  };

  const removeInterviewer = (index: number) => {
    setInterviewers(interviewers.filter((_, i) => i !== index));
  };

  const handleSchedule = async () => {
    if (!date) {
      toast.error("Please select a date");
      return;
    }

    if (interviewers.length === 0) {
      toast.error("Add at least one interviewer");
      return;
    }

    setSaving(true);
    try {
      const scheduledAt = new Date(`${date}T${time || "10:00"}`);

      const res = await fetch("/api/f2f", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicationId,
          scheduledAt: scheduledAt.toISOString(),
          duration: parseInt(duration),
          meetingLink: meetingLink || null,
          interviewType,
          notes: notes || null,
          interviewers,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success(`Interview scheduled with ${interviewers.length} interviewer${interviewers.length > 1 ? "s" : ""}! 📅`);
      onOpenChange(false);
      onScheduled();

      // Reset
      setDate("");
      setTime("10:00");
      setMeetingLink("");
      setNotes("");
      setInterviewers([]);
    } catch (err: any) {
      toast.error(err.message || "Failed to schedule");
    } finally {
      setSaving(false);
    }
  };

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split("T")[0];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-[#0245EF]" />
            Schedule F2F Interview
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <p className="text-sm text-slate-500">
            Scheduling interview for <strong>{candidateName}</strong>
          </p>

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-sm">Date *</Label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                min={minDate}
                className="h-9"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Time *</Label>
              <Input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="h-9"
              />
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
                  <SelectItem value="panel">Panel Interview</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Meeting Link */}
          <div className="space-y-2">
            <Label className="text-sm flex items-center gap-1">
              <Video className="w-4 h-4" /> Meeting Link
            </Label>
            <Input
              value={meetingLink}
              onChange={(e) => setMeetingLink(e.target.value)}
              placeholder="https://meet.google.com/... or Zoom link"
              className="h-9"
            />
          </div>

          {/* ==========================================
              INTERVIEWERS SECTION
              ========================================== */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold flex items-center gap-2">
              <Users className="w-4 h-4 text-[#0245EF]" />
              Interviewers *
            </Label>

            {/* Added interviewers */}
            {interviewers.length > 0 && (
              <div className="space-y-2">
                {interviewers.map((person, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#D1DEFF] flex items-center justify-center">
                        <span className="text-xs font-semibold text-[#0245EF]">
                          {person.name.split(" ").map((n) => n[0]).join("").substring(0, 2)}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-700">{person.name}</p>
                        <p className="text-xs text-slate-400 flex items-center gap-1">
                          <Mail className="w-3 h-3" /> {person.email}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-[10px] ml-2">
                        {person.role}
                      </Badge>
                      {person.isExternal && (
                        <Badge className="text-[10px] bg-amber-100 text-amber-700">External</Badge>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => removeInterviewer(i)}
                    >
                      <X className="w-4 h-4 text-slate-400" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {interviewers.length === 0 && (
              <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded-lg">
                ⚠️ Add at least one interviewer
              </p>
            )}

            {/* Add from team */}
            <div className="flex gap-2">
              <Select value={selectedTeamMember} onValueChange={setSelectedTeamMember}>
                <SelectTrigger className="h-9 flex-1">
                  <SelectValue placeholder="Add team member..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none" disabled>Select team member</SelectItem>
                  {teamMembers.map((m) => (
                    <SelectItem
                      key={m.id}
                      value={m.id}
                      disabled={interviewers.some((i) => i.id === m.id)}
                    >
                      {m.first_name} {m.last_name}
                      <span className="text-slate-400 ml-1">({m.email})</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                className="h-9"
                onClick={addTeamMember}
                disabled={selectedTeamMember === "none"}
              >
                <UserPlus className="w-4 h-4" />
              </Button>
            </div>

            {/* Add external person */}
            {!showAddForm ? (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-[#0245EF]"
                onClick={() => setShowAddForm(true)}
              >
                <UserPlus className="w-3 h-3 mr-1" />
                Add external person (tech lead, manager, etc.)
              </Button>
            ) : (
              <div className="bg-slate-50 rounded-lg p-3 space-y-2">
                <p className="text-xs font-medium text-slate-600">Add External Interviewer</p>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Full name"
                    className="h-8 text-sm"
                  />
                  <Input
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="Email"
                    type="email"
                    className="h-8 text-sm"
                  />
                </div>
                <Input
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  placeholder="Role (e.g. Tech Lead, VP Engineering)"
                  className="h-8 text-sm"
                />
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs h-7"
                    onClick={() => setShowAddForm(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    className="text-xs h-7 bg-[#0245EF] hover:bg-[#0237BF]"
                    onClick={addExternalPerson}
                  >
                    Add Person
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label className="text-sm">Notes for everyone (optional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Interview agenda, preparation notes, areas to evaluate..."
              rows={2}
              className="text-sm"
            />
          </div>

          {/* Summary */}
          {interviewers.length > 0 && date && (
            <div className="bg-[#EBF0FF] rounded-lg p-3 text-xs text-[#0237BF] space-y-1">
              <p className="font-semibold">Summary</p>
              <p>📅 {new Date(`${date}T${time || "10:00"}`).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })} at {time || "10:00"}</p>
              <p>👤 Candidate: {candidateName}</p>
              <p>👥 Interviewers: {interviewers.map((i) => i.name).join(", ")}</p>
              <p>⏱ {duration} min • {interviewType}</p>
              {meetingLink && <p>🔗 {meetingLink}</p>}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={handleSchedule}
            disabled={saving || !date || interviewers.length === 0}
            className="bg-[#0245EF] hover:bg-[#0237BF]"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin mr-1" />
            ) : (
              <Calendar className="w-4 h-4 mr-1" />
            )}
            Schedule Interview
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}