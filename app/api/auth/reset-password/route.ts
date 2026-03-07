import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { sendPasswordChangedEmail } from "@/lib/email";

export async function POST(request: Request) {
  try {
    const { email, otp, newPassword } = await request.json();

    if (!email || !otp || !newPassword) {
      return NextResponse.json(
        { error: "Email, OTP, and new password are required" },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      return NextResponse.json({ error: "Invalid reset request" }, { status: 400 });
    }

    if (!user.resetOtp || !user.resetOtpExp) {
      return NextResponse.json({ error: "No reset request pending" }, { status: 400 });
    }

    if (new Date() > user.resetOtpExp) {
      return NextResponse.json({ error: "Reset code has expired" }, { status: 400 });
    }

    if (user.resetOtp !== otp) {
      return NextResponse.json({ error: "Invalid reset code" }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        resetOtp: null,
        resetOtpExp: null,
      },
    });

    await sendPasswordChangedEmail(user.email, user.name);

    return NextResponse.json({ message: "Password has been reset successfully" });
  } catch (error) {
    console.error("Reset password error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
