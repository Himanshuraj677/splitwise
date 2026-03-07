"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Loader2,
  Bell,
  BellOff,
  CheckCheck,
  DollarSign,
  Users,
  UserPlus,
  Receipt,
  Check,
  X,
  ShieldCheck,
  Crown,
} from "lucide-react";
import { formatRelativeDate } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";

interface Notification {
  id: string;
  type: string;
  message: string;
  read: boolean;
  createdAt: string;
  data?: any;
}

interface PendingInvitation {
  id: string;
  email: string;
  createdAt: string;
  group: {
    id: string;
    name: string;
    description: string | null;
    groupType: string;
    _count: { members: number };
  };
  invitedBy: {
    name: string;
    email: string;
  };
}

const iconMap: Record<string, React.ReactNode> = {
  EXPENSE_ADDED: <Receipt className="h-4 w-4" />,
  NEW_EXPENSE: <Receipt className="h-4 w-4" />,
  EXPENSE_UPDATED: <Receipt className="h-4 w-4" />,
  SETTLEMENT: <DollarSign className="h-4 w-4" />,
  GROUP_INVITE: <UserPlus className="h-4 w-4" />,
  MEMBER_JOINED: <Users className="h-4 w-4" />,
  MEMBER_LEFT: <Users className="h-4 w-4" />,
  ROLE_CHANGED: <ShieldCheck className="h-4 w-4" />,
};

export default function NotificationsPage() {
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [pendingInvitations, setPendingInvitations] = useState<PendingInvitation[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [respondingTo, setRespondingTo] = useState<string | null>(null);

  const loadNotifications = useCallback(async () => {
    const res = await fetch("/api/notifications");
    const data = await res.json();
    setNotifications(data.notifications || []);
    setUnreadCount(data.unreadCount || 0);
    setLoading(false);
  }, []);

  const loadInvitations = useCallback(async () => {
    const res = await fetch("/api/invitations");
    if (res.ok) {
      const data = await res.json();
      setPendingInvitations(data.invitations || []);
    }
  }, []);

  useEffect(() => {
    loadNotifications();
    loadInvitations();
  }, [loadNotifications, loadInvitations]);

  async function markAllRead() {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markAllRead: true }),
    });
    loadNotifications();
  }

  async function markOneRead(id: string) {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notificationId: id }),
    });
    loadNotifications();
  }

  async function respondToInvitation(invitationId: string, action: "accept" | "decline") {
    setRespondingTo(invitationId);
    const res = await fetch("/api/invitations", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ invitationId, action }),
    });

    if (res.ok) {
      const data = await res.json();
      toast({ title: data.message });
      loadInvitations();
      loadNotifications();
    } else {
      const err = await res.json();
      toast({ title: "Error", description: err.error, variant: "destructive" });
    }
    setRespondingTo(null);
  }

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold">Notifications</h1>
          {unreadCount > 0 && (
            <Badge variant="destructive">{unreadCount} unread</Badge>
          )}
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" onClick={markAllRead}>
            <CheckCheck className="mr-2 h-4 w-4" />
            Mark all read
          </Button>
        )}
      </div>

      {/* Pending Invitations */}
      {pendingInvitations.length > 0 && (
        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" />
              Pending Invitations ({pendingInvitations.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingInvitations.map((inv) => (
              <div
                key={inv.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border p-4"
              >
                <div className="space-y-1">
                  <p className="font-semibold">{inv.group.name}</p>
                  {inv.group.description && (
                    <p className="text-sm text-muted-foreground">{inv.group.description}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Invited by <span className="font-medium">{inv.invitedBy.name}</span> &middot;{" "}
                    {inv.group._count.members} member{inv.group._count.members !== 1 ? "s" : ""} &middot;{" "}
                    {formatRelativeDate(inv.createdAt)}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button
                    size="sm"
                    onClick={() => respondToInvitation(inv.id, "accept")}
                    disabled={respondingTo === inv.id}
                  >
                    {respondingTo === inv.id ? (
                      <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="mr-1 h-4 w-4" />
                    )}
                    Accept
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => respondToInvitation(inv.id, "decline")}
                    disabled={respondingTo === inv.id}
                  >
                    <X className="mr-1 h-4 w-4" />
                    Decline
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Recent Notifications
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <div className="rounded-full bg-muted p-4 mb-4">
                <BellOff className="h-8 w-8" />
              </div>
              <p className="font-medium text-foreground">All caught up!</p>
              <p className="text-sm mt-1">No notifications to show right now.</p>
            </div>
          ) : (
            <ScrollArea className="h-[60vh]">
              <div className="divide-y">
                {notifications.map((notif) => (
                  <div
                    key={notif.id}
                    className={`flex items-start gap-3 p-4 transition-colors hover:bg-muted/50 cursor-pointer ${
                      !notif.read ? "bg-primary/5" : ""
                    }`}
                    onClick={() => !notif.read && markOneRead(notif.id)}
                  >
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-full shrink-0 ${
                        !notif.read
                          ? "bg-primary/10 text-primary"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {iconMap[notif.type] || <Bell className="h-4 w-4" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p
                        className={`text-sm ${!notif.read ? "font-medium" : "text-muted-foreground"}`}
                      >
                        {notif.message}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatRelativeDate(notif.createdAt)}
                      </p>
                    </div>
                    {!notif.read && (
                      <div className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1.5" />
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
