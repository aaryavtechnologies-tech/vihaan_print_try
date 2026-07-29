import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function parseDate(dateStr: any): Date | null {
  if (!dateStr) return null;
  if (dateStr instanceof Date) {
    return isNaN(dateStr.getTime()) ? null : dateStr;
  }
  if (typeof dateStr !== "string") {
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d;
  }

  const cleanStr = dateStr.trim();
  if (!cleanStr || cleanStr.toLowerCase() === "invalid date") return null;

  // Try parsing dd/mm/yyyy or dd-mm-yyyy first
  const dmyRegex = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/;
  const match = cleanStr.match(dmyRegex);
  if (match) {
    const day = parseInt(match[1], 10);
    const month = parseInt(match[2], 10);
    const year = parseInt(match[3], 10);
    
    const date = new Date(year, month - 1, day);
    if (!isNaN(date.getTime()) && date.getDate() === day && date.getMonth() === month - 1) {
      return date;
    }
  }

  // Fallback to standard JS Date parsing
  const fallback = new Date(cleanStr);
  return isNaN(fallback.getTime()) ? null : fallback;
}
