import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { commentSchema } from "@/lib/validations";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const expenseId = searchParams.get("expenseId");

  if (!expenseId) {
    return NextResponse.json({ error: "expenseId required" }, { status: 400 });
  }

  const comments = await prisma.comment.findMany({
    where: { expenseId },
    include: { user: { select: { id: true, name: true } } },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ comments });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const parsed = commentSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
  }

  const comment = await prisma.comment.create({
    data: {
      text: parsed.data.text,
      expenseId: parsed.data.expenseId,
      userId: session.userId,
    },
    include: { user: { select: { id: true, name: true } } },
  });

  return NextResponse.json({ comment }, { status: 201 });
}
