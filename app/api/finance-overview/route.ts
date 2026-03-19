import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.userId;
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  const [
    monthIncome,
    monthPersonalExpenses,
    monthGroupExpenses,
    investmentAgg,
    liabilityAgg,
    savingsAgg,
    activeGoals,
  ] = await Promise.all([
    prisma.incomeEntry.aggregate({
      where: { userId, receivedAt: { gte: startOfMonth, lte: endOfMonth } },
      _sum: { amount: true },
    }),
    prisma.personalExpense.aggregate({
      where: { userId, date: { gte: startOfMonth, lte: endOfMonth } },
      _sum: { amount: true },
    }),
    prisma.expenseSplit.aggregate({
      where: { userId, expense: { date: { gte: startOfMonth, lte: endOfMonth } } },
      _sum: { amount: true },
    }),
    prisma.investment.aggregate({
      where: { userId },
      _sum: { investedAmount: true, currentValue: true },
    }),
    prisma.liability.aggregate({
      where: { userId },
      _sum: { outstandingAmount: true },
    }),
    prisma.savingsGoal.aggregate({
      where: { userId },
      _sum: { currentAmount: true, targetAmount: true },
    }),
    prisma.savingsGoal.count({ where: { userId, status: "ACTIVE" } }),
  ]);

  const incomeThisMonth = monthIncome._sum.amount || 0;
  const personalExpensesThisMonth = monthPersonalExpenses._sum.amount || 0;
  const groupExpensesThisMonth = monthGroupExpenses._sum.amount || 0;
  const totalExpensesThisMonth = personalExpensesThisMonth + groupExpensesThisMonth;

  const totalInvested = investmentAgg._sum.investedAmount || 0;
  const totalInvestmentValue = investmentAgg._sum.currentValue || 0;
  const totalLiabilities = liabilityAgg._sum.outstandingAmount || 0;
  const totalGoalSavings = savingsAgg._sum.currentAmount || 0;
  const totalGoalTarget = savingsAgg._sum.targetAmount || 0;

  const monthlyCashflow = incomeThisMonth - totalExpensesThisMonth;
  const netWorth = totalInvestmentValue + totalGoalSavings - totalLiabilities;

  const trend: Array<{
    month: string;
    income: number;
    expenses: number;
    cashflow: number;
  }> = [];

  for (let i = 5; i >= 0; i--) {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);

    const [income, personal, group] = await Promise.all([
      prisma.incomeEntry.aggregate({
        where: { userId, receivedAt: { gte: start, lte: end } },
        _sum: { amount: true },
      }),
      prisma.personalExpense.aggregate({
        where: { userId, date: { gte: start, lte: end } },
        _sum: { amount: true },
      }),
      prisma.expenseSplit.aggregate({
        where: { userId, expense: { date: { gte: start, lte: end } } },
        _sum: { amount: true },
      }),
    ]);

    const monthIncomeValue = income._sum.amount || 0;
    const monthExpenseValue = (personal._sum.amount || 0) + (group._sum.amount || 0);

    trend.push({
      month: start.toLocaleDateString("en-US", { month: "short", year: "numeric" }),
      income: monthIncomeValue,
      expenses: monthExpenseValue,
      cashflow: monthIncomeValue - monthExpenseValue,
    });
  }

  return NextResponse.json({
    incomeThisMonth,
    personalExpensesThisMonth,
    groupExpensesThisMonth,
    totalExpensesThisMonth,
    monthlyCashflow,
    totalInvested,
    totalInvestmentValue,
    totalInvestmentGainLoss: totalInvestmentValue - totalInvested,
    totalLiabilities,
    totalGoalSavings,
    totalGoalTarget,
    activeGoals,
    netWorth,
    trend,
  });
}
