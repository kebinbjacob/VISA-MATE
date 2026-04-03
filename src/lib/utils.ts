import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: any) {
  if (!date) return "";
  
  let d: Date;
  
  // Handle Firestore Timestamp
  if (typeof date === 'object' && date !== null && 'seconds' in date) {
    d = new Date(date.seconds * 1000);
  } else {
    d = new Date(date);
  }

  // Check for invalid date
  if (isNaN(d.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("en-AE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(d);
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-AE", {
    style: "currency",
    currency: "AED",
    maximumFractionDigits: 0,
  }).format(amount);
}
