import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const existing = await prisma.liability.findFirst({
    where: { id: params.id, userId: session.userId },
  });

  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await request.json();

  const liability = await prisma.liability.update({
    where: { id: params.id },
    data: {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.type !== undefined && { type: body.type }),
      ...(body.totalAmount !== undefined && { totalAmount: body.totalAmount }),
      ...(body.outstandingAmount !== undefined && { outstandingAmount: body.outstandingAmount }),
      ...(body.interestRate !== undefined && { interestRate: body.interestRate }),
      ...(body.minimumDue !== undefined && { minimumDue: body.minimumDue }),
      ...(body.dueDate !== undefined && {
        dueDate: body.dueDate ? new Date(body.dueDate) : null,
      }),
      ...(body.note !== undefined && { note: body.note || null }),
    },
  });

  return NextResponse.json({ liability });
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const existing = await prisma.liability.findFirst({
    where: { id: params.id, userId: session.userId },
  });

  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.liability.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
