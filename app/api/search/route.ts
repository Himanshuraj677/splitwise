import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const SEARCHABLE_DOMAINS = [
  { key: "group_expense", label: "Group Expenses", fields: ["title", "note", "category", "group name", "payer name", "tags"] },
  { key: "personal_expense", label: "Personal Expenses", fields: ["note", "category", "amount", "date"] },
  { key: "settlement", label: "Settlements", fields: ["note", "payer", "receiver", "group"] },
  { key: "income", label: "Income Entries", fields: ["source", "type", "note", "amount"] },
  { key: "investment", label: "Investments", fields: ["name", "type", "platform", "note"] },
  { key: "liability", label: "Liabilities", fields: ["name", "type", "note", "due date"] },
  { key: "goal", label: "Savings Goals", fields: ["title", "status", "note", "target date"] },
  { key: "lend", label: "Lends", fields: ["friend name", "contact", "note", "status"] },
  { key: "reminder", label: "Reminders", fields: ["message", "status", "amount"] },
  { key: "recurring", label: "Recurring Expenses", fields: ["title", "category", "frequency", "amount"] },
  { key: "template", label: "Expense Templates", fields: ["name", "title", "category", "amount"] },
  { key: "group", label: "Groups", fields: ["name", "description", "group type"] },
  { key: "notification", label: "Notifications", fields: ["title", "message", "type"] },
] as const;

type DomainKey = (typeof SEARCHABLE_DOMAINS)[number]["key"];

type SearchItem = {
  id: string;
  domain: DomainKey;
  title: string;
  subtitle?: string;
  amount?: number;
  currency?: string;
  category?: string;
  status?: string;
  date: string;
  route?: string;
  note?: string | null;
};

const APPROVAL_STATUS = new Set(["PENDING", "APPROVED", "REJECTED"]);
const INCOME_TYPES = new Set([
  "SALARY",
  "FREELANCE",
  "BUSINESS",
  "RENTAL",
  "INTEREST",
  "DIVIDEND",
  "BONUS",
  "REFUND",
  "GIFT",
  "OTHER",
]);
const INVESTMENT_TYPES = new Set([
  "STOCK",
  "MUTUAL_FUND",
  "ETF",
  "FIXED_DEPOSIT",
  "CRYPTO",
  "GOLD",
  "REAL_ESTATE",
  "PPF",
  "NPS",
  "BOND",
  "OTHER",
]);
const LIABILITY_TYPES = new Set([
  "LOAN",
  "CREDIT_CARD",
  "MORTGAGE",
  "PERSONAL_BORROW",
  "EMI",
  "OTHER",
]);
const GOAL_STATUSES = new Set(["ACTIVE", "ACHIEVED", "PAUSED"]);
const LEND_STATUSES = new Set(["OPEN", "CLOSED"]);
const REMINDER_STATUSES = new Set(["PENDING", "SENT", "DISMISSED"]);
const NOTIFICATION_TYPES = new Set([
  "GROUP_INVITE",
  "NEW_EXPENSE",
  "SETTLEMENT",
  "BUDGET_WARNING",
  "GENERAL",
  "MEMBER_JOINED",
  "MEMBER_LEFT",
  "ROLE_CHANGED",
  "EXPENSE_APPROVED",
  "EXPENSE_REJECTED",
  "REMINDER",
  "CHAT_MESSAGE",
]);

