import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { humanizeEnum } from "@/lib/utils";
import { personalExpenseCategorySchema } from "@/lib/validations";

const LEGACY_PREDEFINED_CATEGORIES = [
  "food",
  "transport",
  "groceries",
  "entertainment",
  "bills",
  "shopping",
  "travel",
  "rent",
  "health",
  "education",
];

function toSlug(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function makeLabel(category: string) {
  return humanizeEnum(category.replace(/-/g, "_"));
}

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userCustomLegacyCategories = await prisma.personalExpenseCategory.findMany({
    where: {
      userId: session.userId,
      slug: { in: LEGACY_PREDEFINED_CATEGORIES },
    },
    select: { slug: true },
  });

  const protectedLegacy = new Set(userCustomLegacyCategories.map((c) => c.slug));
  const categoriesToMigrate = LEGACY_PREDEFINED_CATEGORIES.filter((c) => !protectedLegacy.has(c));

  if (categoriesToMigrate.length > 0) {
    await prisma.personalExpense.updateMany({
      where: {
        userId: session.userId,
        category: { in: categoriesToMigrate },
      },
      data: { category: "other" },
    });
  }

  const [customCategories, expenses] = await Promise.all([
    prisma.personalExpenseCategory.findMany({
      where: { userId: session.userId },
      orderBy: { createdAt: "asc" },
    }),
    prisma.personalExpense.findMany({
      where: { userId: session.userId },
      select: { category: true, amount: true },
    }),
  ]);

  const customMap = new Map(customCategories.map((c) => [c.slug, c]));

  const usage: Record<string, { expenseCount: number; totalAmount: number }> = {};
  for (const exp of expenses) {
    if (!usage[exp.category]) {
      usage[exp.category] = { expenseCount: 0, totalAmount: 0 };
    }
    usage[exp.category].expenseCount += 1;
    usage[exp.category].totalAmount += exp.amount;
  }

  const allValues = new Set<string>([
    ...customCategories.map((c) => c.slug),
    "other",
    ...Object.keys(usage),
  ]);

  const categories = Array.from(allValues)
    .map((value) => {
      const custom = customMap.get(value);
      const metric = usage[value] || { expenseCount: 0, totalAmount: 0 };
      const isOther = value === "other";

      return {
        value,
        label: custom?.name || (isOther ? "Other" : makeLabel(value)),
        icon: custom?.icon || (isOther ? "📦" : "🏷️"),
        isSystem: false,
        isCustom: Boolean(custom),
        expenseCount: metric.expenseCount,
        totalAmount: metric.totalAmount,
      };
    })
    .sort((a, b) => {
      if (a.value === "other" && b.value !== "other") return 1;
      if (b.value === "other" && a.value !== "other") return -1;
      if (a.expenseCount !== b.expenseCount) return b.expenseCount - a.expenseCount;
      return a.label.localeCompare(b.label);
    });

  return NextResponse.json({ categories });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const parsed = personalExpenseCategorySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
  }

  const slug = toSlug(parsed.data.name);
  if (!slug) {
    return NextResponse.json({ error: "Category name is invalid" }, { status: 400 });
  }

  if (slug === "other") {
    return NextResponse.json({ error: "Category name is reserved" }, { status: 409 });
  }

  const existing = await prisma.personalExpenseCategory.findUnique({
    where: { userId_slug: { userId: session.userId, slug } },
  });

  if (existing) {
    return NextResponse.json({ error: "Category already exists" }, { status: 409 });
  }

  const category = await prisma.personalExpenseCategory.create({
    data: {
      userId: session.userId,
      slug,
      name: parsed.data.name.trim(),
      icon: parsed.data.icon || "🏷️",
    },
  });

  return NextResponse.json({ category }, { status: 201 });
}
