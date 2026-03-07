import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { groupSchema } from "@/lib/validations";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const groups = await prisma.group.findMany({
    where: {
      members: { some: { userId: session.userId } },
    },
    include: {
      members: {
        include: { user: { select: { id: true, name: true, email: true } } },
      },
      _count: { select: { expenses: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json({ groups });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const parsed = groupSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
  }

  const group = await prisma.group.create({
    data: {
      ...parsed.data,
      members: {
        create: {
          userId: session.userId,
          role: "OWNER",
        },
      },
    },
    include: {
      members: {
        include: { user: { select: { id: true, name: true, email: true } } },
      },
    },
  });

  return NextResponse.json({ group }, { status: 201 });
}