function parseNumber(value: string | null): number | undefined {
  if (!value) return undefined;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function normalizeEnum(
  value: string | null,
  allowed: Set<string>
): string | undefined {
  if (!value) return undefined;
  const normalized = value.trim().toUpperCase().replace(/\s+/g, "_");
  return allowed.has(normalized) ? normalized : undefined;
}

function mergeDateBounds(
  month: string | null,
  dateFrom: string | null,
  dateTo: string | null
): { gte?: Date; lte?: Date } {
  const result: { gte?: Date; lte?: Date } = {};

  if (month) {
    const [y, m] = month.split("-").map((v) => parseInt(v, 10));
    if (!Number.isNaN(y) && !Number.isNaN(m)) {
      result.gte = new Date(y, m - 1, 1);
      result.lte = new Date(y, m, 0, 23, 59, 59, 999);
    }
  }

  if (dateFrom) {
    const from = new Date(dateFrom);
    if (!result.gte || from > result.gte) result.gte = from;
  }

  if (dateTo) {
    const to = new Date(`${dateTo}T23:59:59.999Z`);
    if (!result.lte || to < result.lte) result.lte = to;
  }

  return result;
}

function toDomainSummary(items: SearchItem[]) {
  return SEARCHABLE_DOMAINS.map((domain) => ({
    ...domain,
    count: items.filter((item) => item.domain === domain.key).length,
  }));
}

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const q = (searchParams.get("q") || "").trim();
    const groupId = searchParams.get("groupId") || undefined;
    const domainsParam = searchParams.get("domains") || "all";
    const category = searchParams.get("category");
    const month = searchParams.get("month");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const minAmount = parseNumber(searchParams.get("minAmount"));
    const maxAmount = parseNumber(searchParams.get("maxAmount"));
    const status = searchParams.get("status");
    const tag = searchParams.get("tag") || undefined;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const requestedLimit = parseInt(searchParams.get("limit") || "24", 10);
    const limit = Math.min(Math.max(1, Number.isNaN(requestedLimit) ? 24 : requestedLimit), 100);

    const approvalStatus = normalizeEnum(status, APPROVAL_STATUS);
    const incomeType = normalizeEnum(status, INCOME_TYPES);
    const investmentType = normalizeEnum(status, INVESTMENT_TYPES);
    const liabilityType = normalizeEnum(status, LIABILITY_TYPES);
    const goalStatus = normalizeEnum(status, GOAL_STATUSES);
    const lendStatus = normalizeEnum(status, LEND_STATUSES);
    const reminderStatus = normalizeEnum(status, REMINDER_STATUSES);
    const notificationType = normalizeEnum(status, NOTIFICATION_TYPES);

    const selectedDomains =
      domainsParam === "all"
        ? new Set<DomainKey>(SEARCHABLE_DOMAINS.map((d) => d.key))
        : new Set<DomainKey>(
            domainsParam
              .split(",")
              .map((d) => d.trim())
              .filter((d): d is DomainKey =>
                SEARCHABLE_DOMAINS.some((domain) => domain.key === d)
              )
          );

    const amountBounds = {
      gte: minAmount,
      lte: maxAmount,
    };

    const dateBounds = mergeDateBounds(month, dateFrom, dateTo);

    // Get user's groups
    const memberships = await prisma.groupMember.findMany({
      where: { userId: session.userId },
      select: { groupId: true },
    });
    const groupIds = memberships.map((m) => m.groupId);

    const tasks: Array<Promise<SearchItem[]>> = [];

  if (selectedDomains.has("group_expense")) {
    tasks.push(
      prisma.expense
        .findMany({
          where: {
            isDeleted: false,
            groupId: groupId ? groupId : { in: groupIds },
            ...(q && {
              OR: [
                { title: { contains: q, mode: "insensitive" } },
                { note: { contains: q, mode: "insensitive" } },
                { category: { contains: q, mode: "insensitive" } },
                { group: { name: { contains: q, mode: "insensitive" } } },
                { paidBy: { name: { contains: q, mode: "insensitive" } } },
                ...(tag ? [{ tags: { has: tag } }] : []),
              ],
            }),
            ...(category && category !== "all" && { category }),
            ...((dateBounds.gte || dateBounds.lte) && { date: dateBounds }),
            ...((amountBounds.gte !== undefined || amountBounds.lte !== undefined) && {
              amount: amountBounds,
            }),
            ...(approvalStatus && { approvalStatus: approvalStatus as any }),
          },
          include: {
            paidBy: { select: { name: true } },
            group: { select: { id: true, name: true, currency: true } },
          },
          take: 250,
          orderBy: { date: "desc" },
        })
        .then((rows) =>
          rows.map((row) => ({
            id: row.id,
            domain: "group_expense" as const,
            title: row.title,
            subtitle: `${row.group.name} · Paid by ${row.paidBy.name}`,
            amount: row.amount,
            currency: row.group.currency,
            category: row.category,
            status: row.approvalStatus,
            date: row.date.toISOString(),
            route: `/groups/${row.group.id}`,
            note: row.note,
          }))
        )
    );
  }

  if (selectedDomains.has("personal_expense")) {
    tasks.push(
      prisma.personalExpense
        .findMany({
          where: {
            userId: session.userId,
            ...(q && {
              OR: [
                { note: { contains: q, mode: "insensitive" } },
                { category: { contains: q, mode: "insensitive" } },
              ],
            }),
            ...(category && category !== "all" && { category }),
            ...((dateBounds.gte || dateBounds.lte) && { date: dateBounds }),
            ...((amountBounds.gte !== undefined || amountBounds.lte !== undefined) && {
              amount: amountBounds,
            }),
          },
          take: 250,
          orderBy: { date: "desc" },
        })
        .then((rows) =>
          rows.map((row) => ({
            id: row.id,
            domain: "personal_expense" as const,
            title: row.note?.trim() || "Personal Expense",
            subtitle: "Personal",
            amount: row.amount,
            currency: "INR",
            category: row.category,
            date: row.date.toISOString(),
            route: "/personal-expenses?tab=expenses",
            note: row.note,
          }))
        )
    );
  }

  if (selectedDomains.has("settlement")) {
    tasks.push(
      prisma.settlement
        .findMany({
          where: {
            groupId: groupId ? groupId : { in: groupIds },
            ...(q && {
              OR: [
                { note: { contains: q, mode: "insensitive" } },
                { payer: { name: { contains: q, mode: "insensitive" } } },
                { receiver: { name: { contains: q, mode: "insensitive" } } },
                { group: { name: { contains: q, mode: "insensitive" } } },
              ],
            }),
            ...((dateBounds.gte || dateBounds.lte) && { date: dateBounds }),
            ...((amountBounds.gte !== undefined || amountBounds.lte !== undefined) && {
              amount: amountBounds,
            }),
          },
          include: {
            payer: { select: { name: true } },
            receiver: { select: { name: true } },
            group: { select: { id: true, name: true, currency: true } },
          },
          take: 200,
          orderBy: { date: "desc" },
        })
        .then((rows) =>
          rows.map((row) => ({
            id: row.id,
            domain: "settlement" as const,
            title: `${row.payer.name} paid ${row.receiver.name}`,
            subtitle: row.group.name,
            amount: row.amount,
            currency: row.group.currency,
            date: row.date.toISOString(),
            route: "/settlements",
            note: row.note,
          }))
        )
    );
  }

  if (selectedDomains.has("income")) {
    tasks.push(
      prisma.incomeEntry
        .findMany({
          where: {
            userId: session.userId,
            ...(q && {
              OR: [
                { source: { contains: q, mode: "insensitive" } },
                { note: { contains: q, mode: "insensitive" } },
              ],
            }),
            ...(incomeType && { type: incomeType as any }),
            ...((dateBounds.gte || dateBounds.lte) && { receivedAt: dateBounds }),
            ...((amountBounds.gte !== undefined || amountBounds.lte !== undefined) && {
              amount: amountBounds,
            }),
          },
          take: 200,
          orderBy: { receivedAt: "desc" },
        })
        .then((rows) =>
          rows.map((row) => ({
            id: row.id,
            domain: "income" as const,
            title: row.source,
            subtitle: row.type,
            amount: row.amount,
            currency: "INR",
            status: row.recurring ? "RECURRING" : "ONE_TIME",
            date: row.receivedAt.toISOString(),
            route: "/personal-expenses?tab=income",
            note: row.note,
          }))
        )
    );
  }

  if (selectedDomains.has("investment")) {
    tasks.push(
      prisma.investment
        .findMany({
          where: {
            userId: session.userId,
            ...(q && {
              OR: [
                { name: { contains: q, mode: "insensitive" } },
                { platform: { contains: q, mode: "insensitive" } },
                { note: { contains: q, mode: "insensitive" } },
              ],
            }),
            ...(investmentType && { type: investmentType as any }),
            ...((dateBounds.gte || dateBounds.lte) && { investedAt: dateBounds }),
          },
          take: 200,
          orderBy: { investedAt: "desc" },
        })
        .then((rows) =>
          rows.map((row) => ({
            id: row.id,
            domain: "investment" as const,
            title: row.name,
            subtitle: row.type,
            amount: row.currentValue,
            currency: "INR",
            date: row.investedAt.toISOString(),
            route: "/personal-expenses?tab=investments",
            note: row.note,
          }))
        )
    );
  }

  if (selectedDomains.has("liability")) {
    tasks.push(
      prisma.liability
        .findMany({
          where: {
            userId: session.userId,
            ...(q && {
              OR: [
                { name: { contains: q, mode: "insensitive" } },
                { note: { contains: q, mode: "insensitive" } },
              ],
            }),
            ...(liabilityType && { type: liabilityType as any }),
            ...((dateBounds.gte || dateBounds.lte) && { dueDate: dateBounds }),
            ...((amountBounds.gte !== undefined || amountBounds.lte !== undefined) && {
              outstandingAmount: amountBounds,
            }),
          },
          take: 200,
          orderBy: { createdAt: "desc" },
        })
        .then((rows) =>
          rows.map((row) => ({
            id: row.id,
            domain: "liability" as const,
            title: row.name,
            subtitle: row.type,
            amount: row.outstandingAmount,
            currency: "INR",
            date: row.createdAt.toISOString(),
            route: "/personal-expenses?tab=liabilities",
            note: row.note,
          }))
        )
    );
  }

  if (selectedDomains.has("goal")) {
    tasks.push(
      prisma.savingsGoal
        .findMany({
          where: {
            userId: session.userId,
            ...(q && {
              OR: [
                { title: { contains: q, mode: "insensitive" } },
                { note: { contains: q, mode: "insensitive" } },
              ],
            }),
            ...(goalStatus && { status: goalStatus as any }),
          },
          take: 200,
          orderBy: { createdAt: "desc" },
        })
        .then((rows) =>
          rows.map((row) => ({
            id: row.id,
            domain: "goal" as const,
            title: row.title,
            subtitle: row.status,
            amount: row.targetAmount,
            currency: "INR",
            status: row.status,
            date: row.createdAt.toISOString(),
            route: "/personal-expenses?tab=goals",
            note: row.note,
          }))
        )
    );
  }

  if (selectedDomains.has("lend")) {
    tasks.push(
      prisma.lend
        .findMany({
          where: {
            userId: session.userId,
            ...(q && {
              OR: [
                { friendName: { contains: q, mode: "insensitive" } },
                { friendContact: { contains: q, mode: "insensitive" } },
                { note: { contains: q, mode: "insensitive" } },
              ],
            }),
            ...(lendStatus && { status: lendStatus as any }),
            ...((dateBounds.gte || dateBounds.lte) && { lentAt: dateBounds }),
            ...((amountBounds.gte !== undefined || amountBounds.lte !== undefined) && {
              principalAmount: amountBounds,
            }),
          },
          take: 200,
          orderBy: { lentAt: "desc" },
        })
        .then((rows) =>
          rows.map((row) => ({
            id: row.id,
            domain: "lend" as const,
            title: row.friendName,
            subtitle: row.friendContact || "Friend",
            amount: row.principalAmount,
            currency: "INR",
            status: row.status,
            date: row.lentAt.toISOString(),
            route: "/personal-expenses?tab=lends",
            note: row.note,
          }))
        )
    );
  }

  if (selectedDomains.has("reminder")) {
    tasks.push(
      prisma.reminder
        .findMany({
          where: {
            OR: [{ fromUserId: session.userId }, { toUserId: session.userId }],
            ...(q && { message: { contains: q, mode: "insensitive" } }),
            ...(reminderStatus && { status: reminderStatus as any }),
            ...((dateBounds.gte || dateBounds.lte) && { sendAt: dateBounds }),
          },
          take: 200,
          orderBy: { sendAt: "desc" },
        })
        .then((rows) =>
          rows.map((row) => ({
            id: row.id,
            domain: "reminder" as const,
            title: row.message,
            subtitle: row.status,
            amount: row.amount || undefined,
            currency: "INR",
            status: row.status,
            date: row.sendAt.toISOString(),
            route: "/reminders",
          }))
        )
    );
  }

  if (selectedDomains.has("recurring")) {
    tasks.push(
      prisma.recurringExpense
        .findMany({
          where: {
            userId: session.userId,
            ...(q && {
              OR: [
                { title: { contains: q, mode: "insensitive" } },
                { category: { contains: q, mode: "insensitive" } },
              ],
            }),
            ...(category && category !== "all" && { category }),
            ...((amountBounds.gte !== undefined || amountBounds.lte !== undefined) && {
              amount: amountBounds,
            }),
          },
          take: 200,
          orderBy: { nextDue: "asc" },
        })
        .then((rows) =>
          rows.map((row) => ({
            id: row.id,
            domain: "recurring" as const,
            title: row.title,
            subtitle: row.frequency,
            amount: row.amount,
            currency: "INR",
            category: row.category,
            status: row.active ? "ACTIVE" : "PAUSED",
            date: row.nextDue.toISOString(),
            route: "/recurring",
          }))
        )
    );
  }

  if (selectedDomains.has("template")) {
    tasks.push(
      prisma.expenseTemplate
        .findMany({
          where: {
            userId: session.userId,
            ...(q && {
              OR: [
                { name: { contains: q, mode: "insensitive" } },
                { title: { contains: q, mode: "insensitive" } },
                { category: { contains: q, mode: "insensitive" } },
              ],
            }),
            ...(category && category !== "all" && { category }),
          },
          take: 200,
          orderBy: { createdAt: "desc" },
        })
        .then((rows) =>
          rows.map((row) => ({
            id: row.id,
            domain: "template" as const,
            title: row.name,
            subtitle: row.title,
            amount: row.amount || undefined,
            currency: "INR",
            category: row.category,
            date: row.createdAt.toISOString(),
            route: "/templates",
          }))
        )
    );
  }

  if (selectedDomains.has("group")) {
    tasks.push(
      prisma.group
        .findMany({
          where: {
            id: groupId ? groupId : { in: groupIds },
            ...(q && {
              OR: [
                { name: { contains: q, mode: "insensitive" } },
                { description: { contains: q, mode: "insensitive" } },
              ],
            }),
          },
          take: 120,
          orderBy: { createdAt: "desc" },
        })
        .then((rows) =>
          rows.map((row) => ({
            id: row.id,
            domain: "group" as const,
            title: row.name,
            subtitle: row.description || row.groupType,
            currency: row.currency,
            date: row.createdAt.toISOString(),
            route: `/groups/${row.id}`,
          }))
        )
    );
  }

  if (selectedDomains.has("notification")) {
    tasks.push(
      prisma.notification
        .findMany({
          where: {
            userId: session.userId,
            ...(q && {
              OR: [
                { title: { contains: q, mode: "insensitive" } },
                { message: { contains: q, mode: "insensitive" } },
              ],
            }),
            ...(notificationType && { type: notificationType as any }),
            ...((dateBounds.gte || dateBounds.lte) && { createdAt: dateBounds }),
          },
          take: 200,
          orderBy: { createdAt: "desc" },
        })
        .then((rows) =>
          rows.map((row) => ({
            id: row.id,
            domain: "notification" as const,
            title: row.title,
            subtitle: row.type,
            status: row.read ? "READ" : "UNREAD",
            date: row.createdAt.toISOString(),
            route: "/notifications",
            note: row.message,
          }))
        )
    );
  }

    const flattened = (await Promise.all(tasks)).flat();
    const sorted = flattened.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    const total = sorted.length;
    const paginated = sorted.slice((page - 1) * limit, page * limit);
    const domainSummary = toDomainSummary(sorted);

    // Legacy compatibility field for previous expense-only search consumers.
    const expenses = paginated.filter(
      (item) => item.domain === "group_expense" || item.domain === "personal_expense"
    );

    return NextResponse.json({
      searchableDomains: SEARCHABLE_DOMAINS,
      domainSummary,
      results: paginated,
      expenses,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("[SEARCH_API_ERROR]", error);
    return NextResponse.json(
      {
        error: "Failed to run search",
        searchableDomains: SEARCHABLE_DOMAINS,
        domainSummary: SEARCHABLE_DOMAINS.map((domain) => ({ ...domain, count: 0 })),
        results: [],
        expenses: [],
        pagination: { page: 1, limit: 24, total: 0, totalPages: 0 },
      },
      { status: 500 }
    );
  }
}
