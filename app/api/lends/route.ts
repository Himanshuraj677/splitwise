import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { lendSchema } from "@/lib/validations";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const lends = await prisma.lend.findMany({
    where: { userId: session.userId },
    include: {
      returns: {
        orderBy: { returnedAt: "desc" },
      },
    },
    orderBy: { lentAt: "desc" },
  });

  const enriched = lends.map((lend) => {
    const totalReturned = lend.returns.reduce((sum, entry) => sum + entry.amount, 0);
    const outstanding = Math.max(lend.principalAmount - totalReturned, 0);

    return {
      ...lend,
      totalReturned,
      outstanding,
    };
  });

  const summary = enriched.reduce(
    (acc, lend) => {
      acc.totalLent += lend.principalAmount;
      acc.totalReturned += lend.totalReturned;
      acc.totalOutstanding += lend.outstanding;
      if (lend.outstanding > 0) acc.activeLends += 1;
      return acc;
    },
    { totalLent: 0, totalReturned: 0, totalOutstanding: 0, activeLends: 0 }
  );

  return NextResponse.json({ lends: enriched, summary });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const parsed = lendSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
  }

  const lend = await prisma.lend.create({
    data: {
      userId: session.userId,
      friendName: parsed.data.friendName,
      friendContact: parsed.data.friendContact || null,
      principalAmount: parsed.data.principalAmount,
      lentAt: parsed.data.lentAt ? new Date(parsed.data.lentAt) : new Date(),
      note: parsed.data.note || null,
    },
  });

  return NextResponse.json({ lend }, { status: 201 });
}
