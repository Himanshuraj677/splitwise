import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const existing = await prisma.recurringExpense.findFirst({
    where: { id: params.id, userId: session.userId },
  });

  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await request.json();
  const updated = await prisma.recurringExpense.update({
    where: { id: params.id },
    data: {
      ...(body.title !== undefined && { title: body.title }),
      ...(body.amount !== undefined && { amount: body.amount }),
      ...(body.category !== undefined && { category: body.category }),
      ...(body.frequency !== undefined && { frequency: body.frequency }),
      ...(body.nextDue !== undefined && { nextDue: new Date(body.nextDue) }),
      ...(body.groupId !== undefined && { groupId: body.groupId || null }),
      ...(body.active !== undefined && { active: !!body.active }),
    },
  });

  return NextResponse.json({ recurring: updated });
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const existing = await prisma.recurringExpense.findFirst({
    where: { id: params.id, userId: session.userId },
  });

  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.recurringExpense.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
