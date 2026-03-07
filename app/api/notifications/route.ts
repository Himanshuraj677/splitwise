import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const notifications = await prisma.notification.findMany({
    where: { userId: session.userId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const unreadCount = await prisma.notification.count({
    where: { userId: session.userId, read: false },
  });

  return NextResponse.json({ notifications, unreadCount });
}

export async function PATCH(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { id, markAllRead } = body;

  if (markAllRead) {
    await prisma.notification.updateMany({
      where: { userId: session.userId, read: false },
      data: { read: true },
    });
    return NextResponse.json({ success: true });
  }

  if (id) {
    await prisma.notification.update({
      where: { id },
      data: { read: true },
    });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "No action specified" }, { status: 400 });
}
