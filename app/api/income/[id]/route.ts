import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const existing = await prisma.incomeEntry.findFirst({
    where: { id: params.id, userId: session.userId },
  });

  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await request.json();

  const entry = await prisma.incomeEntry.update({
    where: { id: params.id },
    data: {
      ...(body.source !== undefined && { source: body.source }),
      ...(body.type !== undefined && { type: body.type }),
      ...(body.amount !== undefined && { amount: body.amount }),
      ...(body.receivedAt !== undefined && { receivedAt: new Date(body.receivedAt) }),
      ...(body.recurring !== undefined && { recurring: !!body.recurring }),
      ...(body.note !== undefined && { note: body.note || null }),
    },
  });

  return NextResponse.json({ entry });
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const existing = await prisma.incomeEntry.findFirst({
    where: { id: params.id, userId: session.userId },
  });

  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.incomeEntry.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
