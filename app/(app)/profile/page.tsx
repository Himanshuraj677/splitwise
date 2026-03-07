"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Loader2, Save, User, ShieldCheck, ShieldAlert, Mail } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Badge } from "@/components/ui/badge";

interface UserProfile {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  createdAt: string;
  _count: { groups: number; expensesPaid: number; settlements: number };
}

export default function ProfilePage() {
  const { toast } = useToast();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then((data) => {
        setProfile(data.user);
        setName(data.user?.name || "");
        setLoading(false);
      });
  }, []);

  async function sendVerificationOtp() {
    setSendingOtp(true);
    try {
      const res = await fetch("/api/profile/verify-email", {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok) {
        setOtpSent(true);
        toast({ title: "Verification code sent to your email!" });
      } else {
        toast({ title: data.error || "Failed to send code", variant: "destructive" });
      }
    } catch {
      toast({ title: "Something went wrong", variant: "destructive" });
    }
    setSendingOtp(false);
  }

  async function verifyOtp() {
    if (otp.length !== 6) return;
    setVerifying(true);
    try {
      const res = await fetch("/api/profile/verify-email", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ otp }),
      });
      const data = await res.json();
      if (res.ok) {
        setProfile((prev) => (prev ? { ...prev, emailVerified: true } : prev));
        setOtpSent(false);
        setOtp("");
        toast({ title: "Email verified successfully!" });
      } else {
        toast({ title: data.error || "Verification failed", variant: "destructive" });
      }
    } catch {
      toast({ title: "Something went wrong", variant: "destructive" });
    }
    setVerifying(false);
  }

  async function updateProfile() {
    if (!name.trim()) return;
    setSaving(true);

    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim() }),
    });

    if (res.ok) {
      const data = await res.json();
      setProfile((prev) => (prev ? { ...prev, name: data.user.name } : prev));
      toast({ title: "Profile updated!" });
    } else {
      toast({ title: "Failed to update", variant: "destructive" });
    }
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!profile) return null;

  const initials = profile.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-3xl font-bold">Profile</h1>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="text-lg bg-primary text-primary-foreground">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-semibold">{profile.name}</h2>
                {profile.emailVerified ? (
                  <Badge variant="default" className="bg-green-600 text-xs">
                    <ShieldCheck className="mr-1 h-3 w-3" /> Verified
                  </Badge>
                ) : (
                  <Badge variant="destructive" className="text-xs">
                    <ShieldAlert className="mr-1 h-3 w-3" /> Unverified
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">{profile.email}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Member since{" "}
                {new Date(profile.createdAt).toLocaleDateString("en-IN", {
                  year: "numeric",
                  month: "long",
                })}
              </p>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Email Verification */}
      {!profile.emailVerified && (
        <Card className="border-amber-500/50 bg-amber-50 dark:bg-amber-950/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
              <Mail className="h-5 w-5" />
              Verify Your Email
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-amber-700 dark:text-amber-400">
              Your email is not verified. Verify it to unlock password reset and improve account security.
            </p>
            {!otpSent ? (
              <Button onClick={sendVerificationOtp} disabled={sendingOtp} variant="outline">
                {sendingOtp ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Mail className="mr-2 h-4 w-4" />
                )}
                Send Verification Code
              </Button>
            ) : (
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>Enter the 6-digit code sent to {profile.email}</Label>
                  <Input
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="000000"
                    maxLength={6}
                    className="max-w-[200px] text-center tracking-[0.5em] font-mono text-lg"
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={verifyOtp} disabled={verifying || otp.length !== 6}>
                    {verifying ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <ShieldCheck className="mr-2 h-4 w-4" />
                    )}
                    Verify
                  </Button>
                  <Button variant="ghost" onClick={sendVerificationOtp} disabled={sendingOtp}>
                    Resend Code
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Groups
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{profile._count.groups}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Expenses Paid
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{profile._count.expensesPaid}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Settlements
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{profile._count.settlements}</p>
          </CardContent>
        </Card>
      </div>

      {/* Edit Profile */}
      <Card>
        <CardHeader>
          <CardTitle>Edit Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={profile.email} disabled />
            <p className="text-xs text-muted-foreground">
              Email cannot be changed
            </p>
          </div>
          <Separator />
          <Button
            onClick={updateProfile}
            disabled={saving || !name.trim() || name === profile.name}
          >
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save Changes
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
