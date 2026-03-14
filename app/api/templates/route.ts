import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const groupId = searchParams.get("groupId");

  const where: any = { userId: session.userId };
  if (groupId) where.groupId = groupId;

  const templates = await prisma.expenseTemplate.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ templates });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { name, title, amount, category, splitType, splits, groupId } = body;

  if (!name?.trim() || !title?.trim()) {
    return NextResponse.json({ error: "Template name and expense title are required" }, { status: 400 });
  }

  const template = await prisma.expenseTemplate.create({
    data: {
      name: name.trim(),
      title: title.trim(),
      amount: amount ? parseFloat(amount) : null,
      category: category || "other",
      splitType: splitType || "EQUAL",
      splits: splits || null,
      groupId: groupId || null,
      userId: session.userId,
    },
  });

  return NextResponse.json({ template }, { status: 201 });
}

export async function DELETE(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Template id is required" }, { status: 400 });
  }

  const template = await prisma.expenseTemplate.findUnique({ where: { id } });
  if (!template || template.userId !== session.userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.expenseTemplate.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
