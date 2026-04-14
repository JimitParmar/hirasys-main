export type ProctoringEventType =
  | "TAB_SWITCH"
  | "TAB_HIDDEN"
  | "TAB_VISIBLE"
  | "WINDOW_BLUR"
  | "WINDOW_FOCUS"
  | "COPY"
  | "PASTE"
  | "CUT"
  | "RIGHT_CLICK"
  | "SCREENSHOT_ATTEMPT"
  | "DEVTOOLS_OPEN"
  | "DEVTOOLS_CLOSE"
  | "FULLSCREEN_EXIT"
  | "FULLSCREEN_ENTER"
  | "MULTIPLE_SCREENS"
  | "RESIZE_SUSPICIOUS"
  | "IDLE_TIMEOUT"
  | "SESSION_START"
  | "SESSION_END";

export interface ProctoringEvent {
  type: ProctoringEventType;
  timestamp: number;
  details?: string;
  metadata?: Record<string, any>;
}

export interface ProctoringReport {
  events: ProctoringEvent[];
  summary: {
    tabSwitches: number;
    copyPasteAttempts: number;
    rightClicks: number;
    devtoolsOpened: number;
    fullscreenExits: number;
    totalViolations: number;
    suspicionLevel: "low" | "medium" | "high" | "critical";
    duration: number;
    idleTime: number;
  };
}

export function calculateSuspicionLevel(
  events: ProctoringEvent[]
): "low" | "medium" | "high" | "critical" {
  let score = 0;

  const tabSwitches = events.filter(
    (e) => e.type === "TAB_SWITCH" || e.type === "TAB_HIDDEN"
  ).length;
  const copyPaste = events.filter(
    (e) => e.type === "COPY" || e.type === "PASTE" || e.type === "CUT"
  ).length;
  const devtools = events.filter((e) => e.type === "DEVTOOLS_OPEN").length;
  const fullscreenExits = events.filter(
    (e) => e.type === "FULLSCREEN_EXIT"
  ).length;

  // Scoring
  score += tabSwitches * 2;
  score += copyPaste * 3;
  score += devtools * 10;
  score += fullscreenExits * 1;

  if (score === 0) return "low";
  if (score <= 5) return "medium";
  if (score <= 15) return "high";
  return "critical";
}

export function generateProctoringReport(
  events: ProctoringEvent[]
): ProctoringReport {
  const sessionStart = events.find((e) => e.type === "SESSION_START");
  const sessionEnd = events.find((e) => e.type === "SESSION_END");
  const duration =
    sessionStart && sessionEnd
      ? sessionEnd.timestamp - sessionStart.timestamp
      : 0;

  const tabSwitches = events.filter(
    (e) => e.type === "TAB_SWITCH" || e.type === "TAB_HIDDEN"
  ).length;
  const copyPasteAttempts = events.filter(
    (e) => e.type === "COPY" || e.type === "PASTE" || e.type === "CUT"
  ).length;
  const rightClicks = events.filter(
    (e) => e.type === "RIGHT_CLICK"
  ).length;
  const devtoolsOpened = events.filter(
    (e) => e.type === "DEVTOOLS_OPEN"
  ).length;
  const fullscreenExits = events.filter(
    (e) => e.type === "FULLSCREEN_EXIT"
  ).length;

  const totalViolations =
    tabSwitches + copyPasteAttempts + devtoolsOpened + fullscreenExits;

  return {
    events,
    summary: {
      tabSwitches,
      copyPasteAttempts,
      rightClicks,
      devtoolsOpened,
      fullscreenExits,
      totalViolations,
      suspicionLevel: calculateSuspicionLevel(events),
      duration,
      idleTime: 0,
    },
  };
}