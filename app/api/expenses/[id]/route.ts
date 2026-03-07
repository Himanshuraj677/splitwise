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
      ...(title && { title }),
      ...(amount && { amount }),
      ...(category && { category }),
      ...(date && { date: new Date(date) }),
      ...(note !== undefined && { note }),
    },
    include: {
      paidBy: { select: { id: true, name: true } },
      splits: { include: { user: { select: { id: true, name: true } } } },
    },
  });

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

  await prisma.expense.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
