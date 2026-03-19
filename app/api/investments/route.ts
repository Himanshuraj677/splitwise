import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { investmentSchema } from "@/lib/validations";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const investments = await prisma.investment.findMany({
    where: { userId: session.userId },
    orderBy: { investedAt: "desc" },
  });

  const totalInvested = investments.reduce((sum, i) => sum + i.investedAmount, 0);
  const totalCurrentValue = investments.reduce((sum, i) => sum + i.currentValue, 0);

  return NextResponse.json({
    investments,
    summary: {
      totalInvested,
      totalCurrentValue,
      totalGainLoss: totalCurrentValue - totalInvested,
    },
  });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const parsed = investmentSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
  }

  const investment = await prisma.investment.create({
    data: {
      name: parsed.data.name,
      type: parsed.data.type,
      investedAmount: parsed.data.investedAmount,
      currentValue: parsed.data.currentValue,
      investedAt: new Date(parsed.data.investedAt),
      platform: parsed.data.platform || null,
      note: parsed.data.note || null,
      userId: session.userId,
    },
  });

  return NextResponse.json({ investment }, { status: 201 });
}
