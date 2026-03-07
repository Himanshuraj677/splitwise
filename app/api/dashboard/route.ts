import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.userId;
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  // Get groups count
  const groupsCount = await prisma.groupMember.count({
    where: { userId },
  });

  // Get expenses this month where user is involved (splits)
  const monthExpenseSplits = await prisma.expenseSplit.findMany({
    where: {
      userId,
      expense: {
        date: { gte: startOfMonth, lte: endOfMonth },
      },
    },
    include: { expense: true },
  });

  const totalExpensesThisMonth = monthExpenseSplits.reduce(
    (sum, s) => sum + s.amount,
    0
  );

  // Calculate balances across all groups
  // Total paid by user in all expenses
  const allExpensesPaidByUser = await prisma.expense.aggregate({
    where: { paidById: userId },
    _sum: { amount: true },
  });

  // Total owed by user across all splits
  const allSplitsForUser = await prisma.expenseSplit.aggregate({
    where: { userId },
    _sum: { amount: true },
  });

  // Settlements paid by user
  const settlementsPaid = await prisma.settlement.aggregate({
    where: { payerId: userId },
    _sum: { amount: true },
  });

  // Settlements received by user
  const settlementsReceived = await prisma.settlement.aggregate({
    where: { receiverId: userId },
    _sum: { amount: true },
  });

  const totalPaid = allExpensesPaidByUser._sum.amount || 0;
  const totalOwed = allSplitsForUser._sum.amount || 0;
  const totalSettlementsPaid = settlementsPaid._sum.amount || 0;
  const totalSettlementsReceived = settlementsReceived._sum.amount || 0;

  // Net: positive means others owe you, negative means you owe
  const netBalance =
    totalPaid - totalOwed - totalSettlementsReceived + totalSettlementsPaid;

  const youAreOwed = Math.max(0, netBalance);
  const youOwe = Math.max(0, -netBalance);

  // Recent expenses (last 10)
  const recentExpenses = await prisma.expense.findMany({
    where: {
      group: {
        members: { some: { userId } },
      },
    },
    include: {
      paidBy: { select: { id: true, name: true } },
      group: { select: { id: true, name: true } },
      splits: {
        include: { user: { select: { id: true, name: true } } },
      },
    },
    orderBy: { date: "desc" },
    take: 10,
  });

  // Monthly spending for last 6 months
  const monthlySpending = [];
  for (let i = 5; i >= 0; i--) {
    const mStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const mEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
    const splits = await prisma.expenseSplit.aggregate({
      where: {
        userId,
        expense: { date: { gte: mStart, lte: mEnd } },
      },
      _sum: { amount: true },
    });
    monthlySpending.push({
      month: mStart.toLocaleDateString("en-US", { month: "short", year: "numeric" }),
      amount: splits._sum.amount || 0,
    });
  }

  // Category spending this month
  const categoryExpenses = await prisma.expenseSplit.findMany({
    where: {
      userId,
      expense: { date: { gte: startOfMonth, lte: endOfMonth } },
    },
    include: { expense: { select: { category: true } } },
  });

  const categoryMap: Record<string, number> = {};
  categoryExpenses.forEach((s) => {
    const cat = s.expense.category;
    categoryMap[cat] = (categoryMap[cat] || 0) + s.amount;
  });
  const categorySpending = Object.entries(categoryMap).map(([name, value]) => ({
    name,
    value,
  }));

  // Group spending summary
  const userGroups = await prisma.groupMember.findMany({
    where: { userId },
    include: { group: { select: { id: true, name: true } } },
  });

  const groupSpending = [];
  for (const gm of userGroups) {
    const total = await prisma.expenseSplit.aggregate({
      where: {
        userId,
        expense: { groupId: gm.groupId },
      },
      _sum: { amount: true },
    });
    groupSpending.push({
      name: gm.group.name,
      amount: total._sum.amount || 0,
    });
  }

  return NextResponse.json({
    totalExpensesThisMonth,
    youOwe,
    youAreOwed,
    groupsCount,
    recentExpenses,
    monthlySpending,
    categorySpending,
    groupSpending,
  });
}
