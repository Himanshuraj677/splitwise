import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { lendReturnSchema } from "@/lib/validations";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const lend = await prisma.lend.findFirst({
    where: { id: params.id, userId: session.userId },
    include: { returns: true },
  });

  if (!lend) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await request.json();
  const parsed = lendReturnSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
  }

  const alreadyReturned = lend.returns.reduce((sum, entry) => sum + entry.amount, 0);
  const outstanding = lend.principalAmount - alreadyReturned;

  if (parsed.data.amount > outstanding) {
    return NextResponse.json(
      { error: "Return amount is greater than outstanding lend" },
      { status: 400 }
    );
  }

  const result = await prisma.$transaction(async (tx) => {
    const returnEntry = await tx.lendReturn.create({
      data: {
        lendId: lend.id,
        amount: parsed.data.amount,
        returnedAt: parsed.data.returnedAt ? new Date(parsed.data.returnedAt) : new Date(),
        note: parsed.data.note || null,
      },
    });

    const nextOutstanding = outstanding - parsed.data.amount;

    const updatedLend = await tx.lend.update({
      where: { id: lend.id },
      data: {
        status: nextOutstanding <= 0 ? "CLOSED" : "OPEN",
      },
    });

    return { returnEntry, lend: updatedLend, outstanding: Math.max(nextOutstanding, 0) };
  });

  return NextResponse.json(result, { status: 201 });
}
