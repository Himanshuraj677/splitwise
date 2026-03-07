import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { setAuthCookie } from "@/lib/auth";
import { registerSchema } from "@/lib/validations";
import { generateOTP, sendVerificationEmail } from "@/lib/email";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const { name, email, password } = parsed.data;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      if (!existingUser.emailVerified) {
        // Update password hash in case they forgot, resend OTP
        const passwordHash = await bcrypt.hash(password, 12);
        const otp = generateOTP();
        await prisma.user.update({
          where: { id: existingUser.id },
          data: {
            name,
            passwordHash,
            verificationOtp: otp,
            verificationExp: new Date(Date.now() + 10 * 60 * 1000),
          },
        });
        sendVerificationEmail(email, name, otp).catch(() => {});

        await setAuthCookie({
          userId: existingUser.id,
          email: existingUser.email,
          name,
        });

        return NextResponse.json({
          user: { id: existingUser.id, name, email: existingUser.email },
          message: "Account updated! Please verify your email when convenient.",
        });
      }
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      );
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Generate verification OTP
    const otp = generateOTP();

    // Create user (unverified)
    const user = await prisma.user.create({
      data: {
        name,
        email: email.toLowerCase(),
        passwordHash,
        emailVerified: false,
        verificationOtp: otp,
        verificationExp: new Date(Date.now() + 10 * 60 * 1000), // 10 min
      },
    });

    // Send verification email (non-blocking)
    sendVerificationEmail(user.email, user.name, otp).catch(() => {});

    // Set auth cookie so user can use the app immediately
    await setAuthCookie({
      userId: user.id,
      email: user.email,
      name: user.name,
    });

    return NextResponse.json({
      user: { id: user.id, name: user.name, email: user.email },
      message: "Account created! Please verify your email when convenient.",
    });
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
