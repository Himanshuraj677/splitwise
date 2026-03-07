"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
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
import { Wallet, Loader2, ArrowLeft, MailCheck } from "lucide-react";

function VerifyEmailForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const emailParam = searchParams.get("email") || "";

  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  async function handleVerify() {
    if (otp.length !== 6) {
      setError("Please enter the 6-digit code");
      return;
    }
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailParam, otp }),
      });
      const result = await res.json();
      if (!res.ok) {
        setError(result.error || "Verification failed");
        setLoading(false);
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Something went wrong");
      setLoading(false);
    }
  }

  async function handleResend() {
    setResending(true);
    setError("");
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "resend",
          email: emailParam,
          password: "resend-placeholder",
          confirmPassword: "resend-placeholder",
        }),
      });
      const result = await res.json();
      if (result.requiresVerification) {
        setError("");
      } else if (result.error) {
        setError(result.error);
      }
    } catch {
      setError("Failed to resend");
    }
    setResending(false);
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <MailCheck className="h-6 w-6 text-primary" />
        </div>
        <CardTitle className="text-2xl">Verify your email</CardTitle>
        <CardDescription>
          We sent a 6-digit code to <strong>{emailParam}</strong>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}
        <div className="space-y-2">
          <Label htmlFor="otp">Verification Code</Label>
          <Input
            id="otp"
            placeholder="123456"
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
            maxLength={6}
            className="text-center text-2xl tracking-[0.5em] font-mono"
          />
        </div>
      </CardContent>
      <CardFooter className="flex flex-col gap-3">
        <Button onClick={handleVerify} className="w-full" disabled={loading || otp.length !== 6}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Verify Email
        </Button>
        <Button variant="ghost" onClick={handleResend} disabled={resending} className="text-sm">
          {resending ? "Resending..." : "Didn't get the code? Resend"}
        </Button>
        <Link
          href="/register"
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to register
        </Link>
      </CardFooter>
    </Card>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <Card className="w-full max-w-md">
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </CardContent>
        </Card>
      }
    >
      <VerifyEmailForm />
    </Suspense>
  );
}
