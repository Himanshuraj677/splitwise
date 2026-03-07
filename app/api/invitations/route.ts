import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { inviteSchema } from "@/lib/validations";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const parsed = inviteSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
  }

  const { email, groupId } = parsed.data;

  // Check user is member of the group
  const membership = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId: session.userId, groupId } },
  });

  if (!membership) {
    return NextResponse.json({ error: "You are not a member of this group" }, { status: 403 });
  }

  // Check if already a member
  const existingUser = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });

  if (existingUser) {
    const existingMembership = await prisma.groupMember.findUnique({
      where: { userId_groupId: { userId: existingUser.id, groupId } },
    });

    if (existingMembership) {
      return NextResponse.json({ error: "User is already a member" }, { status: 409 });
    }

    // Add user directly
    await prisma.groupMember.create({
      data: { userId: existingUser.id, groupId, role: "MEMBER" },
    });

    // Create notification
    await prisma.notification.create({
      data: {
        userId: existingUser.id,
        type: "GROUP_INVITE",
        title: "Group Invitation",
        message: `You have been added to a group by ${session.name}`,
        data: { groupId },
      },
    });

    return NextResponse.json({ message: "User added to group" });
  }

  // Check if already invited
  const existingInvite = await prisma.invitation.findFirst({
    where: { email: email.toLowerCase(), groupId, status: "PENDING" },
  });

  if (existingInvite) {
    return NextResponse.json({ error: "Invitation already sent" }, { status: 409 });
  }

  // Create invitation
  const invitation = await prisma.invitation.create({
    data: {
      email: email.toLowerCase(),
      groupId,
      invitedById: session.userId,
    },
  });

  return NextResponse.json({ invitation }, { status: 201 });
}
