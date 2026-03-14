import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") || "";
  const groupId = searchParams.get("groupId");
  const category = searchParams.get("category");
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");
  const minAmount = searchParams.get("minAmount");
  const maxAmount = searchParams.get("maxAmount");
  const tag = searchParams.get("tag");
  const splitType = searchParams.get("splitType");
  const page = parseInt(searchParams.get("page") || "1");
  const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100);

  // Get user's groups
  const memberships = await prisma.groupMember.findMany({
    where: { userId: session.userId },
    select: { groupId: true },
  });
  const groupIds = memberships.map((m) => m.groupId);

  // Build where clause
  const where: any = {
    isDeleted: false,
    groupId: groupId ? groupId : { in: groupIds },
  };

  if (q) {
    where.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { note: { contains: q, mode: "insensitive" } },
    ];
  }

  if (category) where.category = category;
  if (splitType) where.splitType = splitType;

  if (dateFrom || dateTo) {
    where.date = {};
    if (dateFrom) where.date.gte = new Date(dateFrom);
    if (dateTo) where.date.lte = new Date(dateTo + "T23:59:59.999Z");
  }

  if (minAmount || maxAmount) {
    where.amount = {};
    if (minAmount) where.amount.gte = parseFloat(minAmount);
    if (maxAmount) where.amount.lte = parseFloat(maxAmount);
  }

  if (tag) {
    where.tags = { has: tag };
  }

  const [expenses, total] = await Promise.all([
    prisma.expense.findMany({
      where,
      include: {
        paidBy: { select: { id: true, name: true } },
        group: { select: { id: true, name: true, currency: true } },
        splits: {
          include: { user: { select: { id: true, name: true } } },
        },
      },
      orderBy: { date: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.expense.count({ where }),
  ]);

  return NextResponse.json({
    expenses,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}
