"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Loader2, Save, User } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface UserProfile {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  _count: { groups: number; expensesPaid: number; settlements: number };
}

export default function ProfilePage() {
  const { toast } = useToast();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then((data) => {
        setProfile(data.user);
        setName(data.user?.name || "");
        setLoading(false);
      });
  }, []);

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
              <h2 className="text-xl font-semibold">{profile.name}</h2>
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
