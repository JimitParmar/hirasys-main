"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Calendar,
  Loader2,
  Video,
  UserPlus,
  X,
  Users,
  Mail,
  Globe,
} from "lucide-react";
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

// ==========================================
// Common timezones grouped by region
// ==========================================
const TIMEZONE_GROUPS = [
  {
    label: "Americas",
    zones: [
      { value: "America/New_York", label: "Eastern Time (ET)", offset: "UTC-5/4" },
      { value: "America/Chicago", label: "Central Time (CT)", offset: "UTC-6/5" },
      { value: "America/Denver", label: "Mountain Time (MT)", offset: "UTC-7/6" },
      { value: "America/Los_Angeles", label: "Pacific Time (PT)", offset: "UTC-8/7" },
      { value: "America/Anchorage", label: "Alaska (AKT)", offset: "UTC-9/8" },
      { value: "Pacific/Honolulu", label: "Hawaii (HST)", offset: "UTC-10" },
      { value: "America/Toronto", label: "Toronto (ET)", offset: "UTC-5/4" },
      { value: "America/Vancouver", label: "Vancouver (PT)", offset: "UTC-8/7" },
      { value: "America/Sao_Paulo", label: "São Paulo (BRT)", offset: "UTC-3" },
      { value: "America/Mexico_City", label: "Mexico City (CST)", offset: "UTC-6" },
      { value: "America/Argentina/Buenos_Aires", label: "Buenos Aires (ART)", offset: "UTC-3" },
    ],
  },
  {
    label: "Europe & Africa",
    zones: [
      { value: "Europe/London", label: "London (GMT/BST)", offset: "UTC+0/1" },
      { value: "Europe/Paris", label: "Paris (CET/CEST)", offset: "UTC+1/2" },
      { value: "Europe/Berlin", label: "Berlin (CET/CEST)", offset: "UTC+1/2" },
      { value: "Europe/Amsterdam", label: "Amsterdam (CET)", offset: "UTC+1/2" },
      { value: "Europe/Madrid", label: "Madrid (CET)", offset: "UTC+1/2" },
      { value: "Europe/Rome", label: "Rome (CET)", offset: "UTC+1/2" },
      { value: "Europe/Zurich", label: "Zurich (CET)", offset: "UTC+1/2" },
      { value: "Europe/Stockholm", label: "Stockholm (CET)", offset: "UTC+1/2" },
      { value: "Europe/Helsinki", label: "Helsinki (EET)", offset: "UTC+2/3" },
      { value: "Europe/Moscow", label: "Moscow (MSK)", offset: "UTC+3" },
      { value: "Europe/Istanbul", label: "Istanbul (TRT)", offset: "UTC+3" },
      { value: "Africa/Cairo", label: "Cairo (EET)", offset: "UTC+2" },
      { value: "Africa/Lagos", label: "Lagos (WAT)", offset: "UTC+1" },
      { value: "Africa/Johannesburg", label: "Johannesburg (SAST)", offset: "UTC+2" },
      { value: "Africa/Nairobi", label: "Nairobi (EAT)", offset: "UTC+3" },
    ],
  },
  {
    label: "Asia & Pacific",
    zones: [
      { value: "Asia/Dubai", label: "Dubai (GST)", offset: "UTC+4" },
      { value: "Asia/Karachi", label: "Karachi (PKT)", offset: "UTC+5" },
      { value: "Asia/Kolkata", label: "India (IST)", offset: "UTC+5:30" },
      { value: "Asia/Colombo", label: "Sri Lanka (IST)", offset: "UTC+5:30" },
      { value: "Asia/Dhaka", label: "Dhaka (BST)", offset: "UTC+6" },
      { value: "Asia/Bangkok", label: "Bangkok (ICT)", offset: "UTC+7" },
      { value: "Asia/Jakarta", label: "Jakarta (WIB)", offset: "UTC+7" },
      { value: "Asia/Singapore", label: "Singapore (SGT)", offset: "UTC+8" },
      { value: "Asia/Hong_Kong", label: "Hong Kong (HKT)", offset: "UTC+8" },
      { value: "Asia/Shanghai", label: "Shanghai (CST)", offset: "UTC+8" },
      { value: "Asia/Taipei", label: "Taipei (CST)", offset: "UTC+8" },
      { value: "Asia/Seoul", label: "Seoul (KST)", offset: "UTC+9" },
      { value: "Asia/Tokyo", label: "Tokyo (JST)", offset: "UTC+9" },
      { value: "Australia/Sydney", label: "Sydney (AEST)", offset: "UTC+10/11" },
      { value: "Australia/Melbourne", label: "Melbourne (AEST)", offset: "UTC+10/11" },
      { value: "Australia/Perth", label: "Perth (AWST)", offset: "UTC+8" },
      { value: "Pacific/Auckland", label: "Auckland (NZST)", offset: "UTC+12/13" },
    ],
  },
];

