import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await request.formData();
  const file = formData.get("file") as File;
  const expenseId = formData.get("expenseId") as string;

  if (!file || !expenseId) {
    return NextResponse.json({ error: "File and expenseId are required" }, { status: 400 });
  }

  // Validate file type
  const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json({ error: "Only JPEG, PNG, WebP and GIF images are allowed" }, { status: 400 });
  }

  // Validate file size (5MB max)
  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: "File size must be under 5MB" }, { status: 400 });
  }

  // Verify expense exists and user has access
  const expense = await prisma.expense.findUnique({
    where: { id: expenseId },
    include: { group: { include: { members: true } } },
  });

  if (!expense) {
    return NextResponse.json({ error: "Expense not found" }, { status: 404 });
  }

  const isMember = expense.group.members.some((m) => m.userId === session.userId);
  if (!isMember) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  // Save file to public/uploads directory
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const ext = file.name.split(".").pop() || "jpg";
  const sanitizedExt = ext.replace(/[^a-zA-Z0-9]/g, "").substring(0, 4);
  const filename = `${randomUUID()}.${sanitizedExt}`;

  const uploadsDir = join(process.cwd(), "public", "uploads");
  await mkdir(uploadsDir, { recursive: true });
  await writeFile(join(uploadsDir, filename), buffer);

  const receiptUrl = `/uploads/${filename}`;

  // Update expense with receipt URL
  await prisma.expense.update({
    where: { id: expenseId },
    data: { receiptUrl },
  });

  return NextResponse.json({ receiptUrl }, { status: 201 });
}
