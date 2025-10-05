import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-SA", {
    style: "currency",
    currency: "SAR",
  }).format(amount);
}

export function formatDate(date: Date | string): string {
  return new Intl.DateFormat("en-SA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(date));
}

export function getPaymentStatus(
  totalAmount: number,
  paidAmount: number
): "paid" | "partial" | "unpaid" {
  if (paidAmount === 0) return "unpaid";
  if (paidAmount >= totalAmount) return "paid";
  return "partial";
}
