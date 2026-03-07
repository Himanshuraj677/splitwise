import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { budgetSchema } from "@/lib/validations";
import { sendBudgetAlertEmail } from "@/lib/email";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const now = new Date();
  const month = parseInt(searchParams.get("month") || String(now.getMonth() + 1));
  const year = parseInt(searchParams.get("year") || String(now.getFullYear()));

  const budget = await prisma.budget.findUnique({
    where: { userId_month_year: { userId: session.userId, month, year } },
  });

  // Get spending for all categories this month
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59);

  const personalExpenses = await prisma.personalExpense.findMany({
    where: { userId: session.userId, date: { gte: start, lte: end } },
  });

  const groupExpenseSplits = await prisma.expenseSplit.findMany({
    where: {
      userId: session.userId,
      expense: { date: { gte: start, lte: end } },
    },
    include: { expense: { select: { category: true } } },
  });

  let totalSpent = 0;
  const categorySpent: Record<string, number> = {};

  personalExpenses.forEach((e) => {
    totalSpent += e.amount;
    categorySpent[e.category] = (categorySpent[e.category] || 0) + e.amount;
  });

  groupExpenseSplits.forEach((s) => {
    totalSpent += s.amount;
    const cat = s.expense.category;
    categorySpent[cat] = (categorySpent[cat] || 0) + s.amount;
  });

  const percentage = budget ? (totalSpent / budget.monthlyLimit) * 100 : null;

  // Send budget alert email if threshold crossed
  if (budget && percentage !== null && percentage >= 80) {
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { email: true, name: true },
    });
    if (user) {
      sendBudgetAlertEmail(
        user.email,
        user.name,
        percentage,
        totalSpent,
        budget.monthlyLimit,
        "INR"
      );
    }
  }

  return NextResponse.json({
    budget,
    totalSpent,
    categorySpent,
    remaining: budget ? budget.monthlyLimit - totalSpent : null,
    percentage,
  });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const parsed = budgetSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
  }

  const budget = await prisma.budget.upsert({
    where: {
      userId_month_year: {
        userId: session.userId,
        month: parsed.data.month,
        year: parsed.data.year,
      },
    },
    update: {
      monthlyLimit: parsed.data.monthlyLimit,
      categoryBudgets: parsed.data.categoryBudgets || {},
    },
    create: {
      userId: session.userId,
      ...parsed.data,
      categoryBudgets: parsed.data.categoryBudgets || {},
    },
  });

  return NextResponse.json({ budget });
}
