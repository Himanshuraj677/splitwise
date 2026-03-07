import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") || "group"; // group | personal | settlements
  const groupId = searchParams.get("groupId");
  const format = searchParams.get("format") || "csv"; // csv | json

  let data: any[] = [];
  let headers: string[] = [];

  if (type === "group" && groupId) {
    const expenses = await prisma.expense.findMany({
      where: { groupId },
      include: {
        paidBy: { select: { name: true } },
        splits: { include: { user: { select: { name: true } } } },
      },
      orderBy: { date: "desc" },
    });

    headers = ["Date", "Title", "Amount", "Category", "Paid By", "Split Between", "Note"];
    data = expenses.map((e) => ({
      Date: new Date(e.date).toLocaleDateString(),
      Title: e.title,
      Amount: e.amount,
      Category: e.category,
      "Paid By": e.paidBy.name,
      "Split Between": e.splits.map((s) => `${s.user.name} (${s.amount})`).join(", "),
      Note: e.note || "",
    }));
  } else if (type === "personal") {
    const expenses = await prisma.personalExpense.findMany({
      where: { userId: session.userId },
      orderBy: { date: "desc" },
    });

    headers = ["Date", "Amount", "Category", "Note"];
    data = expenses.map((e) => ({
      Date: new Date(e.date).toLocaleDateString(),
      Amount: e.amount,
      Category: e.category,
      Note: e.note || "",
    }));
  } else if (type === "settlements") {
    const settlements = await prisma.settlement.findMany({
      where: {
        OR: [
          { payerId: session.userId },
          { receiverId: session.userId },
        ],
        ...(groupId && { groupId }),
      },
      include: {
        payer: { select: { name: true } },
        receiver: { select: { name: true } },
        group: { select: { name: true } },
      },
      orderBy: { date: "desc" },
    });

    headers = ["Date", "Payer", "Receiver", "Amount", "Group", "Note"];
    data = settlements.map((s) => ({
      Date: new Date(s.date).toLocaleDateString(),
      Payer: s.payer.name,
      Receiver: s.receiver.name,
      Amount: s.amount,
      Group: s.group.name,
      Note: s.note || "",
    }));
  }

  if (format === "json") {
    return NextResponse.json({ data });
  }

  // CSV format
  const csvRows = [headers.join(",")];
  data.forEach((row) => {
    const values = headers.map((h) => {
      const val = String(row[h] ?? "").replace(/"/g, '""');
      return `"${val}"`;
    });
    csvRows.push(values.join(","));
  });

  const csv = csvRows.join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="export-${type}-${Date.now()}.csv"`,
    },
  });
}
