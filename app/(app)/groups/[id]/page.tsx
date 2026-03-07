"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Plus,
  UserPlus,
  Loader2,
  MoreVertical,
  Trash2,
  ArrowRight,
  Download,
  Shield,
  ShieldCheck,
  Crown,
  UserMinus,
  LogOut,
  Activity,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import {
  formatCurrency,
  formatRelativeDate,
  getCategoryInfo,
  EXPENSE_CATEGORIES,
} from "@/lib/utils";
import { GroupAnalyticsCharts } from "@/components/charts/group-analytics";

interface GroupData {
  group: any;
  balances: { userId: string; name: string; balance: number }[];
  debts: {
    from: string;
    fromName: string;
    to: string;
    toName: string;
    amount: number;
  }[];
}

export default function GroupDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();
  const [data, setData] = useState<GroupData | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string>("");

  // Expense form
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [expenseTitle, setExpenseTitle] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expensePaidBy, setExpensePaidBy] = useState("");
  const [expenseCategory, setExpenseCategory] = useState("food");
  const [expenseDate, setExpenseDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [expenseNote, setExpenseNote] = useState("");
  const [expenseSplitType, setExpenseSplitType] = useState("EQUAL");
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [splitAmounts, setSplitAmounts] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  // Invite form
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");

  // Settlement form
  const [settlementOpen, setSettlementOpen] = useState(false);
  const [settlementPayer, setSettlementPayer] = useState("");
  const [settlementReceiver, setSettlementReceiver] = useState("");
  const [settlementAmount, setSettlementAmount] = useState("");
  const [settlementNote, setSettlementNote] = useState("");

  // Activity log
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);

  // Current user role in this group
  const myRole = data?.group.members.find((m: any) => m.userId === currentUserId)?.role;
  const isOwner = myRole === "OWNER";
  const isAdmin = myRole === "ADMIN";
  const canManage = isOwner || isAdmin;

  const loadGroup = useCallback(async () => {
    const res = await fetch(`/api/groups/${id}`);
    if (!res.ok) {
      router.push("/groups");
      return;
    }
    const groupData = await res.json();
    setData(groupData);
    setLoading(false);
  }, [id, router]);

  useEffect(() => {
    loadGroup();
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (d.user) setCurrentUserId(d.user.id);
      });
  }, [loadGroup]);

  async function addExpense() {
    if (!expenseTitle || !expenseAmount || !expensePaidBy) return;
    setSubmitting(true);

    const members =
      selectedMembers.length > 0
        ? selectedMembers
        : data!.group.members.map((m: any) => m.userId);

    const splits = members.map((userId: string) => {
      const base: any = { userId };
      if (expenseSplitType === "EXACT") {
        base.amount = parseFloat(splitAmounts[userId] || "0");
      } else if (expenseSplitType === "PERCENTAGE") {
        base.percentage = parseFloat(splitAmounts[userId] || "0");
      } else if (expenseSplitType === "SHARES") {
        base.shares = parseInt(splitAmounts[userId] || "1");
      }
      return base;
    });

    const res = await fetch("/api/expenses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        groupId: id,
        title: expenseTitle,
        amount: parseFloat(expenseAmount),
        paidById: expensePaidBy,
        category: expenseCategory,
        date: expenseDate,
        note: expenseNote,
        splitType: expenseSplitType,
        splits,
      }),
    });

    if (res.ok) {
      toast({ title: "Expense added!" });
      setExpenseOpen(false);
      resetExpenseForm();
      loadGroup();
    } else {
      const err = await res.json();
      toast({
        title: "Error",
        description: err.error,
        variant: "destructive",
      });
    }
    setSubmitting(false);
  }

  function resetExpenseForm() {
    setExpenseTitle("");
    setExpenseAmount("");
    setExpensePaidBy("");
    setExpenseNote("");
    setExpenseSplitType("EQUAL");
    setSelectedMembers([]);
    setSplitAmounts({});
  }

  async function deleteExpense(expenseId: string) {
    const res = await fetch(`/api/expenses/${expenseId}`, { method: "DELETE" });
    if (res.ok) {
      toast({ title: "Expense deleted" });
      loadGroup();
    }
  }

  async function inviteMember() {
    if (!inviteEmail) return;
    const res = await fetch("/api/invitations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: inviteEmail, groupId: id }),
    });

    if (res.ok) {
      toast({ title: "Invite sent!" });
      setInviteOpen(false);
      setInviteEmail("");
      loadGroup();
    } else {
      const err = await res.json();
      toast({
        title: "Error",
        description: err.error,
        variant: "destructive",
      });
    }
  }

  async function addSettlement() {
    if (!settlementPayer || !settlementReceiver || !settlementAmount) return;
    setSubmitting(true);

    const res = await fetch("/api/settlements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        payerId: settlementPayer,
        receiverId: settlementReceiver,
        amount: parseFloat(settlementAmount),
        groupId: id,
        note: settlementNote,
      }),
    });

    if (res.ok) {
      toast({ title: "Settlement recorded!" });
      setSettlementOpen(false);
      setSettlementPayer("");
      setSettlementReceiver("");
      setSettlementAmount("");
      setSettlementNote("");
      loadGroup();
    } else {
      const err = await res.json();
      toast({
        title: "Error",
        description: err.error,
        variant: "destructive",
      });
    }
    setSubmitting(false);
  }

  async function exportData() {
    window.open(`/api/export?type=group&groupId=${id}&format=csv`, "_blank");
  }

  async function changeRole(memberId: string, action: "promote" | "demote" | "transfer_ownership") {
    const res = await fetch(`/api/groups/${id}/members`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberId, action }),
    });
    if (res.ok) {
      toast({ title: action === "transfer_ownership" ? "Ownership transferred" : action === "promote" ? "Member promoted" : "Member demoted" });
      loadGroup();
    } else {
      const err = await res.json();
      toast({ title: "Error", description: err.error, variant: "destructive" });
    }
  }

  async function removeMember(memberId: string) {
    const res = await fetch(`/api/groups/${id}/members?memberId=${memberId}`, { method: "DELETE" });
    if (res.ok) {
      const result = await res.json();
      toast({ title: result.message });
      if (memberId === currentUserId) {
        router.push("/groups");
      } else {
        loadGroup();
      }
    } else {
      const err = await res.json();
      toast({ title: "Error", description: err.error, variant: "destructive" });
    }
  }

  async function loadActivity() {
    setActivityLoading(true);
    const res = await fetch(`/api/groups/${id}/activity`);
    if (res.ok) {
      const data = await res.json();
      setActivityLogs(data.logs || []);
    }
    setActivityLoading(false);
  }

  if (loading || !data) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const { group, balances, debts } = data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">{group.name}</h1>
          {group.description && (
            <p className="text-muted-foreground mt-1">{group.description}</p>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportData}>
            <Download className="mr-2 h-4 w-4" /> Export
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm">
                <LogOut className="mr-2 h-4 w-4" /> Leave
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Leave Group?</AlertDialogTitle>
                <AlertDialogDescription>
                  {isOwner
                    ? "As the owner, you must transfer ownership before leaving."
                    : "Are you sure you want to leave this group? You won't be able to rejoin without a new invitation."}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                {!isOwner && (
                  <AlertDialogAction onClick={() => removeMember(currentUserId)}>
                    Leave Group
                  </AlertDialogAction>
                )}
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          {canManage && (
            <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <UserPlus className="mr-2 h-4 w-4" /> Invite
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Invite Member</DialogTitle>
                  <DialogDescription>
                    Enter an email to invite someone to this group. They must accept the invitation to join.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Email Address</Label>
                    <Input
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="friend@example.com"
                    />
                  </div>
                  <Button onClick={inviteMember} className="w-full">
                    Send Invite
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
          <Dialog open={expenseOpen} onOpenChange={setExpenseOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" /> Add Expense
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add Expense</DialogTitle>
                <DialogDescription>
                  Add a new expense to split with the group.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input
                    value={expenseTitle}
                    onChange={(e) => setExpenseTitle(e.target.value)}
                    placeholder="e.g. Dinner"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Amount</Label>
                    <Input
                      type="number"
                      value={expenseAmount}
                      onChange={(e) => setExpenseAmount(e.target.value)}
                      placeholder="0"
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Paid By</Label>
                    <Select
                      value={expensePaidBy}
                      onValueChange={setExpensePaidBy}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        {group.members.map((m: any) => (
                          <SelectItem key={m.userId} value={m.userId}>
                            {m.user.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select
                      value={expenseCategory}
                      onValueChange={setExpenseCategory}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {EXPENSE_CATEGORIES.map((c) => (
                          <SelectItem key={c.value} value={c.value}>
                            {c.icon} {c.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Date</Label>
                    <Input
                      type="date"
                      value={expenseDate}
                      onChange={(e) => setExpenseDate(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Split Type</Label>
                  <Select
                    value={expenseSplitType}
                    onValueChange={setExpenseSplitType}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EQUAL">Equal Split</SelectItem>
                      <SelectItem value="EXACT">Exact Amount</SelectItem>
                      <SelectItem value="PERCENTAGE">Percentage</SelectItem>
                      <SelectItem value="SHARES">Shares</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Split details for non-equal types */}
                {expenseSplitType !== "EQUAL" && (
                  <div className="space-y-2">
                    <Label>
                      {expenseSplitType === "EXACT"
                        ? "Amount per person"
                        : expenseSplitType === "PERCENTAGE"
                          ? "Percentage per person"
                          : "Shares per person"}
                    </Label>
                    {group.members.map((m: any) => (
                      <div
                        key={m.userId}
                        className="flex items-center gap-2"
                      >
                        <span className="text-sm w-24 truncate">
                          {m.user.name}
                        </span>
                        <Input
                          type="number"
                          value={splitAmounts[m.userId] || ""}
                          onChange={(e) =>
                            setSplitAmounts((prev) => ({
                              ...prev,
                              [m.userId]: e.target.value,
                            }))
                          }
                          placeholder={
                            expenseSplitType === "SHARES" ? "1" : "0"
                          }
                          min="0"
                          step={
                            expenseSplitType === "SHARES" ? "1" : "0.01"
                          }
                        />
                      </div>
                    ))}
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Note (optional)</Label>
                  <Textarea
                    value={expenseNote}
                    onChange={(e) => setExpenseNote(e.target.value)}
                    placeholder="Add a note..."
                  />
                </div>
                <Button
                  onClick={addExpense}
                  className="w-full"
                  disabled={
                    !expenseTitle || !expenseAmount || !expensePaidBy || submitting
                  }
                >
                  {submitting && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Add Expense
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="expenses">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
          <TabsTrigger value="balances">Balances</TabsTrigger>
          <TabsTrigger value="members">Members</TabsTrigger>
          <TabsTrigger value="settlements">Settlements</TabsTrigger>
          <TabsTrigger value="activity" onClick={loadActivity}>Activity</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Expenses Timeline */}
        <TabsContent value="expenses" className="space-y-4">
          {group.expenses.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center py-12">
                <p className="text-muted-foreground">No expenses yet</p>
              </CardContent>
            </Card>
          ) : (
            group.expenses.map((expense: any) => {
              const cat = getCategoryInfo(expense.category);
              return (
                <Card key={expense.id}>
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{cat.icon}</span>
                      <div>
                        <p className="font-semibold">{expense.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {expense.paidBy.name} paid{" "}
                          {formatCurrency(expense.amount)}
                        </p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {expense.splits.map((s: any) => (
                            <Badge
                              key={s.userId}
                              variant="outline"
                              className="text-xs"
                            >
                              {s.user.name}: {formatCurrency(s.amount)}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <p className="font-bold">
                          {formatCurrency(expense.amount)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatRelativeDate(expense.date)}
                        </p>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => deleteExpense(expense.id)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>

        {/* Balances */}
        <TabsContent value="balances" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Member Balances</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {balances.map((b) => (
                <div
                  key={b.userId}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>
                        {b.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium">{b.name}</span>
                  </div>
                  <span
                    className={`font-semibold ${b.balance > 0 ? "text-green-600" : b.balance < 0 ? "text-destructive" : ""}`}
                  >
                    {b.balance > 0
                      ? `gets back ${formatCurrency(b.balance)}`
                      : b.balance < 0
                        ? `owes ${formatCurrency(-b.balance)}`
                        : "settled up"}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>

          {debts.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Suggested Settlements</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {debts.map((d, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{d.fromName}</span>
                      <ArrowRight className="h-4 w-4" />
                      <span className="font-medium">{d.toName}</span>
                    </div>
                    <span className="font-bold text-primary">
                      {formatCurrency(d.amount)}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Members */}
        <TabsContent value="members" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>
                Members ({group.members.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {group.members.map((m: any) => (
                <div
                  key={m.userId}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarFallback>
                        {m.user.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{m.user.name}</p>
                        {m.userId === currentUserId && (
                          <Badge variant="outline" className="text-xs">You</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {m.user.email}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        m.role === "OWNER"
                          ? "default"
                          : m.role === "ADMIN"
                            ? "secondary"
                            : "outline"
                      }
                    >
                      {m.role === "OWNER" && <Crown className="mr-1 h-3 w-3" />}
                      {m.role === "ADMIN" && <ShieldCheck className="mr-1 h-3 w-3" />}
                      {m.role === "MEMBER" && <Shield className="mr-1 h-3 w-3" />}
                      {m.role}
                    </Badge>
                    {/* Role management dropdown - only for OWNER, and not on themselves */}
                    {isOwner && m.userId !== currentUserId && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {m.role === "MEMBER" && (
                            <DropdownMenuItem onClick={() => changeRole(m.userId, "promote")}>
                              <ShieldCheck className="mr-2 h-4 w-4" />
                              Promote to Admin
                            </DropdownMenuItem>
                          )}
                          {m.role === "ADMIN" && (
                            <DropdownMenuItem onClick={() => changeRole(m.userId, "demote")}>
                              <Shield className="mr-2 h-4 w-4" />
                              Demote to Member
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => changeRole(m.userId, "transfer_ownership")}>
                            <Crown className="mr-2 h-4 w-4" />
                            Transfer Ownership
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => removeMember(m.userId)}
                          >
                            <UserMinus className="mr-2 h-4 w-4" />
                            Remove from Group
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                    {/* Admin can remove members (but not other admins or owner) */}
                    {isAdmin && !isOwner && m.userId !== currentUserId && m.role === "MEMBER" && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => removeMember(m.userId)}
                          >
                            <UserMinus className="mr-2 h-4 w-4" />
                            Remove from Group
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {group.invitations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Pending Invitations</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {group.invitations.map((inv: any) => (
                  <div
                    key={inv.id}
                    className="flex items-center justify-between text-sm"
                  >
                    <span>{inv.email}</span>
                    <Badge variant="outline" className="text-yellow-600 border-yellow-600">Pending</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Settlements */}
        <TabsContent value="settlements" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={settlementOpen} onOpenChange={setSettlementOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="mr-2 h-4 w-4" /> Record Settlement
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Record Settlement</DialogTitle>
                  <DialogDescription>
                    Record a payment between group members.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Payer</Label>
                    <Select
                      value={settlementPayer}
                      onValueChange={setSettlementPayer}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Who paid" />
                      </SelectTrigger>
                      <SelectContent>
                        {group.members.map((m: any) => (
                          <SelectItem key={m.userId} value={m.userId}>
                            {m.user.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Receiver</Label>
                    <Select
                      value={settlementReceiver}
                      onValueChange={setSettlementReceiver}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Who received" />
                      </SelectTrigger>
                      <SelectContent>
                        {group.members
                          .filter((m: any) => m.userId !== settlementPayer)
                          .map((m: any) => (
                            <SelectItem key={m.userId} value={m.userId}>
                              {m.user.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Amount</Label>
                    <Input
                      type="number"
                      value={settlementAmount}
                      onChange={(e) => setSettlementAmount(e.target.value)}
                      placeholder="0"
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Note (optional)</Label>
                    <Input
                      value={settlementNote}
                      onChange={(e) => setSettlementNote(e.target.value)}
                      placeholder="e.g. UPI payment"
                    />
                  </div>
                  <Button
                    onClick={addSettlement}
                    className="w-full"
                    disabled={
                      !settlementPayer ||
                      !settlementReceiver ||
                      !settlementAmount ||
                      submitting
                    }
                  >
                    {submitting && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Record Settlement
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {group.settlements.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center py-12">
                <p className="text-muted-foreground">No settlements yet</p>
              </CardContent>
            </Card>
          ) : (
            group.settlements.map((s: any) => (
              <Card key={s.id}>
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{s.payer.name}</span>
                    <ArrowRight className="h-4 w-4 text-primary" />
                    <span className="font-medium">{s.receiver.name}</span>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-primary">
                      {formatCurrency(s.amount)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatRelativeDate(s.date)}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* Activity */}
        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Activity Feed
              </CardTitle>
            </CardHeader>
            <CardContent>
              {activityLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : activityLogs.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No activity yet</p>
              ) : (
                <div className="space-y-3">
                  {activityLogs.map((log: any) => (
                    <div
                      key={log.id}
                      className="flex items-start gap-3 rounded-lg border p-3"
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground shrink-0">
                        <Activity className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm">
                          <span className="font-medium">{log.user.name}</span>{" "}
                          <span className="text-muted-foreground">{log.detail || log.action}</span>
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatRelativeDate(log.createdAt)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics */}
        <TabsContent value="analytics">
          <GroupAnalyticsCharts groupId={id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
