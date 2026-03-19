import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { liabilitySchema } from "@/lib/validations";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const liabilities = await prisma.liability.findMany({
    where: { userId: session.userId },
    orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
  });

  const totalOutstanding = liabilities.reduce((sum, l) => sum + l.outstandingAmount, 0);
  const totalOriginal = liabilities.reduce((sum, l) => sum + l.totalAmount, 0);

  return NextResponse.json({
    liabilities,
    summary: {
      totalOutstanding,
      totalOriginal,
      paidOff: totalOriginal - totalOutstanding,
    },
  });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const parsed = liabilitySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
  }

  const liability = await prisma.liability.create({
    data: {
      name: parsed.data.name,
      type: parsed.data.type,
      totalAmount: parsed.data.totalAmount,
      outstandingAmount: parsed.data.outstandingAmount,
      interestRate: parsed.data.interestRate,
      minimumDue: parsed.data.minimumDue,
      dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
      note: parsed.data.note || null,
      userId: session.userId,
    },
  });

  return NextResponse.json({ liability }, { status: 201 });
}
