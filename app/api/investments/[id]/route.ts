import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const existing = await prisma.investment.findFirst({
    where: { id: params.id, userId: session.userId },
  });

  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await request.json();

  const investment = await prisma.investment.update({
    where: { id: params.id },
    data: {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.type !== undefined && { type: body.type }),
      ...(body.investedAmount !== undefined && { investedAmount: body.investedAmount }),
      ...(body.currentValue !== undefined && { currentValue: body.currentValue }),
      ...(body.investedAt !== undefined && { investedAt: new Date(body.investedAt) }),
      ...(body.platform !== undefined && { platform: body.platform || null }),
      ...(body.note !== undefined && { note: body.note || null }),
    },
  });

  return NextResponse.json({ investment });
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const existing = await prisma.investment.findFirst({
    where: { id: params.id, userId: session.userId },
  });

  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.investment.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
