import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { expenseSchema } from "@/lib/validations";
import { sendExpenseNotificationEmail } from "@/lib/email";

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

  if (!splits || splits.length === 0) {
    return NextResponse.json({ error: "At least one split member is required" }, { status: 400 });
  }

  // Validate paidById is a group member
  const paidByMember = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId: paidById, groupId } },
  });
  if (!paidByMember) {
    return NextResponse.json({ error: "Payer must be a group member" }, { status: 400 });
  }

  // Validate all split userIds are group members
  const splitUserIds = splits.map((s: any) => s.userId);
  const splitMembers = await prisma.groupMember.findMany({
    where: { groupId, userId: { in: splitUserIds } },
  });
  if (splitMembers.length !== splitUserIds.length) {
    return NextResponse.json({ error: "All split members must be in the group" }, { status: 400 });
  }

  // Validate split amounts based on type
  if (splitType === "EXACT") {
    const total = splits.reduce((sum: number, s: any) => sum + (s.amount || 0), 0);
    if (Math.abs(total - amount) > 0.01) {
      return NextResponse.json(
        { error: `Exact amounts must sum to ${amount}. Current total: ${total}` },
        { status: 400 }
      );
    }
  } else if (splitType === "PERCENTAGE") {
    const totalPct = splits.reduce((sum: number, s: any) => sum + (s.percentage || 0), 0);
    if (Math.abs(totalPct - 100) > 0.01) {
      return NextResponse.json(
        { error: `Percentages must sum to 100%. Current total: ${totalPct}%` },
        { status: 400 }
      );
    }
  } else if (splitType === "SHARES") {
    const totalShares = splits.reduce((sum: number, s: any) => sum + (s.shares || 0), 0);
    if (totalShares <= 0) {
      return NextResponse.json({ error: "Total shares must be greater than 0" }, { status: 400 });
    }
  }

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

  // Get group info for email
  const group = await prisma.group.findUnique({
    where: { id: groupId },
    select: { name: true, currency: true },
  });

  for (const uid of participantIds) {
    await prisma.notification.create({
      data: {
        userId: uid,
        type: "NEW_EXPENSE",
        title: "New Expense",
        message: `${session.name} added "${title}" for ${amount} in "${group?.name}"`,
        data: { groupId, expenseId: expense.id },
      },
    });

    // Send email notification
    const participant = expense.splits.find((s) => s.user.id === uid);
    if (participant) {
      const user = await prisma.user.findUnique({
        where: { id: uid },
        select: { email: true, name: true },
      });
      if (user) {
        sendExpenseNotificationEmail(
          user.email,
          user.name,
          session.name,
          title,
          amount,
          participant.amount,
          group?.name || "a group",
          group?.currency || "INR"
        );
      }
    }
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
      const result = splits.map((s) => ({
        userId: s.userId,
        amount: perPerson,
        percentage: null,
        shares: null,
      }));
      // Assign rounding remainder to last person
      const distributed = perPerson * splits.length;
      const remainder = Math.round((totalAmount - distributed) * 100) / 100;
      if (remainder !== 0 && result.length > 0) {
        result[result.length - 1].amount = Math.round((result[result.length - 1].amount + remainder) * 100) / 100;
      }
      return result;
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
