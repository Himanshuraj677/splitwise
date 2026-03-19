import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const existing = await prisma.lend.findFirst({
    where: { id: params.id, userId: session.userId },
    include: { returns: true },
  });

  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await request.json();

  if (body.principalAmount !== undefined) {
    const totalReturned = existing.returns.reduce((sum, entry) => sum + entry.amount, 0);
    if (body.principalAmount < totalReturned) {
      return NextResponse.json(
        { error: "Principal amount cannot be lower than already returned amount" },
        { status: 400 }
      );
    }
  }

  const lend = await prisma.lend.update({
    where: { id: params.id },
    data: {
      ...(body.friendName !== undefined && { friendName: body.friendName }),
      ...(body.friendContact !== undefined && { friendContact: body.friendContact || null }),
      ...(body.principalAmount !== undefined && { principalAmount: body.principalAmount }),
      ...(body.lentAt !== undefined && { lentAt: body.lentAt ? new Date(body.lentAt) : existing.lentAt }),
      ...(body.note !== undefined && { note: body.note || null }),
      ...(body.status !== undefined && { status: body.status }),
    },
  });

  return NextResponse.json({ lend });
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const existing = await prisma.lend.findFirst({
    where: { id: params.id, userId: session.userId },
  });

  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.lend.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
