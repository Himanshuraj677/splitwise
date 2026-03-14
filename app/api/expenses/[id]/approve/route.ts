import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = params;
  const body = await request.json();
  const { action } = body; // "approve" or "reject"

  if (!action || !["approve", "reject"].includes(action)) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const expense = await prisma.expense.findUnique({
    where: { id },
    include: {
      group: { include: { members: true } },
      paidBy: { select: { id: true, name: true } },
    },
  });

  if (!expense) {
    return NextResponse.json({ error: "Expense not found" }, { status: 404 });
  }

  // Only OWNER or ADMIN can approve/reject
  const membership = expense.group.members.find(
    (m) => m.userId === session.userId
  );

  if (!membership || membership.role === "MEMBER") {
    return NextResponse.json({ error: "Only admins can approve or reject expenses" }, { status: 403 });
  }

  if (expense.approvalStatus !== "PENDING") {
    return NextResponse.json({ error: "Expense is not pending approval" }, { status: 400 });
  }

  const newStatus = action === "approve" ? "APPROVED" : "REJECTED";

  const updated = await prisma.expense.update({
    where: { id },
    data: { approvalStatus: newStatus },
    include: {
      paidBy: { select: { id: true, name: true } },
      splits: { include: { user: { select: { id: true, name: true } } } },
    },
  });

  // Notify the expense creator
  const notificationType = action === "approve" ? "EXPENSE_APPROVED" : "EXPENSE_REJECTED";
  await prisma.notification.create({
    data: {
      userId: expense.paidById,
      type: notificationType,
      title: action === "approve" ? "Expense Approved" : "Expense Rejected",
      message: `${session.name} ${action}d your expense "${expense.title}" (₹${expense.amount})`,
      data: { expenseId: id, groupId: expense.groupId },
    },
  });

  // Log activity
  await prisma.activityLog.create({
    data: {
      action: `EXPENSE_${newStatus}`,
      detail: `${session.name} ${action}d "${expense.title}" (₹${expense.amount})`,
      groupId: expense.groupId,
      userId: session.userId,
    },
  });

  return NextResponse.json({ expense: updated });
}