// Detect user's timezone
function detectTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return "UTC";
  }
}

// Convert local date+time in a specific timezone to UTC ISO string
function toUTCISOString(
  date: string,
  time: string,
  timezone: string
): string {
  // Create a date string that we'll interpret in the given timezone
  const dateTimeStr = `${date}T${time}:00`;

  // Use Intl to figure out the offset
  try {
    // Create a Date object (JS will interpret this as local time)
    const localDate = new Date(dateTimeStr);

    // Get the offset for the target timezone
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });

    // Format current time in target timezone to find offset
    const now = new Date();
    const utcNow = now.getTime();

    // Get the parts in the target timezone
    const parts = formatter.formatToParts(now);
    const tzYear = parseInt(
      parts.find((p) => p.type === "year")?.value || "0"
    );
    const tzMonth = parseInt(
      parts.find((p) => p.type === "month")?.value || "0"
    );
    const tzDay = parseInt(
      parts.find((p) => p.type === "day")?.value || "0"
    );
    const tzHour = parseInt(
      parts.find((p) => p.type === "hour")?.value || "0"
    );
    const tzMinute = parseInt(
      parts.find((p) => p.type === "minute")?.value || "0"
    );
    const tzSecond = parseInt(
      parts.find((p) => p.type === "second")?.value || "0"
    );

    // Reconstruct the timezone's current time as a UTC date
    const tzDate = new Date(
      Date.UTC(tzYear, tzMonth - 1, tzDay, tzHour, tzMinute, tzSecond)
    );

    // Offset = tzDate - utcNow
    const offsetMs = tzDate.getTime() - utcNow;

    // Apply offset to the desired date/time
    // The user entered dateTimeStr meaning "this time in timezone X"
    // So UTC = localInterpretation - offset
    const naiveDate = new Date(dateTimeStr);
    const utcDate = new Date(naiveDate.getTime() - offsetMs);

    return utcDate.toISOString();
  } catch {
    // Fallback: treat as UTC
    return new Date(`${date}T${time}:00Z`).toISOString();
  }
}

// Format a UTC date in a specific timezone for display
function formatInTimezone(
  isoDate: string | Date,
  timezone: string,
  options?: Intl.DateTimeFormatOptions
): string {
  const date = typeof isoDate === "string" ? new Date(isoDate) : isoDate;
  return date.toLocaleString("en-US", {
    timeZone: timezone,
    ...options,
  });
}

