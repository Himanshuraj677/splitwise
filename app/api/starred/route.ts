import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const starred = await prisma.starredExpense.findMany({
    where: { userId: session.userId },
    include: {
      expense: {
        include: {
          paidBy: { select: { id: true, name: true } },
          group: { select: { id: true, name: true, currency: true } },
          splits: {
            include: { user: { select: { id: true, name: true } } },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    starred: starred
      .filter((s) => !s.expense.isDeleted)
      .map((s) => ({ ...s.expense, starredAt: s.createdAt })),
  });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { expenseId } = body;

  if (!expenseId) {
    return NextResponse.json({ error: "expenseId is required" }, { status: 400 });
  }

  // Verify expense exists and user has access
  const expense = await prisma.expense.findUnique({
    where: { id: expenseId },
    include: { group: { include: { members: true } } },
  });

  if (!expense) {
    return NextResponse.json({ error: "Expense not found" }, { status: 404 });
  }

  const isMember = expense.group.members.some((m) => m.userId === session.userId);
  if (!isMember) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  // Toggle star
  const existing = await prisma.starredExpense.findUnique({
    where: { userId_expenseId: { userId: session.userId, expenseId } },
  });

  if (existing) {
    await prisma.starredExpense.delete({
      where: { id: existing.id },
    });
    return NextResponse.json({ starred: false });
  } else {
    await prisma.starredExpense.create({
      data: { userId: session.userId, expenseId },
    });
    return NextResponse.json({ starred: true });
  }
}
