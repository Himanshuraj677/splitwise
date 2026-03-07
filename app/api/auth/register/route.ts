import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
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
        // Resend OTP for unverified accounts
        const otp = generateOTP();
        await prisma.user.update({
          where: { id: existingUser.id },
          data: {
            verificationOtp: otp,
            verificationExp: new Date(Date.now() + 10 * 60 * 1000),
          },
        });
        await sendVerificationEmail(email, existingUser.name, otp);
        return NextResponse.json({
          requiresVerification: true,
          email: email.toLowerCase(),
          message: "Verification code resent to your email",
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

    // Send verification email
    await sendVerificationEmail(user.email, user.name, otp);

    return NextResponse.json({
      requiresVerification: true,
      email: user.email,
      message: "Please check your email for the verification code",
    });
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
