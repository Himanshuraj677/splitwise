import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendReminderEmail } from "@/lib/email";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") || "sent"; // sent or received

  const where =
    type === "received"
      ? { toUserId: session.userId }
      : { fromUserId: session.userId };

  const reminders = await prisma.reminder.findMany({
    where,
    include: {
      fromUser: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  // Get toUser info separately
  const toUserIds = Array.from(new Set(reminders.map((r) => r.toUserId)));
  const toUsers = await prisma.user.findMany({
    where: { id: { in: toUserIds } },
    select: { id: true, name: true, email: true },
  });
  const toUserMap = Object.fromEntries(toUsers.map((u) => [u.id, u]));

  const enriched = reminders.map((r) => ({
    ...r,
    toUser: toUserMap[r.toUserId] || { id: r.toUserId, name: "Unknown" },
  }));

  return NextResponse.json({ reminders: enriched });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { toUserId, amount, groupId, message } = body;

  if (!toUserId) {
    return NextResponse.json({ error: "toUserId is required" }, { status: 400 });
  }

  if (toUserId === session.userId) {
    return NextResponse.json({ error: "Cannot send reminder to yourself" }, { status: 400 });
  }

  const toUser = await prisma.user.findUnique({
    where: { id: toUserId },
    select: { id: true, name: true, email: true },
  });

  if (!toUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const reminderMessage =
    message || `${session.name} is reminding you about a pending payment${amount ? ` of ₹${amount}` : ""}`;

  const reminder = await prisma.reminder.create({
    data: {
      message: reminderMessage,
      amount: amount ? parseFloat(amount) : null,
      groupId: groupId || null,
      fromUserId: session.userId,
      toUserId,
      status: "SENT",
      sentAt: new Date(),
    },
    include: {
      fromUser: { select: { id: true, name: true } },
    },
  });

  // Create notification
  await prisma.notification.create({
    data: {
      userId: toUserId,
      type: "REMINDER",
      title: "Payment Reminder",
      message: reminderMessage,
      data: { fromUserId: session.userId, amount, groupId },
    },
  });

  // Send email
  try {
    await sendReminderEmail(
      toUser.email,
      toUser.name,
      session.name,
      amount,
      message
    );
  } catch {}

  return NextResponse.json({ reminder }, { status: 201 });
}

export async function PATCH(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { reminderId, status } = body;

  if (!reminderId || !status) {
    return NextResponse.json({ error: "reminderId and status required" }, { status: 400 });
  }

  const reminder = await prisma.reminder.findUnique({
    where: { id: reminderId },
  });

  if (!reminder || reminder.toUserId !== session.userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const updated = await prisma.reminder.update({
    where: { id: reminderId },
    data: { status },
  });

  return NextResponse.json({ reminder: updated });
}
