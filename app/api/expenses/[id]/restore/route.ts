import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
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

  if (!expense.isDeleted) {
    return NextResponse.json({ error: "Expense is not deleted" }, { status: 400 });
  }

  const isMember = expense.group.members.some(
    (m) => m.userId === session.userId
  );
  if (!isMember) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  // Only allow restore within 30 days
  if (expense.deletedAt) {
    const daysSinceDelete = (Date.now() - expense.deletedAt.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceDelete > 30) {
      return NextResponse.json({ error: "Cannot restore expenses deleted more than 30 days ago" }, { status: 400 });
    }
  }

  const restored = await prisma.expense.update({
    where: { id },
    data: { isDeleted: false, deletedAt: null },
    include: {
      paidBy: { select: { id: true, name: true } },
      splits: { include: { user: { select: { id: true, name: true } } } },
    },
  });

  return NextResponse.json({ expense: restored });
}
