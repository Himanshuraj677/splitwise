import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { setAuthCookie } from "@/lib/auth";
import { sendWelcomeEmail } from "@/lib/email";

export async function POST(request: Request) {
  try {
    const { email, otp } = await request.json();

    if (!email || !otp) {
      return NextResponse.json({ error: "Email and OTP are required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (user.emailVerified) {
      return NextResponse.json({ error: "Email already verified" }, { status: 400 });
    }

    if (!user.verificationOtp || !user.verificationExp) {
      return NextResponse.json({ error: "No verification pending. Please register again." }, { status: 400 });
    }

    if (new Date() > user.verificationExp) {
      return NextResponse.json({ error: "Verification code has expired. Please register again." }, { status: 400 });
    }

    if (user.verificationOtp !== otp) {
      return NextResponse.json({ error: "Invalid verification code" }, { status: 400 });
    }

    // Mark verified, clear OTP
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
      where: { email: email.toLowerCase(), status: "PENDING" },
    });

    for (const invite of pendingInvites) {
      await prisma.groupMember.create({
        data: { userId: user.id, groupId: invite.groupId, role: "MEMBER" },
      });
      await prisma.invitation.update({
        where: { id: invite.id },
        data: { status: "ACCEPTED" },
      });
    }

    // Send welcome email
    await sendWelcomeEmail(user.email, user.name);

    // Set auth cookie
    await setAuthCookie({
      userId: user.id,
      email: user.email,
      name: user.name,
    });

    return NextResponse.json({
      user: { id: user.id, name: user.name, email: user.email },
    });
  } catch (error) {
    console.error("Verification error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
