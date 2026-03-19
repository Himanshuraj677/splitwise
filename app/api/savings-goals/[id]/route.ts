import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const existing = await prisma.savingsGoal.findFirst({
    where: { id: params.id, userId: session.userId },
  });

  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await request.json();

  const goal = await prisma.savingsGoal.update({
    where: { id: params.id },
    data: {
      ...(body.title !== undefined && { title: body.title }),
      ...(body.targetAmount !== undefined && { targetAmount: body.targetAmount }),
      ...(body.currentAmount !== undefined && { currentAmount: body.currentAmount }),
      ...(body.status !== undefined && { status: body.status }),
      ...(body.targetDate !== undefined && {
        targetDate: body.targetDate ? new Date(body.targetDate) : null,
      }),
      ...(body.note !== undefined && { note: body.note || null }),
    },
  });

  return NextResponse.json({ goal });
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const existing = await prisma.savingsGoal.findFirst({
    where: { id: params.id, userId: session.userId },
  });

  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.savingsGoal.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
