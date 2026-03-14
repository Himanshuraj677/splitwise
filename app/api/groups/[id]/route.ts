import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { groupSchema } from "@/lib/validations";

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
        include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } },
      },
      expenses: {
        where: { isDeleted: false },
        include: {
          paidBy: { select: { id: true, name: true } },
          splits: {
            include: { user: { select: { id: true, name: true } } },
          },
        },
        orderBy: { date: "desc" },
      },
      settlements: {
        include: {
          payer: { select: { id: true, name: true } },
          receiver: { select: { id: true, name: true } },
        },
        orderBy: { date: "desc" },
      },
      invitations: {
        where: { status: "PENDING" },
      },
    },
  });

  if (!group) {
    return NextResponse.json({ error: "Group not found" }, { status: 404 });
  }

  // Calculate balances
  const balances: Record<string, number> = {};
  group.members.forEach((m) => {
    balances[m.userId] = 0;
  });

  group.expenses.forEach((expense) => {
    // The payer gets credit for the full amount
    if (balances[expense.paidById] !== undefined) {
      balances[expense.paidById] += expense.amount;
    }
    // Each split participant owes their share
    expense.splits.forEach((split) => {
      if (balances[split.userId] !== undefined) {
        balances[split.userId] -= split.amount;
      }
    });
  });

  // Account for settlements
  group.settlements.forEach((settlement) => {
    if (balances[settlement.payerId] !== undefined) {
      balances[settlement.payerId] += settlement.amount;
    }
    if (balances[settlement.receiverId] !== undefined) {
      balances[settlement.receiverId] -= settlement.amount;
    }
  });

  const memberBalances = group.members.map((m) => ({
    userId: m.userId,
    name: m.user.name,
    balance: balances[m.userId] || 0,
  }));

  // Compute simplified debts
  const debts = simplifyDebts(memberBalances);

  return NextResponse.json({ group, balances: memberBalances, debts });
}

function simplifyDebts(
  memberBalances: { userId: string; name: string; balance: number }[]
) {
  const debts: { from: string; fromName: string; to: string; toName: string; amount: number }[] = [];

  const debtors = memberBalances
    .filter((m) => m.balance < -0.01)
    .map((m) => ({ ...m, balance: -m.balance }))
    .sort((a, b) => b.balance - a.balance);

  const creditors = memberBalances
    .filter((m) => m.balance > 0.01)
    .sort((a, b) => b.balance - a.balance);

  let i = 0;
  let j = 0;

  while (i < debtors.length && j < creditors.length) {
    const amount = Math.min(debtors[i].balance, creditors[j].balance);
    if (amount > 0.01) {
      debts.push({
        from: debtors[i].userId,
        fromName: debtors[i].name,
        to: creditors[j].userId,
        toName: creditors[j].name,
        amount: Math.round(amount * 100) / 100,
      });
    }
    debtors[i].balance -= amount;
    creditors[j].balance -= amount;

    if (debtors[i].balance < 0.01) i++;
    if (creditors[j].balance < 0.01) j++;
  }

  return debts;
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = params;

  // Check if user is owner or admin
  const membership = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId: session.userId, groupId: id } },
  });

  if (!membership || membership.role === "MEMBER") {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = groupSchema.partial().safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
  }

  const group = await prisma.group.update({
    where: { id },
    data: parsed.data,
  });

  return NextResponse.json({ group });
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = params;

  const membership = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId: session.userId, groupId: id } },
  });

  if (!membership || membership.role !== "OWNER") {
    return NextResponse.json({ error: "Only the owner can delete a group" }, { status: 403 });
  }

  await prisma.group.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
