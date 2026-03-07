import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { setAuthCookie } from "@/lib/auth";
import { loginSchema } from "@/lib/validations";
import { generateOTP, sendVerificationEmail } from "@/lib/email";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const { email, password } = parsed.data;

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    const passwordMatch = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatch) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    // If email not verified, resend OTP and tell frontend
    if (!user.emailVerified) {
      const otp = generateOTP();
      await prisma.user.update({
        where: { id: user.id },
        data: {
          verificationOtp: otp,
          verificationExp: new Date(Date.now() + 10 * 60 * 1000),
        },
      });
      await sendVerificationEmail(user.email, user.name, otp);
      return NextResponse.json({
        requiresVerification: true,
        email: user.email,
        message: "Please verify your email first. A new code has been sent.",
      });
    }

    await setAuthCookie({
      userId: user.id,
      email: user.email,
      name: user.name,
    });

    return NextResponse.json({
      user: { id: user.id, name: user.name, email: user.email },
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
