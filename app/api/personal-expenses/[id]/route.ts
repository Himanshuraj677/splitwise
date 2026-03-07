import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const expense = await prisma.personalExpense.findFirst({
    where: { id: params.id, userId: session.userId },
  });

  if (!expense) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json();
  const updated = await prisma.personalExpense.update({
    where: { id: params.id },
    data: {
      ...(body.amount !== undefined && { amount: body.amount }),
      ...(body.category && { category: body.category }),
      ...(body.date && { date: new Date(body.date) }),
      ...(body.note !== undefined && { note: body.note }),
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

  const expense = await prisma.personalExpense.findFirst({
    where: { id: params.id, userId: session.userId },
  });

  if (!expense) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.personalExpense.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
