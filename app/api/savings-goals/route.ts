import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { savingsGoalSchema } from "@/lib/validations";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const goals = await prisma.savingsGoal.findMany({
    where: { userId: session.userId },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });

  const totalTarget = goals.reduce((sum, g) => sum + g.targetAmount, 0);
  const totalSaved = goals.reduce((sum, g) => sum + g.currentAmount, 0);

  return NextResponse.json({
    goals,
    summary: {
      totalTarget,
      totalSaved,
      completion: totalTarget > 0 ? (totalSaved / totalTarget) * 100 : 0,
    },
  });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const parsed = savingsGoalSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
  }

  const goal = await prisma.savingsGoal.create({
    data: {
      title: parsed.data.title,
      targetAmount: parsed.data.targetAmount,
      currentAmount: parsed.data.currentAmount ?? 0,
      targetDate: parsed.data.targetDate ? new Date(parsed.data.targetDate) : null,
      status: parsed.data.status ?? "ACTIVE",
      note: parsed.data.note || null,
      userId: session.userId,
    },
  });

  return NextResponse.json({ goal }, { status: 201 });
}
