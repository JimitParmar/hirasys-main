"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

export function useSessionCheck(intervalMs = 5 * 60 * 1000) {
  const router = useRouter();

  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch("/api/auth/me", { cache: "no-store" });
        if (res.status === 401) {
          toast.error("Session expired. Please sign in again.");
          router.push("/login");
        }
      } catch {}
    };

    const interval = setInterval(check, intervalMs);

    // Also check on tab focus
    const onFocus = () => check();
    window.addEventListener("focus", onFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [intervalMs, router]);
}