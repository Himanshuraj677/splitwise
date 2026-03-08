import { z } from "zod";

export const registerSchema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Invalid email address"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
});

export const verifyEmailSchema = z.object({
  email: z.string().email("Invalid email address"),
  otp: z.string().length(6, "Verification code must be 6 digits"),
});

export const resetPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
  otp: z.string().length(6, "Reset code must be 6 digits"),
  newPassword: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export const groupSchema = z.object({
  name: z.string().min(1, "Group name is required"),
  description: z.string().optional(),
  currency: z.string().default("INR"),
  groupType: z.enum(["TRIP", "ROOMMATES", "FRIENDS", "COUPLE", "CUSTOM"]).default("FRIENDS"),
});

export const expenseSchema = z.object({
  title: z.string().min(1, "Title is required"),
  amount: z.number().positive("Amount must be positive"),
  paidById: z.string().min(1, "Payer is required"),
  category: z.string().default("other"),
  date: z.string(),
  note: z.string().optional(),
  splitType: z.enum(["EQUAL", "EXACT", "PERCENTAGE", "SHARES"]).default("EQUAL"),
  splits: z.array(
    z.object({
      userId: z.string(),
      amount: z.number().optional(),
      percentage: z.number().optional(),
      shares: z.number().optional(),
    })
  ).min(1, "At least one split member is required"),
});

export const settlementSchema = z.object({
  payerId: z.string().min(1, "Payer is required"),
  receiverId: z.string().min(1, "Receiver is required"),
  amount: z.number().positive("Amount must be positive"),
  groupId: z.string().min(1, "Group is required"),
  note: z.string().optional(),
});

export const personalExpenseSchema = z.object({
  amount: z.number().positive("Amount must be positive"),
  category: z.string().default("other"),
  date: z.string(),
  note: z.string().optional(),
});

export const budgetSchema = z.object({
  monthlyLimit: z.number().positive("Budget must be positive"),
  categoryBudgets: z.record(z.number()).optional(),
  month: z.number().min(1).max(12),
  year: z.number().min(2020),
});

export const inviteSchema = z.object({
  email: z.string().email("Invalid email address"),
  groupId: z.string().min(1),
});

export const commentSchema = z.object({
  text: z.string().min(1, "Comment cannot be empty"),
  expenseId: z.string().min(1),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type GroupInput = z.infer<typeof groupSchema>;
export type ExpenseInput = z.infer<typeof expenseSchema>;
export type SettlementInput = z.infer<typeof settlementSchema>;
export type PersonalExpenseInput = z.infer<typeof personalExpenseSchema>;
export type BudgetInput = z.infer<typeof budgetSchema>;
export type InviteInput = z.infer<typeof inviteSchema>;
export type CommentInput = z.infer<typeof commentSchema>;
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
