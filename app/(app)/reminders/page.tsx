"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Loader2, Send, BellRing, CheckCircle2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { formatCurrency, formatRelativeDate } from "@/lib/utils";

type ReminderItem = {
  id: string;
  message: string;
  amount: number | null;
  status: "PENDING" | "SENT" | "DISMISSED";
  createdAt: string;
  fromUser: { id: string; name: string };
  toUser: { id: string; name: string };
};

type Group = { id: string; name: string; members: Array<{ user: { id: string; name: string } }> };

export default function RemindersPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const [currentUserId, setCurrentUserId] = useState("");
  const [groups, setGroups] = useState<Group[]>([]);
  const [sent, setSent] = useState<ReminderItem[]>([]);
  const [received, setReceived] = useState<ReminderItem[]>([]);

  const [toUserId, setToUserId] = useState("");
  const [groupId, setGroupId] = useState("none");
  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const [meRes, grpRes, sentRes, recvRes] = await Promise.all([
      fetch("/api/auth/me"),
      fetch("/api/groups"),
      fetch("/api/reminders?type=sent"),
      fetch("/api/reminders?type=received"),
    ]);

    const [meData, grpData, sentData, recvData] = await Promise.all([
      meRes.json(),
      grpRes.json(),
      sentRes.json(),
      recvRes.json(),
    ]);

    setCurrentUserId(meData.user?.id || "");
    setGroups(grpData.groups || []);
    setSent(sentData.reminders || []);
    setReceived(recvData.reminders || []);
    setLoading(false);
  }

  const recipients = useMemo(() => {
    const map = new Map<string, string>();
    groups.forEach((group) => {
      group.members.forEach((member) => {
        if (member.user.id !== currentUserId) {
          map.set(member.user.id, member.user.name);
        }
      });
    });

    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [groups, currentUserId]);

  async function sendReminder() {
    if (!toUserId) return;
    setSending(true);

    const res = await fetch("/api/reminders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        toUserId,
        amount: amount ? parseFloat(amount) : undefined,
        groupId: groupId === "none" ? undefined : groupId,
        message: message || undefined,
      }),
    });

    if (res.ok) {
      toast({ title: "Reminder sent" });
      setToUserId("");
      setGroupId("none");
      setAmount("");
      setMessage("");
      loadData();
    }

    setSending(false);
  }

  async function markDismissed(reminderId: string) {
    await fetch("/api/reminders", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reminderId, status: "DISMISSED" }),
    });

    toast({ title: "Reminder dismissed" });
    loadData();
  }

  if (loading) {
    return (
      <div className="flex h-[45vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Payment Reminders</h1>
        <p className="text-sm text-muted-foreground">
          Keep settlement follow-ups organized with polite reminders.
        </p>
      </div>

      <Card className="pro-surface">
        <CardHeader>
          <CardTitle>Send Reminder</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2">
            <Label>To</Label>
            <Select value={toUserId} onValueChange={setToUserId}>
              <SelectTrigger>
                <SelectValue placeholder="Select person" />
              </SelectTrigger>
              <SelectContent>
                {recipients.map((recipient) => (
                  <SelectItem key={recipient.id} value={recipient.id}>
                    {recipient.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Group (optional)</Label>
            <Select value={groupId} onValueChange={setGroupId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {groups.map((group) => (
                  <SelectItem key={group.id} value={group.id}>
                    {group.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Amount (optional)</Label>
            <Input type="number" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>Message (optional)</Label>
            <Input value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Friendly follow-up" />
          </div>

          <div className="md:col-span-2 lg:col-span-4">
            <Button onClick={sendReminder} disabled={sending || !toUserId}>
              {sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              Send Reminder
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="received" className="space-y-4">
        <TabsList>
          <TabsTrigger value="received">Received ({received.length})</TabsTrigger>
          <TabsTrigger value="sent">Sent ({sent.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="received" className="space-y-3">
          {received.length === 0 ? (
            <Card className="pro-surface">
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                No reminders received.
              </CardContent>
            </Card>
          ) : (
            received.map((item) => (
              <Card key={item.id} className="pro-surface">
                <CardContent className="flex flex-wrap items-start justify-between gap-3 py-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{item.message}</p>
                      <Badge variant={item.status === "DISMISSED" ? "secondary" : "outline"}>{item.status}</Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      From {item.fromUser.name} • {formatRelativeDate(item.createdAt)}
                    </p>
                    {item.amount ? <p className="mt-1 text-sm">Amount: {formatCurrency(item.amount)}</p> : null}
                  </div>
                  {item.status !== "DISMISSED" ? (
                    <Button variant="outline" size="sm" onClick={() => markDismissed(item.id)}>
                      <CheckCircle2 className="mr-2 h-4 w-4" /> Mark Dismissed
                    </Button>
                  ) : (
                    <div className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                      <BellRing className="h-3.5 w-3.5" /> Closed
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="sent" className="space-y-3">
          {sent.length === 0 ? (
            <Card className="pro-surface">
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                No reminders sent yet.
              </CardContent>
            </Card>
          ) : (
            sent.map((item) => (
              <Card key={item.id} className="pro-surface">
                <CardContent className="py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">{item.message}</p>
                        <Badge variant="outline">{item.status}</Badge>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        To {item.toUser.name} • {formatRelativeDate(item.createdAt)}
                      </p>
                    </div>
                    {item.amount ? <p className="font-semibold">{formatCurrency(item.amount)}</p> : null}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
