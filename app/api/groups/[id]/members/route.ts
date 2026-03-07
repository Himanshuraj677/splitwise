import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// PATCH: Change member role (promote/demote/transfer ownership)
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: groupId } = params;
  const body = await request.json();
  const { memberId, action } = body;
  // action: "promote" | "demote" | "transfer_ownership"

  if (!memberId || !["promote", "demote", "transfer_ownership"].includes(action)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const myMembership = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId: session.userId, groupId } },
  });

  if (!myMembership) {
    return NextResponse.json({ error: "Not a member" }, { status: 403 });
  }

  const targetMembership = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId: memberId, groupId } },
    include: { user: { select: { name: true } } },
  });

  if (!targetMembership) {
    return NextResponse.json({ error: "Target user is not a member" }, { status: 404 });
  }

  if (memberId === session.userId) {
    return NextResponse.json({ error: "Cannot change your own role" }, { status: 400 });
  }

  if (action === "transfer_ownership") {
    if (myMembership.role !== "OWNER") {
      return NextResponse.json({ error: "Only the owner can transfer ownership" }, { status: 403 });
    }

    await prisma.$transaction([
      prisma.groupMember.update({
        where: { userId_groupId: { userId: memberId, groupId } },
        data: { role: "OWNER" },
      }),
      prisma.groupMember.update({
        where: { userId_groupId: { userId: session.userId, groupId } },
        data: { role: "ADMIN" },
      }),
      prisma.activityLog.create({
        data: {
          groupId,
          userId: session.userId,
          action: "OWNERSHIP_TRANSFERRED",
          detail: `Transferred ownership to ${targetMembership.user.name}`,
        },
      }),
      prisma.notification.create({
        data: {
          userId: memberId,
          type: "ROLE_CHANGED",
          title: "You are now the Owner",
          message: `${session.name} transferred group ownership to you`,
          data: { groupId },
        },
      }),
    ]);

    return NextResponse.json({ message: "Ownership transferred" });
  }

  if (action === "promote") {
    // OWNER can promote MEMBER → ADMIN
    if (myMembership.role !== "OWNER") {
      return NextResponse.json({ error: "Only the owner can promote members" }, { status: 403 });
    }
    if (targetMembership.role !== "MEMBER") {
      return NextResponse.json({ error: "User is already an admin or owner" }, { status: 400 });
    }

    await prisma.$transaction([
      prisma.groupMember.update({
        where: { userId_groupId: { userId: memberId, groupId } },
        data: { role: "ADMIN" },
      }),
      prisma.activityLog.create({
        data: {
          groupId,
          userId: session.userId,
          action: "ROLE_CHANGED",
          detail: `Promoted ${targetMembership.user.name} to Admin`,
        },
      }),
      prisma.notification.create({
        data: {
          userId: memberId,
          type: "ROLE_CHANGED",
          title: "Promoted to Admin",
          message: `${session.name} promoted you to Admin`,
          data: { groupId },
        },
      }),
    ]);

    return NextResponse.json({ message: "Member promoted to Admin" });
  }

  if (action === "demote") {
    // OWNER can demote ADMIN → MEMBER
    if (myMembership.role !== "OWNER") {
      return NextResponse.json({ error: "Only the owner can demote members" }, { status: 403 });
    }
    if (targetMembership.role !== "ADMIN") {
      return NextResponse.json({ error: "User is not an admin" }, { status: 400 });
    }

    await prisma.$transaction([
      prisma.groupMember.update({
        where: { userId_groupId: { userId: memberId, groupId } },
        data: { role: "MEMBER" },
      }),
      prisma.activityLog.create({
        data: {
          groupId,
          userId: session.userId,
          action: "ROLE_CHANGED",
          detail: `Demoted ${targetMembership.user.name} to Member`,
        },
      }),
      prisma.notification.create({
        data: {
          userId: memberId,
          type: "ROLE_CHANGED",
          title: "Role Changed",
          message: `${session.name} changed your role to Member`,
          data: { groupId },
        },
      }),
    ]);

    return NextResponse.json({ message: "Admin demoted to Member" });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}

// DELETE: Remove a member from the group
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: groupId } = params;
  const { searchParams } = new URL(request.url);
  const memberId = searchParams.get("memberId");

  if (!memberId) {
    return NextResponse.json({ error: "memberId is required" }, { status: 400 });
  }

  const myMembership = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId: session.userId, groupId } },
  });

  if (!myMembership) {
    return NextResponse.json({ error: "Not a member" }, { status: 403 });
  }

  const targetMembership = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId: memberId, groupId } },
    include: { user: { select: { name: true } } },
  });

  if (!targetMembership) {
    return NextResponse.json({ error: "Target user is not a member" }, { status: 404 });
  }

  // Self-leave: any member can leave (except OWNER — must transfer first)
  if (memberId === session.userId) {
    if (myMembership.role === "OWNER") {
      return NextResponse.json({ error: "Owner must transfer ownership before leaving" }, { status: 400 });
    }

    await prisma.$transaction([
      prisma.groupMember.delete({
        where: { userId_groupId: { userId: memberId, groupId } },
      }),
      prisma.activityLog.create({
        data: {
          groupId,
          userId: session.userId,
          action: "MEMBER_LEFT",
          detail: `${session.name} left the group`,
        },
      }),
    ]);

    return NextResponse.json({ message: "You have left the group" });
  }

  // Removing others: OWNER/ADMIN can remove MEMBER, OWNER can remove ADMIN
  if (myMembership.role === "MEMBER") {
    return NextResponse.json({ error: "Members cannot remove others" }, { status: 403 });
  }

  if (targetMembership.role === "OWNER") {
    return NextResponse.json({ error: "Cannot remove the owner" }, { status: 403 });
  }

  if (myMembership.role === "ADMIN" && targetMembership.role === "ADMIN") {
    return NextResponse.json({ error: "Admins cannot remove other admins" }, { status: 403 });
  }

  await prisma.$transaction([
    prisma.groupMember.delete({
      where: { userId_groupId: { userId: memberId, groupId } },
    }),
    prisma.activityLog.create({
      data: {
        groupId,
        userId: session.userId,
        action: "MEMBER_REMOVED",
        detail: `Removed ${targetMembership.user.name} from the group`,
      },
    }),
    prisma.notification.create({
      data: {
        userId: memberId,
        type: "MEMBER_LEFT",
        title: "Removed from Group",
        message: `You have been removed from the group by ${session.name}`,
        data: { groupId },
      },
    }),
  ]);

  return NextResponse.json({ message: "Member removed" });
}
