import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateOTP, sendPasswordResetEmail } from "@/lib/email";

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      return NextResponse.json({ message: "If an account exists with a verified email, a reset code has been sent." });
    }

    if (!user.emailVerified) {
      return NextResponse.json(
        { error: "Your email is not verified. Please verify your email from your Profile page before resetting your password." },
        { status: 403 }
      );
    }

    const otp = generateOTP();
    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetOtp: otp,
        resetOtpExp: new Date(Date.now() + 10 * 60 * 1000), // 10 min
      },
    });

    await sendPasswordResetEmail(user.email, user.name, otp);
    console.log(`[Forgot Password] OTP generated for ${email}: ${otp}`);

    return NextResponse.json({ message: "If an account exists, a reset code has been sent." });
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
