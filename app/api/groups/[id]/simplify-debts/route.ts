import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = params;

  const group = await prisma.group.findFirst({
    where: {
      id,
      members: { some: { userId: session.userId } },
    },
    include: {
      members: {
        include: { user: { select: { id: true, name: true } } },
      },
      expenses: {
        where: { isDeleted: false, approvalStatus: "APPROVED" },
        include: { splits: true },
      },
      settlements: true,
    },
  });

  if (!group) {
    return NextResponse.json({ error: "Group not found" }, { status: 404 });
  }

  // Calculate net balances
  const balances: Record<string, number> = {};
  group.members.forEach((m) => {
    balances[m.userId] = 0;
  });

  group.expenses.forEach((expense) => {
    if (balances[expense.paidById] !== undefined) {
      balances[expense.paidById] += expense.amount;
    }
    expense.splits.forEach((split) => {
      if (balances[split.userId] !== undefined) {
        balances[split.userId] -= split.amount;
      }
    });
  });

  group.settlements.forEach((settlement) => {
    if (balances[settlement.payerId] !== undefined) {
      balances[settlement.payerId] += settlement.amount;
    }
    if (balances[settlement.receiverId] !== undefined) {
      balances[settlement.receiverId] -= settlement.amount;
    }
  });

  const memberMap = Object.fromEntries(
    group.members.map((m) => [m.userId, m.user.name])
  );

  // Greedy algorithm to minimize number of transactions
  const debtors: { id: string; name: string; amount: number }[] = [];
  const creditors: { id: string; name: string; amount: number }[] = [];

  Object.entries(balances).forEach(([userId, balance]) => {
    if (balance < -0.01) {
      debtors.push({ id: userId, name: memberMap[userId], amount: -balance });
    } else if (balance > 0.01) {
      creditors.push({ id: userId, name: memberMap[userId], amount: balance });
    }
  });

  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);

  const simplifiedDebts: {
    from: string;
    fromName: string;
    to: string;
    toName: string;
    amount: number;
  }[] = [];

  let i = 0;
  let j = 0;

  while (i < debtors.length && j < creditors.length) {
    const amount = Math.min(debtors[i].amount, creditors[j].amount);
    if (amount > 0.01) {
      simplifiedDebts.push({
        from: debtors[i].id,
        fromName: debtors[i].name,
        to: creditors[j].id,
        toName: creditors[j].name,
        amount: Math.round(amount * 100) / 100,
      });
    }
    debtors[i].amount -= amount;
    creditors[j].amount -= amount;

    if (debtors[i].amount < 0.01) i++;
    if (creditors[j].amount < 0.01) j++;
  }

  // Original (unsimplified) debts count - for comparison
  const allPairDebts: Record<string, number> = {};
  group.expenses.forEach((expense) => {
    expense.splits.forEach((split) => {
      if (split.userId !== expense.paidById) {
        const key = `${split.userId}->${expense.paidById}`;
        allPairDebts[key] = (allPairDebts[key] || 0) + split.amount;
      }
    });
  });
  group.settlements.forEach((s) => {
    const key = `${s.payerId}->${s.receiverId}`;
    allPairDebts[key] = (allPairDebts[key] || 0) - s.amount;
  });
  const originalCount = Object.values(allPairDebts).filter((v) => Math.abs(v) > 0.01).length;

  return NextResponse.json({
    simplifiedDebts,
    simplifiedCount: simplifiedDebts.length,
    originalCount,
    savings: originalCount - simplifiedDebts.length,
    currency: group.currency,
  });
}
