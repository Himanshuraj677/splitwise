import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = params;

  // Verify membership
  const membership = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId: session.userId, groupId: id } },
  });

  if (!membership) {
    return NextResponse.json({ error: "Not a member" }, { status: 403 });
  }

  const group = await prisma.group.findUnique({
    where: { id },
    include: {
      members: {
        include: { user: { select: { id: true, name: true } } },
      },
      expenses: {
        where: { isDeleted: false, approvalStatus: "APPROVED" },
        include: { splits: true },
      },
      settlements: true,
    },
  });

  if (!group) {
    return NextResponse.json({ error: "Group not found" }, { status: 404 });
  }

  const memberMap = Object.fromEntries(
    group.members.map((m) => [m.userId, m.user.name])
  );

  // Stats per member
  const stats: Record<string, {
    userId: string;
    name: string;
    totalPaid: number;
    totalOwed: number;
    expenseCount: number;
    settlementsPaid: number;
    settlementsReceived: number;
    topCategory: string;
    categoryBreakdown: Record<string, number>;
  }> = {};

  group.members.forEach((m) => {
    stats[m.userId] = {
      userId: m.userId,
      name: m.user.name,
      totalPaid: 0,
      totalOwed: 0,
      expenseCount: 0,
      settlementsPaid: 0,
      settlementsReceived: 0,
      topCategory: "other",
      categoryBreakdown: {},
    };
  });

  group.expenses.forEach((expense) => {
    if (stats[expense.paidById]) {
      stats[expense.paidById].totalPaid += expense.amount;
      stats[expense.paidById].expenseCount += 1;
      stats[expense.paidById].categoryBreakdown[expense.category] =
        (stats[expense.paidById].categoryBreakdown[expense.category] || 0) + expense.amount;
    }
    expense.splits.forEach((split) => {
      if (stats[split.userId]) {
        stats[split.userId].totalOwed += split.amount;
      }
    });
  });

  group.settlements.forEach((s) => {
    if (stats[s.payerId]) stats[s.payerId].settlementsPaid += s.amount;
    if (stats[s.receiverId]) stats[s.receiverId].settlementsReceived += s.amount;
  });

  // Compute top category for each member
  Object.values(stats).forEach((s) => {
    const entries = Object.entries(s.categoryBreakdown);
    if (entries.length > 0) {
      s.topCategory = entries.sort((a, b) => b[1] - a[1])[0][0];
    }
  });

  const leaderboard = Object.values(stats).sort((a, b) => b.totalPaid - a.totalPaid);

  // Group-level stats
  const totalExpenses = group.expenses.reduce((sum, e) => sum + e.amount, 0);
  const totalSettlements = group.settlements.reduce((sum, s) => sum + s.amount, 0);
  const avgExpense = group.expenses.length > 0 ? totalExpenses / group.expenses.length : 0;

  // Most expensive expense
  const biggestExpense = group.expenses.sort((a, b) => b.amount - a.amount)[0] || null;

  // Category breakdown for group
  const groupCategories: Record<string, number> = {};
  group.expenses.forEach((e) => {
    groupCategories[e.category] = (groupCategories[e.category] || 0) + e.amount;
  });

  // Monthly trend
  const monthlyTrend: Record<string, number> = {};
  group.expenses.forEach((e) => {
    const month = new Date(e.date).toISOString().substring(0, 7);
    monthlyTrend[month] = (monthlyTrend[month] || 0) + e.amount;
  });

  return NextResponse.json({
    leaderboard,
    groupStats: {
      totalExpenses: Math.round(totalExpenses * 100) / 100,
      totalSettlements: Math.round(totalSettlements * 100) / 100,
      avgExpense: Math.round(avgExpense * 100) / 100,
      expenseCount: group.expenses.length,
      settlementCount: group.settlements.length,
      memberCount: group.members.length,
      biggestExpense: biggestExpense
        ? {
            title: biggestExpense.title,
            amount: biggestExpense.amount,
            paidBy: memberMap[biggestExpense.paidById] || "Unknown",
          }
        : null,
    },
    categoryBreakdown: groupCategories,
    monthlyTrend,
    currency: group.currency,
  });
}
