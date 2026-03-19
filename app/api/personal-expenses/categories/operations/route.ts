import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { humanizeEnum } from "@/lib/utils";
import { personalExpenseCategoryOperationSchema } from "@/lib/validations";

function toSlug(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function categoryNameFromValue(value: string) {
  return humanizeEnum(value.replace(/-/g, "_"));
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const parsed = personalExpenseCategoryOperationSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
  }

  const categoryExists = async (value: string) => {
    if (value === "other") return true;

    const [custom, used] = await Promise.all([
      prisma.personalExpenseCategory.findUnique({
        where: { userId_slug: { userId: session.userId, slug: value } },
        select: { id: true },
      }),
      prisma.personalExpense.findFirst({
        where: { userId: session.userId, category: value },
        select: { id: true },
      }),
    ]);

    return Boolean(custom || used);
  };

  if (parsed.data.action === "rename") {
    const sourceCategory = parsed.data.sourceCategory.trim();
    const targetCategory = toSlug(parsed.data.targetName);

    if (!sourceCategory || !targetCategory) {
      return NextResponse.json({ error: "Invalid category value" }, { status: 400 });
    }

    if (sourceCategory === targetCategory) {
      return NextResponse.json({ error: "Source and target categories are same" }, { status: 400 });
    }

    if (sourceCategory === "other") {
      return NextResponse.json(
        { error: "Other category cannot be renamed." },
        { status: 400 }
      );
    }

    const [updateResult] = await prisma.$transaction([
      prisma.personalExpense.updateMany({
        where: { userId: session.userId, category: sourceCategory },
        data: { category: targetCategory },
      }),
      prisma.personalExpenseCategory.upsert({
        where: { userId_slug: { userId: session.userId, slug: targetCategory } },
        update: {
          name: parsed.data.targetName.trim(),
          ...(parsed.data.targetIcon && { icon: parsed.data.targetIcon }),
        },
        create: {
          userId: session.userId,
          slug: targetCategory,
          name: parsed.data.targetName.trim(),
          icon: parsed.data.targetIcon || "🏷️",
        },
      }),
      prisma.personalExpenseCategory.deleteMany({
        where: { userId: session.userId, slug: sourceCategory },
      }),
    ]);

    return NextResponse.json({
      success: true,
      movedExpenses: updateResult.count,
      sourceCategory,
      targetCategory,
    });
  }

  if (parsed.data.action === "merge") {
    const sourceCategory = parsed.data.sourceCategory.trim();
    const targetCategory = parsed.data.targetCategory.trim();

    if (!sourceCategory || !targetCategory) {
      return NextResponse.json({ error: "Invalid category value" }, { status: 400 });
    }

    if (sourceCategory === targetCategory) {
      return NextResponse.json({ error: "Source and target categories are same" }, { status: 400 });
    }

    const exists = await categoryExists(targetCategory);
    if (!exists) {
      return NextResponse.json({ error: "Target category does not exist" }, { status: 400 });
    }

    const [updateResult] = await prisma.$transaction([
      prisma.personalExpense.updateMany({
        where: { userId: session.userId, category: sourceCategory },
        data: { category: targetCategory },
      }),
      prisma.personalExpenseCategory.deleteMany({
        where: { userId: session.userId, slug: sourceCategory },
      }),
    ]);

    return NextResponse.json({
      success: true,
      movedExpenses: updateResult.count,
      sourceCategory,
      targetCategory,
    });
  }

  const sourceCategory = parsed.data.sourceCategory.trim();
  const targetCategory = parsed.data.targetCategory.trim();

  if (!sourceCategory || !targetCategory) {
    return NextResponse.json({ error: "Invalid category value" }, { status: 400 });
  }

  if (sourceCategory === targetCategory) {
    return NextResponse.json({ error: "Source and target categories are same" }, { status: 400 });
  }

  if (sourceCategory === "other") {
    return NextResponse.json(
      { error: "Other category cannot be deleted." },
      { status: 400 }
    );
  }

  const exists = await categoryExists(targetCategory);
  if (!exists) {
    return NextResponse.json({ error: "Target category does not exist" }, { status: 400 });
  }

  const [updateResult] = await prisma.$transaction([
    prisma.personalExpense.updateMany({
      where: { userId: session.userId, category: sourceCategory },
      data: { category: targetCategory },
    }),
    prisma.personalExpenseCategory.deleteMany({
      where: { userId: session.userId, slug: sourceCategory },
    }),
  ]);

  return NextResponse.json({
    success: true,
    movedExpenses: updateResult.count,
    sourceCategory,
    targetCategory,
  });
}