export function ScheduleF2FDialog({
  open,
  onOpenChange,
  applicationId,
  candidateName,
  onScheduled,
}: Props) {
  const [date, setDate] = useState("");
  const [time, setTime] = useState("10:00");
  const [timezone, setTimezone] = useState(detectTimezone());
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
  const [tzSearch, setTzSearch] = useState("");

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

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail.trim())) {
      toast.error("Please enter a valid email");
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
      // Convert to UTC using the selected timezone
      const scheduledAtUTC = toUTCISOString(date, time || "10:00", timezone);

      const res = await fetch("/api/f2f", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicationId,
          scheduledAt: scheduledAtUTC,
          duration: parseInt(duration),
          meetingLink: meetingLink || null,
          interviewType,
          notes: notes || null,
          interviewers,
          timezone, // Send timezone so emails can show local time
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success(
        `Interview scheduled with ${interviewers.length} interviewer${interviewers.length > 1 ? "s" : ""}! 📅`
      );
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

  // Preview: what the selected time looks like in UTC and other timezones
  const previewUTC =
    date && time
      ? (() => {
          try {
            const utc = toUTCISOString(date, time, timezone);
            return new Date(utc);
          } catch {
            return null;
          }
        })()
      : null;

  // Find the selected timezone's display label
  const selectedTzInfo = TIMEZONE_GROUPS.flatMap((g) => g.zones).find(
    (z) => z.value === timezone
  );

  // Filtered timezone list for search
  const searchLower = tzSearch.toLowerCase();
  const filteredGroups = TIMEZONE_GROUPS.map((group) => ({
    ...group,
    zones: group.zones.filter(
      (z) =>
        z.label.toLowerCase().includes(searchLower) ||
        z.value.toLowerCase().includes(searchLower) ||
        z.offset.toLowerCase().includes(searchLower)
    ),
  })).filter((g) => g.zones.length > 0);

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
            Scheduling interview for{" "}
            <strong>{candidateName}</strong>
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

          {/* Timezone Selector */}
          <div className="space-y-2">
            <Label className="text-sm flex items-center gap-1">
              <Globe className="w-4 h-4" /> Timezone
            </Label>
            <Select value={timezone} onValueChange={setTimezone}>
              <SelectTrigger className="h-9">
                <SelectValue>
                  {selectedTzInfo
                    ? `${selectedTzInfo.label} (${selectedTzInfo.offset})`
                    : timezone}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="max-h-[300px]">
                {/* Search */}
                <div className="px-2 pb-2 sticky top-0 bg-white z-10">
                  <Input
                    placeholder="Search timezone..."
                    value={tzSearch}
                    onChange={(e) => setTzSearch(e.target.value)}
                    className="h-8 text-xs"
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>

                {filteredGroups.map((group) => (
                  <div key={group.label}>
                    <div className="px-2 py-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                      {group.label}
                    </div>
                    {group.zones.map((tz) => (
                      <SelectItem
                        key={tz.value}
                        value={tz.value}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span>{tz.label}</span>
                          <span className="text-[10px] text-slate-400 ml-2">
                            {tz.offset}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </div>
                ))}

                {filteredGroups.length === 0 && (
                  <p className="text-xs text-slate-400 text-center py-3">
                    No matching timezones
                  </p>
                )}
              </SelectContent>
            </Select>

            {/* UTC preview */}
            {previewUTC && date && (
              <div className="bg-slate-50 rounded-lg p-2 text-[11px] text-slate-500 space-y-0.5">
                <p>
                  🕐 <strong>Local ({selectedTzInfo?.label || timezone}):</strong>{" "}
                  {formatInTimezone(previewUTC, timezone, {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: true,
                  })}
                </p>
                <p>
                  🌍 <strong>UTC:</strong>{" "}
                  {previewUTC.toUTCString().replace(" GMT", "")}
                </p>
                {timezone !== "Asia/Kolkata" && (
                  <p>
                    🇮🇳 <strong>IST:</strong>{" "}
                    {formatInTimezone(previewUTC, "Asia/Kolkata", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: true,
                    })}
                  </p>
                )}
                {timezone !== "America/New_York" && (
                  <p>
                    🇺🇸 <strong>ET:</strong>{" "}
                    {formatInTimezone(
                      previewUTC,
                      "America/New_York",
                      {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: true,
                      }
                    )}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Duration & Type */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-sm">Duration</Label>
              <Select value={duration} onValueChange={setDuration}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 min</SelectItem>
                  <SelectItem value="45">45 min</SelectItem>
                  <SelectItem value="60">60 min</SelectItem>
                  <SelectItem value="90">90 min</SelectItem>
                  <SelectItem value="120">120 min</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Type</Label>
              <Select
                value={interviewType}
                onValueChange={setInterviewType}
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="technical">Technical</SelectItem>
                  <SelectItem value="behavioral">
                    Behavioral
                  </SelectItem>
                  <SelectItem value="hiring_manager">
                    Hiring Manager
                  </SelectItem>
                  <SelectItem value="culture_fit">
                    Culture Fit
                  </SelectItem>
                  <SelectItem value="panel">
                    Panel Interview
                  </SelectItem>
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

          {/* Interviewers */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold flex items-center gap-2">
              <Users className="w-4 h-4 text-[#0245EF]" />
              Interviewers *
            </Label>

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
                          {person.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .substring(0, 2)}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-700">
                          {person.name}
                        </p>
                        <p className="text-xs text-slate-400 flex items-center gap-1">
                          <Mail className="w-3 h-3" />{" "}
                          {person.email}
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className="text-[10px] ml-2"
                      >
                        {person.role}
                      </Badge>
                      {person.isExternal && (
                        <Badge className="text-[10px] bg-amber-100 text-amber-700">
                          External
                        </Badge>
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
                ⚠️ Add at least one interviewer. All will receive
                email with calendar invite and candidate resume.
              </p>
            )}

            {/* Add from team */}
            <div className="flex gap-2">
              <Select
                value={selectedTeamMember}
                onValueChange={setSelectedTeamMember}
              >
                <SelectTrigger className="h-9 flex-1">
                  <SelectValue placeholder="Add team member..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none" disabled>
                    Select team member
                  </SelectItem>
                  {teamMembers.map((m) => (
                    <SelectItem
                      key={m.id}
                      value={m.id}
                      disabled={interviewers.some(
                        (i) => i.id === m.id
                      )}
                    >
                      {m.first_name} {m.last_name} ({m.email})
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

            {/* Add external */}
            {!showAddForm ? (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-[#0245EF]"
                onClick={() => setShowAddForm(true)}
              >
                <UserPlus className="w-3 h-3 mr-1" />
                Add external person
              </Button>
            ) : (
              <div className="bg-slate-50 rounded-lg p-3 space-y-2">
                <p className="text-xs font-medium text-slate-600">
                  Add External Interviewer
                </p>
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
                    placeholder="email@company.com"
                    type="email"
                    className="h-8 text-sm"
                  />
                </div>
                <Input
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  placeholder="Role (e.g. Tech Lead)"
                  className="h-8 text-sm"
                />
                <p className="text-[10px] text-slate-400">
                  📧 They&apos;ll receive an email with calendar
                  invite, meeting link, and candidate resume.
                </p>
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
            <Label className="text-sm">
              Notes for everyone (optional)
            </Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Interview agenda, preparation notes..."
              rows={2}
              className="text-sm"
            />
          </div>

          {/* Summary */}
          {interviewers.length > 0 && date && (
            <div className="bg-[#EBF0FF] rounded-lg p-3 text-xs text-[#0237BF] space-y-1">
              <p className="font-semibold">Summary</p>
              {previewUTC && (
                <p>
                  📅{" "}
                  {formatInTimezone(previewUTC, timezone, {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                  })}{" "}
                  at{" "}
                  {formatInTimezone(previewUTC, timezone, {
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: true,
                  })}{" "}
                  ({selectedTzInfo?.label || timezone})
                </p>
              )}
              <p>👤 Candidate: {candidateName}</p>
              <p>
                👥 Interviewers:{" "}
                {interviewers.map((i) => i.name).join(", ")}
              </p>
              <p>
                ⏱ {duration} min • {interviewType}
              </p>
              {meetingLink && <p>🔗 {meetingLink}</p>}
              <p className="text-[10px] text-[#0245EF]/60 mt-1">
                📧 All participants receive email invites with
                calendar attachments
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSchedule}
            disabled={
              saving || !date || interviewers.length === 0
            }
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