"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { ProctoringEvent, ProctoringEventType } from "@/lib/proctor";
import toast from "react-hot-toast";

interface UseProctoringOptions {
  enabled: boolean;
  submissionId?: string;
  onViolation?: (event: ProctoringEvent) => void;
  maxWarnings?: number;
  blockCopyPaste?: boolean;
  blockRightClick?: boolean;
  detectDevTools?: boolean;
  detectTabSwitch?: boolean;
  warnOnViolation?: boolean;
}

interface ProctoringState {
  events: ProctoringEvent[];
  warnings: number;
  isFullscreen: boolean;
  tabSwitches: number;
  copyAttempts: number;
  isActive: boolean;
}

export function useProctoring(options: UseProctoringOptions) {
  const {
    enabled,
    submissionId,
    onViolation,
    maxWarnings = 5,
    blockCopyPaste = true,
    blockRightClick = true,
    detectDevTools = true,
    detectTabSwitch = true,
    warnOnViolation = true,
  } = options;

  const [state, setState] = useState<ProctoringState>({
    events: [],
    warnings: 0,
    isFullscreen: false,
    tabSwitches: 0,
    copyAttempts: 0,
    isActive: false,
  });

  const eventsRef = useRef<ProctoringEvent[]>([]);
  const warningsRef = useRef(0);
  const tabSwitchesRef = useRef(0);
  const copyAttemptsRef = useRef(0);
  const devToolsOpenRef = useRef(false);
  const lastActivityRef = useRef(Date.now());
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const flushTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Add event
  const addEvent = useCallback(
    (type: ProctoringEventType, details?: string, metadata?: any) => {
      const event: ProctoringEvent = {
        type,
        timestamp: Date.now(),
        details,
        metadata,
      };

      eventsRef.current.push(event);

      // Update state
      setState((prev) => ({
        ...prev,
        events: [...prev.events, event],
      }));

      // Callback
      onViolation?.(event);

      // Count violations
      const isViolation = [
        "TAB_SWITCH",
        "TAB_HIDDEN",
        "COPY",
        "PASTE",
        "CUT",
        "DEVTOOLS_OPEN",
        "FULLSCREEN_EXIT",
      ].includes(type);

      if (isViolation && warnOnViolation) {
        warningsRef.current++;
        setState((prev) => ({ ...prev, warnings: warningsRef.current }));

        const remaining = maxWarnings - warningsRef.current;

        if (remaining > 0) {
          const messages: Record<string, string> = {
            TAB_SWITCH: "Tab switch detected!",
            TAB_HIDDEN: "You left the assessment tab!",
            COPY: "Copy is not allowed during the assessment.",
            PASTE: "Paste is not allowed during the assessment.",
            CUT: "Cut is not allowed during the assessment.",
            DEVTOOLS_OPEN: "Developer tools detected!",
            FULLSCREEN_EXIT: "Please stay in fullscreen mode.",
          };

          toast(
            `⚠️ ${messages[type] || "Suspicious activity detected."} (${remaining} warning${remaining !== 1 ? "s" : ""} remaining)`,
            {
              icon: "🚨",
              duration: 4000,
              style: {
                background: "#FEF2F2",
                color: "#991B1B",
                border: "1px solid #FCA5A5",
              },
            }
          );
        }

        if (warningsRef.current >= maxWarnings) {
          toast.error(
            "Maximum violations reached. This will be flagged for review.",
            { duration: 6000 }
          );
        }
      }
    },
    [onViolation, maxWarnings, warnOnViolation]
  );

  // Flush events to server periodically
  const flushEvents = useCallback(async () => {
    if (!submissionId || eventsRef.current.length === 0) return;

    const eventsToSend = [...eventsRef.current];

    try {
      await fetch("/api/proctoring", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          submissionId,
          events: eventsToSend,
        }),
      });
    } catch (err) {
      console.error("Failed to flush proctoring events:", err);
    }
  }, [submissionId]);

  useEffect(() => {
    if (!enabled) return;

    // Session start
    addEvent("SESSION_START", "Assessment session started", {
      userAgent: navigator.userAgent,
      screenWidth: screen.width,
      screenHeight: screen.height,
      windowWidth: window.innerWidth,
      windowHeight: window.innerHeight,
      devicePixelRatio: window.devicePixelRatio,
      screens: (window as any).screen?.isExtended ? "multiple" : "single",
    });

    setState((prev) => ({ ...prev, isActive: true }));

    // ==========================================
    // TAB VISIBILITY
    // ==========================================
    const handleVisibilityChange = () => {
      if (document.hidden) {
        addEvent("TAB_HIDDEN", "Tab became hidden");
        tabSwitchesRef.current++;
        setState((prev) => ({
          ...prev,
          tabSwitches: tabSwitchesRef.current,
        }));
      } else {
        addEvent("TAB_VISIBLE", "Tab became visible again");
      }
    };

    // ==========================================
    // WINDOW BLUR/FOCUS (catches Alt+Tab)
    // ==========================================
    const handleBlur = () => {
      if (detectTabSwitch) {
        addEvent("WINDOW_BLUR", "Window lost focus");
        tabSwitchesRef.current++;
        setState((prev) => ({
          ...prev,
          tabSwitches: tabSwitchesRef.current,
        }));
      }
    };

    const handleFocus = () => {
      addEvent("WINDOW_FOCUS", "Window regained focus");
      lastActivityRef.current = Date.now();
    };

    // ==========================================
    // COPY / PASTE / CUT
    // ==========================================
    const handleCopy = (e: ClipboardEvent) => {
      if (blockCopyPaste) {
        e.preventDefault();
        addEvent("COPY", "Copy attempt blocked");
        copyAttemptsRef.current++;
        setState((prev) => ({
          ...prev,
          copyAttempts: copyAttemptsRef.current,
        }));
      }
    };

    const handlePaste = (e: ClipboardEvent) => {
      // Allow paste in the code editor (it's normal to paste code you're writing)
      const target = e.target as HTMLElement;
      const isCodeEditor =
        target.closest(".monaco-editor") ||
        target.closest("[data-monaco-editor]") ||
        target.classList.contains("inputarea");

      if (blockCopyPaste && !isCodeEditor) {
        e.preventDefault();
        addEvent("PASTE", "Paste attempt blocked (outside editor)");
        copyAttemptsRef.current++;
        setState((prev) => ({
          ...prev,
          copyAttempts: copyAttemptsRef.current,
        }));
      } else if (isCodeEditor) {
        // Log but don't block — pasting in code editor is normal
        addEvent("PASTE", "Paste in code editor (allowed)", {
          location: "code_editor",
        });
      }
    };

    const handleCut = (e: ClipboardEvent) => {
      if (blockCopyPaste) {
        e.preventDefault();
        addEvent("CUT", "Cut attempt blocked");
      }
    };

    // ==========================================
    // RIGHT CLICK
    // ==========================================
    const handleContextMenu = (e: MouseEvent) => {
      if (blockRightClick) {
        e.preventDefault();
        addEvent("RIGHT_CLICK", "Right-click blocked");
      }
    };

    // ==========================================
    // DEVTOOLS DETECTION
    // ==========================================
    let devToolsCheckInterval: NodeJS.Timeout | null = null;

    if (detectDevTools) {
      devToolsCheckInterval = setInterval(() => {
        const threshold = 160;
        const widthDiff = window.outerWidth - window.innerWidth;
        const heightDiff = window.outerHeight - window.innerHeight;

        const isOpen = widthDiff > threshold || heightDiff > threshold;

        if (isOpen && !devToolsOpenRef.current) {
          devToolsOpenRef.current = true;
          addEvent("DEVTOOLS_OPEN", "Developer tools detected as open", {
            widthDiff,
            heightDiff,
          });
        } else if (!isOpen && devToolsOpenRef.current) {
          devToolsOpenRef.current = false;
          addEvent("DEVTOOLS_CLOSE", "Developer tools closed");
        }
      }, 2000);
    }

    // ==========================================
    // KEYBOARD SHORTCUTS
    // ==========================================
    const handleKeyDown = (e: KeyboardEvent) => {
      lastActivityRef.current = Date.now();

      // Block F12
      if (e.key === "F12") {
        e.preventDefault();
        addEvent("DEVTOOLS_OPEN", "F12 key blocked");
        return;
      }

      // Block Ctrl+Shift+I / Cmd+Option+I (DevTools)
      if (
        (e.ctrlKey && e.shiftKey && e.key === "I") ||
        (e.metaKey && e.altKey && e.key === "i")
      ) {
        e.preventDefault();
        addEvent("DEVTOOLS_OPEN", "DevTools shortcut blocked");
        return;
      }

      // Block Ctrl+Shift+J / Cmd+Option+J (Console)
      if (
        (e.ctrlKey && e.shiftKey && e.key === "J") ||
        (e.metaKey && e.altKey && e.key === "j")
      ) {
        e.preventDefault();
        addEvent("DEVTOOLS_OPEN", "Console shortcut blocked");
        return;
      }

      // Block Ctrl+U / Cmd+U (View Source)
      if ((e.ctrlKey || e.metaKey) && e.key === "u") {
        e.preventDefault();
        addEvent("DEVTOOLS_OPEN", "View source blocked");
        return;
      }

      // Block Ctrl+S / Cmd+S (Save page)
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        return;
      }

      // Block PrintScreen
      if (e.key === "PrintScreen") {
        e.preventDefault();
        addEvent("SCREENSHOT_ATTEMPT", "PrintScreen blocked");
        return;
      }
    };

    // ==========================================
    // FULLSCREEN DETECTION
    // ==========================================
    const handleFullscreenChange = () => {
      if (document.fullscreenElement) {
        addEvent("FULLSCREEN_ENTER", "Entered fullscreen");
        setState((prev) => ({ ...prev, isFullscreen: true }));
      } else {
        addEvent("FULLSCREEN_EXIT", "Exited fullscreen");
        setState((prev) => ({ ...prev, isFullscreen: false }));
      }
    };

    // ==========================================
    // WINDOW RESIZE (detect split screen)
    // ==========================================
    let lastWidth = window.innerWidth;
    const handleResize = () => {
      const newWidth = window.innerWidth;
      // Detect if window was dramatically resized (possible split screen)
      if (Math.abs(newWidth - lastWidth) > 300) {
        addEvent("RESIZE_SUSPICIOUS", "Window significantly resized", {
          from: lastWidth,
          to: newWidth,
        });
      }
      lastWidth = newWidth;
    };

    // ==========================================
    // MULTIPLE SCREENS
    // ==========================================
    if ((window as any).screen?.isExtended) {
      addEvent(
        "MULTIPLE_SCREENS",
        "Multiple screens detected at session start"
      );
    }

    // ==========================================
    // IDLE DETECTION
    // ==========================================
    const checkIdle = () => {
      const idleTime = Date.now() - lastActivityRef.current;
      if (idleTime > 5 * 60 * 1000) {
        // 5 minutes idle
        addEvent("IDLE_TIMEOUT", `Idle for ${Math.floor(idleTime / 1000)}s`);
      }
    };

    const handleMouseMove = () => {
      lastActivityRef.current = Date.now();
    };

    // ==========================================
    // ATTACH LISTENERS
    // ==========================================
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleBlur);
    window.addEventListener("focus", handleFocus);
    document.addEventListener("copy", handleCopy);
    document.addEventListener("paste", handlePaste);
    document.addEventListener("cut", handleCut);
    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    window.addEventListener("resize", handleResize);
    document.addEventListener("mousemove", handleMouseMove);

    idleTimerRef.current = setInterval(checkIdle, 60000);

    // Flush events to server every 30 seconds
    flushTimerRef.current = setInterval(flushEvents, 30000);

    // ==========================================
    // CLEANUP
    // ==========================================
    return () => {
      addEvent("SESSION_END", "Assessment session ended");
      flushEvents();

      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange
      );
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("copy", handleCopy);
      document.removeEventListener("paste", handlePaste);
      document.removeEventListener("cut", handleCut);
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener(
        "fullscreenchange",
        handleFullscreenChange
      );
      window.removeEventListener("resize", handleResize);
      document.removeEventListener("mousemove", handleMouseMove);

      if (devToolsCheckInterval) clearInterval(devToolsCheckInterval);
      if (idleTimerRef.current) clearInterval(idleTimerRef.current);
      if (flushTimerRef.current) clearInterval(flushTimerRef.current);

      setState((prev) => ({ ...prev, isActive: false }));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  // Public method to get all events
  const getEvents = useCallback(() => eventsRef.current, []);

  // Public method to flush now
  const flush = useCallback(() => flushEvents(), [flushEvents]);

  // Request fullscreen
  const requestFullscreen = useCallback(async () => {
    try {
      await document.documentElement.requestFullscreen();
    } catch {
      console.warn("Fullscreen not supported");
    }
  }, []);

  return {
    ...state,
    getEvents,
    flush,
    requestFullscreen,
  };
}