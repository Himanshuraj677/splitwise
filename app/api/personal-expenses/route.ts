import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { personalExpenseSchema } from "@/lib/validations";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const month = searchParams.get("month");
  const year = searchParams.get("year");

  const where: any = { userId: session.userId };

  if (month && year) {
    const start = new Date(parseInt(year), parseInt(month) - 1, 1);
    const end = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59);
    where.date = { gte: start, lte: end };
  }

  const expenses = await prisma.personalExpense.findMany({
    where,
    orderBy: { date: "desc" },
  });

  // Summary
  const total = expenses.reduce((sum, e) => sum + e.amount, 0);
  const categoryMap: Record<string, number> = {};
  expenses.forEach((e) => {
    categoryMap[e.category] = (categoryMap[e.category] || 0) + e.amount;
  });

  return NextResponse.json({
    expenses,
    summary: { total, categoryBreakdown: categoryMap },
  });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const parsed = personalExpenseSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
  }

  const expense = await prisma.personalExpense.create({
    data: {
      ...parsed.data,
      date: new Date(parsed.data.date),
      userId: session.userId,
    },
  });

  return NextResponse.json({ expense }, { status: 201 });
}
