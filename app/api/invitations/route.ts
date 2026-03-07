import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { inviteSchema } from "@/lib/validations";
import { sendInvitationEmail } from "@/lib/email";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const parsed = inviteSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
  }

  const { email, groupId } = parsed.data;

  // Only OWNER or ADMIN can invite
  const membership = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId: session.userId, groupId } },
  });

  if (!membership || membership.role === "MEMBER") {
    return NextResponse.json({ error: "Only group admins can invite members" }, { status: 403 });
  }

  const group = await prisma.group.findUnique({
    where: { id: groupId },
    select: { name: true },
  });

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
  }

  // Check if already invited (pending)
  const existingInvite = await prisma.invitation.findFirst({
    where: { email: email.toLowerCase(), groupId, status: "PENDING" },
  });

  if (existingInvite) {
    return NextResponse.json({ error: "Invitation already sent" }, { status: 409 });
  }

  // Always create an invitation — user must accept/decline
  const invitation = await prisma.invitation.create({
    data: {
      email: email.toLowerCase(),
      groupId,
      invitedById: session.userId,
    },
  });

  // Create notification for existing user
  if (existingUser) {
    await prisma.notification.create({
      data: {
        userId: existingUser.id,
        type: "GROUP_INVITE",
        title: "Group Invitation",
        message: `${session.name} invited you to join "${group?.name}"`,
        data: { groupId, invitationId: invitation.id },
      },
    });
  }

  // Log activity
  await prisma.activityLog.create({
    data: {
      groupId,
      userId: session.userId,
      action: "INVITE_SENT",
      detail: `Invited ${email} to the group`,
    },
  });

  // Send invitation email
  await sendInvitationEmail(
    email.toLowerCase(),
    session.name,
    group?.name || "a group",
    !!existingUser
  );

  return NextResponse.json({ invitation }, { status: 201 });
}

// Accept or decline an invitation
export async function PATCH(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { invitationId, action } = body;

  if (!invitationId || !["accept", "decline"].includes(action)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const invitation = await prisma.invitation.findUnique({
    where: { id: invitationId },
    include: { group: { select: { name: true } }, invitedBy: { select: { name: true, id: true } } },
  });

  if (!invitation || invitation.status !== "PENDING") {
    return NextResponse.json({ error: "Invitation not found or already resolved" }, { status: 404 });
  }

  // Verify the invitation is for this user
  if (invitation.email !== session.email) {
    return NextResponse.json({ error: "This invitation is not for you" }, { status: 403 });
  }

  if (action === "accept") {
    // Check if already a member (edge case)
    const existing = await prisma.groupMember.findUnique({
      where: { userId_groupId: { userId: session.userId, groupId: invitation.groupId } },
    });

    if (existing) {
      await prisma.invitation.update({ where: { id: invitationId }, data: { status: "ACCEPTED" } });
      return NextResponse.json({ message: "You are already a member of this group" });
    }

    await prisma.$transaction([
      prisma.invitation.update({ where: { id: invitationId }, data: { status: "ACCEPTED" } }),
      prisma.groupMember.create({ data: { userId: session.userId, groupId: invitation.groupId, role: "MEMBER" } }),
      prisma.activityLog.create({
        data: {
          groupId: invitation.groupId,
          userId: session.userId,
          action: "MEMBER_JOINED",
          detail: `${session.name} joined the group`,
        },
      }),
      prisma.notification.create({
        data: {
          userId: invitation.invitedBy.id,
          type: "MEMBER_JOINED",
          title: "Invitation Accepted",
          message: `${session.name} accepted your invitation to "${invitation.group.name}"`,
          data: { groupId: invitation.groupId },
        },
      }),
    ]);

    return NextResponse.json({ message: "You have joined the group" });
  }

  // Decline
  await prisma.$transaction([
    prisma.invitation.update({ where: { id: invitationId }, data: { status: "DECLINED" } }),
    prisma.notification.create({
      data: {
        userId: invitation.invitedBy.id,
        type: "GENERAL",
        title: "Invitation Declined",
        message: `${session.name} declined your invitation to "${invitation.group.name}"`,
        data: { groupId: invitation.groupId },
      },
    }),
  ]);

  return NextResponse.json({ message: "Invitation declined" });
}

// Get pending invitations for the current user
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const invitations = await prisma.invitation.findMany({
    where: { email: session.email, status: "PENDING" },
    include: {
      group: { select: { id: true, name: true, description: true, groupType: true, _count: { select: { members: true } } } },
      invitedBy: { select: { name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ invitations });
}
