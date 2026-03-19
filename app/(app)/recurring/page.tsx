"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Plus, Repeat, Trash2 } from "lucide-react";
import { formatCurrency, formatRelativeDate } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";

type RecurringExpense = {
  id: string;
  title: string;
  amount: number;
  category: string;
  frequency: "WEEKLY" | "MONTHLY" | "YEARLY";
  nextDue: string;
  active: boolean;
  groupId: string | null;
};

type Group = { id: string; name: string };

export default function RecurringPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);

  const [items, setItems] = useState<RecurringExpense[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);

  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("bills");
  const [frequency, setFrequency] = useState("MONTHLY");
  const [nextDue, setNextDue] = useState(new Date().toISOString().split("T")[0]);
  const [groupId, setGroupId] = useState("none");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const [recRes, grpRes] = await Promise.all([
      fetch("/api/recurring"),
      fetch("/api/groups"),
    ]);

    const [recData, grpData] = await Promise.all([recRes.json(), grpRes.json()]);
    setItems(recData.recurring || []);
    setGroups((grpData.groups || []).map((g: any) => ({ id: g.id, name: g.name })));
    setLoading(false);
  }

  async function addRecurring() {
    if (!title || !amount) return;
    setSaving(true);

    const res = await fetch("/api/recurring", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        amount: parseFloat(amount),
        category,
        frequency,
        nextDue,
        groupId: groupId === "none" ? undefined : groupId,
      }),
    });

    if (res.ok) {
      toast({ title: "Recurring expense added" });
      setOpen(false);
      setTitle("");
      setAmount("");
      setCategory("bills");
      setFrequency("MONTHLY");
      setNextDue(new Date().toISOString().split("T")[0]);
      setGroupId("none");
      loadData();
    }

    setSaving(false);
  }

  async function toggleActive(item: RecurringExpense) {
    await fetch(`/api/recurring/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !item.active }),
    });
    toast({ title: item.active ? "Recurring paused" : "Recurring resumed" });
    loadData();
  }

  async function removeItem(id: string) {
    await fetch(`/api/recurring/${id}`, { method: "DELETE" });
    toast({ title: "Recurring expense deleted" });
    loadData();
  }

  const stats = useMemo(() => {
    const active = items.filter((i) => i.active);
    const monthlyEstimate = active.reduce((sum, i) => {
      if (i.frequency === "WEEKLY") return sum + i.amount * 4;
      if (i.frequency === "YEARLY") return sum + i.amount / 12;
      return sum + i.amount;
    }, 0);

    return {
      total: items.length,
      active: active.length,
      monthlyEstimate,
    };
  }, [items]);

  if (loading) {
    return (
      <div className="flex h-[45vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Recurring Expense Planner</h1>
          <p className="text-sm text-muted-foreground">
            Automate all repeating payments and keep your cashflow predictable.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Add Recurring
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Recurring Expense</DialogTitle>
              <DialogDescription>
                Set schedule, amount, and category for repeated spending.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Internet bill" />
              </div>
              <div className="space-y-2">
                <Label>Amount</Label>
                <Input type="number" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="bills" />
              </div>
              <div className="space-y-2">
                <Label>Frequency</Label>
                <Select value={frequency} onValueChange={setFrequency}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="WEEKLY">Weekly</SelectItem>
                    <SelectItem value="MONTHLY">Monthly</SelectItem>
                    <SelectItem value="YEARLY">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Next Due Date</Label>
                <Input type="date" value={nextDue} onChange={(e) => setNextDue(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Linked Group (optional)</Label>
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
              <Button className="w-full" onClick={addRecurring} disabled={saving || !title || !amount}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Recurring Expense
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="pro-surface">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Rules</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.total}</p>
          </CardContent>
        </Card>
        <Card className="pro-surface">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Rules</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-primary">{stats.active}</p>
          </CardContent>
        </Card>
        <Card className="pro-surface">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Monthly Estimate</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(stats.monthlyEstimate)}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="pro-surface">
        <CardHeader>
          <CardTitle>Recurring Entries</CardTitle>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Repeat className="mb-3 h-8 w-8 text-muted-foreground" />
              <p className="font-medium">No recurring entries yet</p>
              <p className="text-sm text-muted-foreground">Create one to automate regular payments.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((item) => (
                <div key={item.id} className="rounded-xl border bg-background/70 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold">{item.title}</p>
                        <Badge variant={item.active ? "default" : "secondary"}>
                          {item.active ? "Active" : "Paused"}
                        </Badge>
                        <Badge variant="outline">{item.frequency}</Badge>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {item.category} • Next due {formatRelativeDate(item.nextDue)}
                      </p>
                    </div>
                    <p className="text-lg font-semibold">{formatCurrency(item.amount)}</p>
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <Button size="sm" variant="outline" onClick={() => toggleActive(item)}>
                      {item.active ? "Pause" : "Resume"}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => removeItem(item.id)}>
                      <Trash2 className="mr-1 h-4 w-4 text-destructive" /> Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
