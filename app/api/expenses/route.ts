import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { expenseSchema } from "@/lib/validations";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();

  const { groupId, ...rest } = body;
  if (!groupId) {
    return NextResponse.json({ error: "Group ID is required" }, { status: 400 });
  }

  const parsed = expenseSchema.safeParse(rest);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
  }

  // Verify user is in the group
  const membership = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId: session.userId, groupId } },
  });

  if (!membership) {
    return NextResponse.json({ error: "Not a member of this group" }, { status: 403 });
  }

  const { title, amount, paidById, category, date, note, splitType, splits } = parsed.data;

  // Compute split amounts based on type
  const computedSplits = computeSplits(splitType, amount, splits);

  const expense = await prisma.expense.create({
    data: {
      title,
      amount,
      paidById,
      groupId,
      category,
      date: new Date(date),
      note: note || null,
      splitType,
      splits: {
        create: computedSplits.map((s) => ({
          userId: s.userId,
          amount: s.amount,
          percentage: s.percentage,
          shares: s.shares,
        })),
      },
    },
    include: {
      paidBy: { select: { id: true, name: true } },
      splits: { include: { user: { select: { id: true, name: true } } } },
    },
  });

  // Notify participants
  const participantIds = splits
    .map((s: any) => s.userId)
    .filter((id: string) => id !== session.userId);

  for (const uid of participantIds) {
    await prisma.notification.create({
      data: {
        userId: uid,
        type: "NEW_EXPENSE",
        title: "New Expense",
        message: `${session.name} added "${title}" for ${amount} in a group`,
        data: { groupId, expenseId: expense.id },
      },
    });
  }

  return NextResponse.json({ expense }, { status: 201 });
}

function computeSplits(
  splitType: string,
  totalAmount: number,
  splits: { userId: string; amount?: number; percentage?: number; shares?: number }[]
) {
  switch (splitType) {
    case "EQUAL": {
      const perPerson = Math.round((totalAmount / splits.length) * 100) / 100;
      return splits.map((s) => ({
        userId: s.userId,
        amount: perPerson,
        percentage: null,
        shares: null,
      }));
    }
    case "EXACT": {
      return splits.map((s) => ({
        userId: s.userId,
        amount: s.amount || 0,
        percentage: null,
        shares: null,
      }));
    }
    case "PERCENTAGE": {
      return splits.map((s) => ({
        userId: s.userId,
        amount: Math.round((totalAmount * (s.percentage || 0)) / 100 * 100) / 100,
        percentage: s.percentage || 0,
        shares: null,
      }));
    }
    case "SHARES": {
      const totalShares = splits.reduce((sum, s) => sum + (s.shares || 1), 0);
      return splits.map((s) => ({
        userId: s.userId,
        amount: Math.round((totalAmount * (s.shares || 1)) / totalShares * 100) / 100,
        percentage: null,
        shares: s.shares || 1,
      }));
    }
    default:
      return splits.map((s) => ({
        userId: s.userId,
        amount: totalAmount / splits.length,
        percentage: null,
        shares: null,
      }));
  }
}
