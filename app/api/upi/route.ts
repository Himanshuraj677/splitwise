import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const receiverId = searchParams.get("receiverId");
  const amount = searchParams.get("amount");
  const groupId = searchParams.get("groupId");

  if (!receiverId || !amount) {
    return NextResponse.json({ error: "receiverId and amount are required" }, { status: 400 });
  }

  // Get receiver's UPI info (email as fallback)
  const receiver = await prisma.user.findUnique({
    where: { id: receiverId },
    select: { name: true, email: true },
  });

  if (!receiver) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  let groupName = "";
  if (groupId) {
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      select: { name: true },
    });
    groupName = group?.name || "";
  }

  const note = groupName
    ? `Settlement for ${groupName}`
    : "LedgerNest Settlement";

  // Generate UPI deep link
  // Standard UPI intent format: upi://pay?pa=<UPI_ID>&pn=<NAME>&am=<AMOUNT>&tn=<NOTE>
  const upiLink = `upi://pay?pn=${encodeURIComponent(receiver.name)}&am=${amount}&tn=${encodeURIComponent(note)}&cu=INR`;

  return NextResponse.json({
    upiLink,
    receiverName: receiver.name,
    amount: parseFloat(amount),
    note,
  });
}
