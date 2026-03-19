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

export const SUPPORTED_CURRENCIES = [
  { code: "INR", symbol: "₹", name: "Indian Rupee" },
  { code: "USD", symbol: "$", name: "US Dollar" },
  { code: "EUR", symbol: "€", name: "Euro" },
  { code: "GBP", symbol: "£", name: "British Pound" },
  { code: "JPY", symbol: "¥", name: "Japanese Yen" },
  { code: "AUD", symbol: "A$", name: "Australian Dollar" },
  { code: "CAD", symbol: "C$", name: "Canadian Dollar" },
  { code: "SGD", symbol: "S$", name: "Singapore Dollar" },
  { code: "AED", symbol: "د.إ", name: "UAE Dirham" },
] as const;

export const INCOME_TYPES = [
  { value: "SALARY", label: "Salary" },
  { value: "FREELANCE", label: "Freelance" },
  { value: "BUSINESS", label: "Business" },
  { value: "RENTAL", label: "Rental" },
  { value: "INTEREST", label: "Interest" },
  { value: "DIVIDEND", label: "Dividend" },
  { value: "BONUS", label: "Bonus" },
  { value: "REFUND", label: "Refund" },
  { value: "GIFT", label: "Gift" },
  { value: "OTHER", label: "Other" },
] as const;

export const INVESTMENT_TYPES = [
  { value: "STOCK", label: "Stocks" },
  { value: "MUTUAL_FUND", label: "Mutual Funds" },
  { value: "ETF", label: "ETF" },
  { value: "FIXED_DEPOSIT", label: "Fixed Deposit" },
  { value: "CRYPTO", label: "Crypto" },
  { value: "GOLD", label: "Gold" },
  { value: "REAL_ESTATE", label: "Real Estate" },
  { value: "PPF", label: "PPF" },
  { value: "NPS", label: "NPS" },
  { value: "BOND", label: "Bond" },
  { value: "OTHER", label: "Other" },
] as const;

export const LIABILITY_TYPES = [
  { value: "LOAN", label: "Loan" },
  { value: "CREDIT_CARD", label: "Credit Card" },
  { value: "MORTGAGE", label: "Mortgage" },
  { value: "PERSONAL_BORROW", label: "Personal Borrowing" },
  { value: "EMI", label: "EMI" },
  { value: "OTHER", label: "Other" },
] as const;

export const GOAL_STATUSES = [
  { value: "ACTIVE", label: "Active" },
  { value: "ACHIEVED", label: "Achieved" },
  { value: "PAUSED", label: "Paused" },
] as const;

export function humanizeEnum(value: string): string {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

// Approximate exchange rates to INR
const EXCHANGE_RATES_TO_INR: Record<string, number> = {
  INR: 1,
  USD: 83.5,
  EUR: 90.5,
  GBP: 105.5,
  JPY: 0.56,
  AUD: 54.5,
  CAD: 62.0,
  SGD: 62.5,
  AED: 22.7,
};

export function convertToGroupCurrency(amount: number, fromCurrency: string, toCurrency: string): number {
  if (fromCurrency === toCurrency) return amount;
  const inINR = amount * (EXCHANGE_RATES_TO_INR[fromCurrency] || 1);
  const result = inINR / (EXCHANGE_RATES_TO_INR[toCurrency] || 1);
  return Math.round(result * 100) / 100;
}
