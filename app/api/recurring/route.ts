import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const recurring = await prisma.recurringExpense.findMany({
    where: { userId: session.userId },
    orderBy: { nextDue: "asc" },
  });

  return NextResponse.json({ recurring });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { title, amount, category, frequency, nextDue, groupId } = body;

  if (!title || !amount || !frequency || !nextDue) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const recurring = await prisma.recurringExpense.create({
    data: {
      title,
      amount,
      category: category || "bills",
      frequency,
      nextDue: new Date(nextDue),
      groupId: groupId || null,
      userId: session.userId,
    },
  });

  return NextResponse.json({ recurring }, { status: 201 });
}
