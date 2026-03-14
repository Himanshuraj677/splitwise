import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = params;
  const body = await request.json();

  const expense = await prisma.expense.findUnique({
    where: { id },
    include: { group: { include: { members: true } } },
  });

  if (!expense) {
    return NextResponse.json({ error: "Expense not found" }, { status: 404 });
  }

  const isMember = expense.group.members.some(
    (m) => m.userId === session.userId
  );
  if (!isMember) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const { title, amount, category, date, note } = body;

  const updated = await prisma.expense.update({
    where: { id },
    data: {
      ...(title !== undefined && title !== "" && { title }),
      ...(amount !== undefined && amount !== null && { amount: Number(amount) }),
      ...(category !== undefined && { category }),
      ...(date !== undefined && { date: new Date(date) }),
      ...(note !== undefined && { note }),
    },
    include: {
      paidBy: { select: { id: true, name: true } },
      splits: { include: { user: { select: { id: true, name: true } } } },
    },
  });

  // If amount changed, recalculate splits proportionally
  if (amount !== undefined && amount !== null && Number(amount) !== expense.amount) {
    const newAmount = Number(amount);
    const oldAmount = expense.amount;
    const existingSplits = await prisma.expenseSplit.findMany({
      where: { expenseId: id },
    });

    for (const split of existingSplits) {
      const ratio = oldAmount > 0 ? split.amount / oldAmount : 1 / existingSplits.length;
      const newSplitAmount = Math.round(ratio * newAmount * 100) / 100;
      await prisma.expenseSplit.update({
        where: { id: split.id },
        data: { amount: newSplitAmount },
      });
    }

    // Re-fetch to return updated splits
    const refreshed = await prisma.expense.findUnique({
      where: { id },
      include: {
        paidBy: { select: { id: true, name: true } },
        splits: { include: { user: { select: { id: true, name: true } } } },
      },
    });
    return NextResponse.json({ expense: refreshed });
  }

  return NextResponse.json({ expense: updated });
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = params;

  const expense = await prisma.expense.findUnique({
    where: { id },
    include: { group: { include: { members: true } } },
  });

  if (!expense) {
    return NextResponse.json({ error: "Expense not found" }, { status: 404 });
  }

  const isMember = expense.group.members.some(
    (m) => m.userId === session.userId
  );
  if (!isMember) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  await prisma.expense.update({
    where: { id },
    data: { isDeleted: true, deletedAt: new Date() },
  });
  return NextResponse.json({ success: true });
}
