import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { incomeEntrySchema } from "@/lib/validations";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const month = searchParams.get("month");
  const year = searchParams.get("year");

  const where: any = { userId: session.userId };
  if (month && year) {
    const start = new Date(parseInt(year, 10), parseInt(month, 10) - 1, 1);
    const end = new Date(parseInt(year, 10), parseInt(month, 10), 0, 23, 59, 59);
    where.receivedAt = { gte: start, lte: end };
  }

  const entries = await prisma.incomeEntry.findMany({
    where,
    orderBy: { receivedAt: "desc" },
  });

  const total = entries.reduce((sum, e) => sum + e.amount, 0);
  const typeBreakdown: Record<string, number> = {};
  entries.forEach((e) => {
    typeBreakdown[e.type] = (typeBreakdown[e.type] || 0) + e.amount;
  });

  return NextResponse.json({
    entries,
    summary: {
      total,
      recurringCount: entries.filter((e) => e.recurring).length,
      typeBreakdown,
    },
  });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const parsed = incomeEntrySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
  }

  const entry = await prisma.incomeEntry.create({
    data: {
      source: parsed.data.source,
      type: parsed.data.type,
      amount: parsed.data.amount,
      receivedAt: new Date(parsed.data.receivedAt),
      recurring: parsed.data.recurring ?? false,
      note: parsed.data.note || null,
      userId: session.userId,
    },
  });

  return NextResponse.json({ entry }, { status: 201 });
}
