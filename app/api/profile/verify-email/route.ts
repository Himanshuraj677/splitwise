import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateOTP, sendVerificationEmail, sendWelcomeEmail } from "@/lib/email";

// POST - Send verification OTP to logged-in user
export async function POST() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  if (user.emailVerified) {
    return NextResponse.json({ error: "Email is already verified" }, { status: 400 });
  }

  const otp = generateOTP();
  await prisma.user.update({
    where: { id: user.id },
    data: {
      verificationOtp: otp,
      verificationExp: new Date(Date.now() + 10 * 60 * 1000),
    },
  });

  await sendVerificationEmail(user.email, user.name, otp);

  return NextResponse.json({ message: "Verification code sent" });
}

// PATCH - Verify OTP for logged-in user
export async function PATCH(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { otp } = await request.json();
  if (!otp || otp.length !== 6) {
    return NextResponse.json({ error: "Invalid OTP" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  if (user.emailVerified) {
    return NextResponse.json({ error: "Email is already verified" }, { status: 400 });
  }

  if (!user.verificationOtp || !user.verificationExp) {
    return NextResponse.json({ error: "No verification code found. Please request a new one." }, { status: 400 });
  }

  if (new Date() > user.verificationExp) {
    return NextResponse.json({ error: "Code has expired. Please request a new one." }, { status: 400 });
  }

  if (user.verificationOtp !== otp) {
    return NextResponse.json({ error: "Invalid verification code" }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerified: true,
      verificationOtp: null,
      verificationExp: null,
    },
  });

  // Accept any pending invitations
  const pendingInvites = await prisma.invitation.findMany({
    where: { email: user.email, status: "PENDING" },
  });

  for (const invite of pendingInvites) {
    await prisma.$transaction([
      prisma.groupMember.create({
        data: { groupId: invite.groupId, userId: user.id },
      }),
      prisma.invitation.update({
        where: { id: invite.id },
        data: { status: "ACCEPTED" },
      }),
    ]);
  }

  sendWelcomeEmail(user.email, user.name);

  return NextResponse.json({ message: "Email verified successfully" });
}
