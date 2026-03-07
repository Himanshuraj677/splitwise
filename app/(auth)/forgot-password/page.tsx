"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Wallet, Loader2, ArrowLeft, KeyRound, CheckCircle2 } from "lucide-react";

type Step = "email" | "otp" | "done";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSendCode() {
    if (!email) return;
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong");
      } else {
        setStep("otp");
      }
    } catch {
      setError("Something went wrong");
    }
    setLoading(false);
  }

  async function handleResetPassword() {
    if (otp.length !== 6) {
      setError("Enter the 6-digit code");
      return;
    }
    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords don't match");
      return;
    }
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp, newPassword }),
      });
      const result = await res.json();
      if (!res.ok) {
        setError(result.error || "Reset failed");
        setLoading(false);
        return;
      }
      setStep("done");
    } catch {
      setError("Something went wrong");
    }
    setLoading(false);
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          {step === "done" ? (
            <CheckCircle2 className="h-6 w-6 text-primary" />
          ) : (
            <KeyRound className="h-6 w-6 text-primary" />
          )}
        </div>
        <CardTitle className="text-2xl">
          {step === "email" && "Reset Password"}
          {step === "otp" && "Enter Code & New Password"}
          {step === "done" && "Password Reset!"}
        </CardTitle>
        <CardDescription>
          {step === "email" && "Enter your email to receive a reset code"}
          {step === "otp" && `We sent a code to ${email}`}
          {step === "done" && "Your password has been changed successfully"}
        </CardDescription>
      </CardHeader>

      {step === "email" && (
        <>
          <CardContent className="space-y-4">
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button onClick={handleSendCode} className="w-full" disabled={loading || !email}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Send Reset Code
            </Button>
            <Link
              href="/login"
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to login
            </Link>
          </CardFooter>
        </>
      )}

      {step === "otp" && (
        <>
          <CardContent className="space-y-4">
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
            )}
            <div className="space-y-2">
              <Label htmlFor="otp">Reset Code</Label>
              <Input
                id="otp"
                placeholder="123456"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                maxLength={6}
                className="text-center text-2xl tracking-[0.5em] font-mono"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                placeholder="••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button onClick={handleResetPassword} className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Reset Password
            </Button>
            <Button variant="ghost" className="text-sm" onClick={() => setStep("email")}>
              Use a different email
            </Button>
          </CardFooter>
        </>
      )}

      {step === "done" && (
        <CardFooter className="flex flex-col gap-4">
          <Button className="w-full" onClick={() => router.push("/login")}>
            Go to Login
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
