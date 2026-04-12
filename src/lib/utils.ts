import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Parse database timestamp — always interpret as UTC
export function parseDBTimestamp(timestamp: string | Date): Date {
  if (timestamp instanceof Date) return timestamp;

  const str = String(timestamp).trim();

  // Already has timezone info
  if (str.endsWith("Z") || /[+-]\d{2}(:\d{2})?$/.test(str)) {
    return new Date(str);
  }

  // No timezone — database stores as UTC, append Z
  return new Date(str + "Z");
}

export function formatCurrency(amount: number, currency: string = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(date: Date | string): string {
  const d = parseDBTimestamp(date);
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(d);
}

export function formatDateTime(date: Date | string): string {
  const d = parseDBTimestamp(date);
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export function formatRelativeTime(date: Date | string): string {
  const now = new Date();
  const d = parseDBTimestamp(date);
  const diff = now.getTime() - d.getTime();

  if (diff < 0) return "just now"; // Future timestamp safety

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (seconds < 30) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return formatDate(date);
}

export function generateId(): string {
  return crypto.randomUUID();
}

export function slugify(text: string): string {
  return text.toLowerCase().replace(/[^\w ]+/g, "").replace(/ +/g, "-");
}

export function truncate(text: string, length: number): string {
  if (text.length <= length) return text;
  return text.slice(0, length) + "...";
}

export function getInitials(firstName: string, lastName: string): string {
  return `${firstName[0] || ""}${lastName[0] || ""}`.toUpperCase();
}