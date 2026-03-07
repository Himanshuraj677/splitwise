import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency = "INR"): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatRelativeDate(date: Date | string): string {
  const d = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  return formatDate(date);
}

export const EXPENSE_CATEGORIES = [
  { value: "food", label: "Food & Dining", icon: "🍕" },
  { value: "transport", label: "Transport", icon: "🚗" },
  { value: "groceries", label: "Groceries", icon: "🛒" },
  { value: "entertainment", label: "Entertainment", icon: "🎬" },
  { value: "bills", label: "Bills & Utilities", icon: "💡" },
  { value: "shopping", label: "Shopping", icon: "🛍️" },
  { value: "travel", label: "Travel", icon: "✈️" },
  { value: "rent", label: "Rent", icon: "🏠" },
  { value: "health", label: "Health", icon: "🏥" },
  { value: "education", label: "Education", icon: "📚" },
  { value: "other", label: "Other", icon: "📦" },
] as const;

export function getCategoryInfo(value: string) {
  return (
    EXPENSE_CATEGORIES.find((c) => c.value === value) ?? {
      value: "other",
      label: "Other",
      icon: "📦",
    }
  );
}
