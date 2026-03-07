import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const groupId = searchParams.get("groupId");

  const now = new Date();

  // Monthly spending for last 12 months
  const monthlyData = [];
  for (let i = 11; i >= 0; i--) {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);

    const where: any = {
      userId: session.userId,
      expense: { date: { gte: start, lte: end } },
    };
    if (groupId) where.expense.groupId = groupId;

    const splits = await prisma.expenseSplit.aggregate({
      where,
      _sum: { amount: true },
    });

    monthlyData.push({
      month: start.toLocaleDateString("en-US", { month: "short", year: "numeric" }),
      amount: splits._sum.amount || 0,
    });
  }

  // Category breakdown (all time or by group)
  const categoryWhere: any = { userId: session.userId };
  if (groupId) categoryWhere.expense = { groupId };

  const categorySplits = await prisma.expenseSplit.findMany({
    where: categoryWhere,
    include: { expense: { select: { category: true } } },
  });

  const categoryMap: Record<string, number> = {};
  categorySplits.forEach((s) => {
    const cat = s.expense.category;
    categoryMap[cat] = (categoryMap[cat] || 0) + s.amount;
  });

  const categoryBreakdown = Object.entries(categoryMap)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  // If group-specific, get member contributions
  let memberContributions: { name: string; amount: number }[] = [];
  if (groupId) {
    const members = await prisma.groupMember.findMany({
      where: { groupId },
      include: { user: { select: { id: true, name: true } } },
    });

    for (const member of members) {
      const total = await prisma.expense.aggregate({
        where: { groupId, paidById: member.userId },
        _sum: { amount: true },
      });
      memberContributions.push({
        name: member.user.name,
        amount: total._sum.amount || 0,
      });
    }
  }

  // Total spending
  const totalSpending = monthlyData.reduce((sum, m) => sum + m.amount, 0);

  return NextResponse.json({
    monthlyData,
    categoryBreakdown,
    memberContributions,
    totalSpending,
  });
}
