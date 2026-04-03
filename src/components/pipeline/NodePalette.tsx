"use client";

import React, { useState } from "react";
import { NODE_CATALOG, NodeCategory, NodeCatalogItem } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Briefcase, FileSearch, Code, ListChecks, Bot, MessageSquare,
  Video, Users, Filter, Gauge, Percent, Settings2, Zap, UserCheck,
  Clock, Pause, GitBranch, Split, Merge, Timer, Mail, Bell,
  Globe, Award, XCircle, Rocket, Search,
} from "lucide-react";

const iconMap: Record<string, React.ReactNode> = {
  Briefcase: <Briefcase className="w-4 h-4" />,
  FileSearch: <FileSearch className="w-4 h-4" />,
  Code: <Code className="w-4 h-4" />,
  ListChecks: <ListChecks className="w-4 h-4" />,
  Bot: <Bot className="w-4 h-4" />,
  MessageSquare: <MessageSquare className="w-4 h-4" />,
  Video: <Video className="w-4 h-4" />,
  Users: <Users className="w-4 h-4" />,
  Filter: <Filter className="w-4 h-4" />,
  Gauge: <Gauge className="w-4 h-4" />,
  Percent: <Percent className="w-4 h-4" />,
  Settings2: <Settings2 className="w-4 h-4" />,
  Zap: <Zap className="w-4 h-4" />,
  UserCheck: <UserCheck className="w-4 h-4" />,
  Clock: <Clock className="w-4 h-4" />,
  Pause: <Pause className="w-4 h-4" />,
  GitBranch: <GitBranch className="w-4 h-4" />,
  Split: <Split className="w-4 h-4" />,
  Merge: <Merge className="w-4 h-4" />,
  Timer: <Timer className="w-4 h-4" />,
  Mail: <Mail className="w-4 h-4" />,
  Bell: <Bell className="w-4 h-4" />,
  Globe: <Globe className="w-4 h-4" />,
  Award: <Award className="w-4 h-4" />,
  XCircle: <XCircle className="w-4 h-4" />,
  Rocket: <Rocket className="w-4 h-4" />,
};

const categoryLabels: Record<NodeCategory, { label: string; emoji: string }> = {
  source: { label: "Source Nodes", emoji: "🟢" },
  stage: { label: "Stage Nodes", emoji: "🔵" },
  filter: { label: "Filter Nodes", emoji: "🟡" },
  logic: { label: "Logic Nodes", emoji: "🟠" },
  action: { label: "Action Nodes", emoji: "🔴" },
  exit: { label: "Exit Nodes", emoji: "🟣" },
};

const categoryOrder: NodeCategory[] = ["source", "stage", "filter", "logic", "action", "exit"];

interface NodePaletteProps {
  position: { x: number; y: number };
  onSelect: (item: NodeCatalogItem) => void;
  onClose: () => void;
}

export function NodePalette({ position, onSelect, onClose }: NodePaletteProps) {
  const [search, setSearch] = useState("");

  const filteredCatalog = search
    ? NODE_CATALOG.filter(
        (item) =>
          item.label.toLowerCase().includes(search.toLowerCase()) ||
          item.description.toLowerCase().includes(search.toLowerCase())
      )
    : NODE_CATALOG;

  const groupedItems = categoryOrder
    .map((cat) => ({
      category: cat,
      ...categoryLabels[cat],
      items: filteredCatalog.filter((item) => item.category === cat),
    }))
    .filter((group) => group.items.length > 0);

  // Position the palette near the click, but keep it on screen
  const style: React.CSSProperties = {
    position: "fixed",
    left: Math.min(position.x, window.innerWidth - 320),
    top: Math.min(position.y, window.innerHeight - 500),
    zIndex: 1000,
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-[999]" onClick={onClose} />

      <div
        style={style}
        className="w-[300px] max-h-[500px] bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden z-[1000]"
      >
        <div className="p-3 border-b border-slate-100">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search nodes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-sm"
              autoFocus
            />
          </div>
        </div>

        <div className="overflow-y-auto max-h-[430px] p-2">
          {groupedItems.map((group) => (
            <div key={group.category} className="mb-3">
              <div className="text-xs font-semibold text-slate-500 px-2 py-1 flex items-center gap-1">
                <span>{group.emoji}</span>
                <span>{group.label}</span>
                {group.category === "filter" && (
                  <Badge variant="secondary" className="text-[10px] ml-auto bg-green-50 text-green-700">
                    FREE
                  </Badge>
                )}
                {group.category === "logic" && (
                  <Badge variant="secondary" className="text-[10px] ml-auto bg-green-50 text-green-700">
                    FREE
                  </Badge>
                )}
              </div>

              {group.items.map((item) => (
                <button
                  key={item.subtype}
                  onClick={() => onSelect(item)}
                  className="w-full flex items-start gap-3 p-2 rounded-lg hover:bg-slate-50 transition-colors text-left group"
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                    style={{ backgroundColor: `${item.color}15`, color: item.color }}
                  >
                    {iconMap[item.icon]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-slate-700">
                        {item.label}
                      </span>
                      {item.costPerUnit > 0 && (
                        <span className="text-[10px] text-slate-400">
                          ${item.costPerUnit}/use
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 truncate">
                      {item.description}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}