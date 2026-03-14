import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const groupId = searchParams.get("groupId");

  if (!groupId) {
    return NextResponse.json({ error: "groupId is required" }, { status: 400 });
  }

  // Verify membership
  const membership = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId: session.userId, groupId } },
  });

  if (!membership) {
    return NextResponse.json({ error: "Not a member" }, { status: 403 });
  }

  const cursor = searchParams.get("cursor");
  const take = 50;

  const messages = await prisma.chatMessage.findMany({
    where: { groupId },
    include: {
      user: { select: { id: true, name: true, avatarUrl: true } },
    },
    orderBy: { createdAt: "desc" },
    take,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  return NextResponse.json({
    messages: messages.reverse(),
    hasMore: messages.length === take,
    nextCursor: messages.length === take ? messages[0].id : null,
  });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { groupId, text } = body;

  if (!groupId || !text?.trim()) {
    return NextResponse.json({ error: "groupId and text are required" }, { status: 400 });
  }

  if (text.length > 2000) {
    return NextResponse.json({ error: "Message too long (max 2000 chars)" }, { status: 400 });
  }

  // Verify membership
  const membership = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId: session.userId, groupId } },
  });

  if (!membership) {
    return NextResponse.json({ error: "Not a member" }, { status: 403 });
  }

  const message = await prisma.chatMessage.create({
    data: {
      text: text.trim(),
      groupId,
      userId: session.userId,
    },
    include: {
      user: { select: { id: true, name: true, avatarUrl: true } },
    },
  });

  return NextResponse.json({ message }, { status: 201 });
}
