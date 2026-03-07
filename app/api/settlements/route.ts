import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { settlementSchema } from "@/lib/validations";
import { sendSettlementNotificationEmail } from "@/lib/email";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const groupId = searchParams.get("groupId");

  const where: any = {
    OR: [
      { payerId: session.userId },
      { receiverId: session.userId },
    ],
  };

  if (groupId) {
    where.groupId = groupId;
  }

  const settlements = await prisma.settlement.findMany({
    where,
    include: {
      payer: { select: { id: true, name: true } },
      receiver: { select: { id: true, name: true } },
      group: { select: { id: true, name: true } },
    },
    orderBy: { date: "desc" },
  });

  return NextResponse.json({ settlements });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const parsed = settlementSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
  }

  const { payerId, receiverId, amount, groupId, note } = parsed.data;

  // Verify both users are in the group
  const members = await prisma.groupMember.findMany({
    where: {
      groupId,
      userId: { in: [payerId, receiverId] },
    },
  });

  if (members.length < 2) {
    return NextResponse.json({ error: "Both users must be in the group" }, { status: 400 });
  }

  const settlement = await prisma.settlement.create({
    data: {
      payerId,
      receiverId,
      amount,
      groupId,
      note: note || null,
    },
    include: {
      payer: { select: { id: true, name: true } },
      receiver: { select: { id: true, name: true } },
      group: { select: { id: true, name: true } },
    },
  });

  // Notify the receiver
  await prisma.notification.create({
    data: {
      userId: receiverId,
      type: "SETTLEMENT",
      title: "Settlement Received",
      message: `${settlement.payer.name} settled ${amount} with you in "${settlement.group.name}"`,
      data: { groupId, settlementId: settlement.id },
    },
  });

  // Send email notification to receiver
  const receiverUser = await prisma.user.findUnique({
    where: { id: receiverId },
    select: { email: true, name: true },
  });
  const groupData = await prisma.group.findUnique({
    where: { id: groupId },
    select: { currency: true },
  });
  if (receiverUser) {
    sendSettlementNotificationEmail(
      receiverUser.email,
      receiverUser.name,
      settlement.payer.name,
      amount,
      settlement.group.name,
      groupData?.currency || "INR"
    );
  }

  return NextResponse.json({ settlement }, { status: 201 });
}
