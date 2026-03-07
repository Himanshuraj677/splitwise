"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, Loader2, MoreVertical, Trash2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import {
  formatCurrency,
  formatRelativeDate,
  getCategoryInfo,
  EXPENSE_CATEGORIES,
} from "@/lib/utils";

interface PersonalExpense {
  id: string;
  amount: number;
  category: string;
  date: string;
  note: string | null;
}

interface BudgetData {
  budget: { monthlyLimit: number; categoryBudgets: Record<string, number> } | null;
  totalSpent: number;
  categorySpent: Record<string, number>;
  remaining: number | null;
  percentage: number | null;
}

export default function PersonalExpensesPage() {
  const { toast } = useToast();
  const [expenses, setExpenses] = useState<PersonalExpense[]>([]);
  const [summary, setSummary] = useState({ total: 0, categoryBreakdown: {} as Record<string, number> });
  const [budgetData, setBudgetData] = useState<BudgetData | null>(null);
  const [loading, setLoading] = useState(true);

  // Add expense
  const [addOpen, setAddOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("food");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Budget
  const [budgetOpen, setBudgetOpen] = useState(false);
  const [budgetLimit, setBudgetLimit] = useState("");

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const [expRes, budRes] = await Promise.all([
      fetch(`/api/personal-expenses?month=${currentMonth}&year=${currentYear}`),
      fetch(`/api/budgets?month=${currentMonth}&year=${currentYear}`),
    ]);

    const expData = await expRes.json();
    const budData = await budRes.json();

    setExpenses(expData.expenses || []);
    setSummary(expData.summary || { total: 0, categoryBreakdown: {} });
    setBudgetData(budData);
    setLoading(false);
  }

  async function addExpense() {
    if (!amount) return;
    setSubmitting(true);

    const res = await fetch("/api/personal-expenses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: parseFloat(amount),
        category,
        date,
        note: note || undefined,
      }),
    });

    if (res.ok) {
      toast({ title: "Expense added!" });
      setAddOpen(false);
      setAmount("");
      setNote("");
      loadData();
    }
    setSubmitting(false);
  }

  async function deleteExpense(id: string) {
    await fetch(`/api/personal-expenses/${id}`, { method: "DELETE" });
    toast({ title: "Expense deleted" });
    loadData();
  }

  async function setBudget() {
    if (!budgetLimit) return;
    setSubmitting(true);

    await fetch("/api/budgets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        monthlyLimit: parseFloat(budgetLimit),
        month: currentMonth,
        year: currentYear,
      }),
    });

    toast({ title: "Budget set!" });
    setBudgetOpen(false);
    loadData();
    setSubmitting(false);
  }

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const budgetPercentage = budgetData?.percentage || 0;
  const budgetColor =
    budgetPercentage >= 100
      ? "text-destructive"
      : budgetPercentage >= 80
        ? "text-yellow-600"
        : "text-green-600";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Personal Expenses</h1>
        <div className="flex gap-2">
          <Dialog open={budgetOpen} onOpenChange={setBudgetOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">Set Budget</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Set Monthly Budget</DialogTitle>
                <DialogDescription>
                  Set your monthly spending limit.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Monthly Limit</Label>
                  <Input
                    type="number"
                    value={budgetLimit}
                    onChange={(e) => setBudgetLimit(e.target.value)}
                    placeholder={
                      budgetData?.budget?.monthlyLimit?.toString() || "10000"
                    }
                    min="0"
                  />
                </div>
                <Button onClick={setBudget} className="w-full" disabled={submitting}>
                  {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Budget
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" /> Add Expense
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Personal Expense</DialogTitle>
                <DialogDescription>Track your personal spending.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Amount</Label>
                  <Input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0"
                    min="0"
                    step="0.01"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={category} onValueChange={setCategory}>
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
                  <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Note (optional)</Label>
                  <Input
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Add a note..."
                  />
                </div>
                <Button
                  onClick={addExpense}
                  className="w-full"
                  disabled={!amount || submitting}
                >
                  {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Add Expense
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Budget Progress */}
      {budgetData?.budget && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Monthly Budget</span>
              <span className={budgetColor}>
                {formatCurrency(budgetData.totalSpent)} / {formatCurrency(budgetData.budget.monthlyLimit)}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Progress value={Math.min(budgetPercentage, 100)} className="h-3" />
            <div className="flex justify-between mt-2 text-sm text-muted-foreground">
              <span>{Math.round(budgetPercentage)}% used</span>
              <span>
                {budgetData.remaining !== null && budgetData.remaining > 0
                  ? `${formatCurrency(budgetData.remaining)} remaining`
                  : "Budget exceeded!"}
              </span>
            </div>
            {budgetPercentage >= 80 && budgetPercentage < 100 && (
              <p className="text-sm text-yellow-600 mt-2">
                ⚠️ You&apos;ve used 80% of your monthly budget
              </p>
            )}
            {budgetPercentage >= 100 && (
              <p className="text-sm text-destructive mt-2">
                🚨 You&apos;ve exceeded your monthly budget!
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Summary */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>This Month Total</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{formatCurrency(summary.total)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Category Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {Object.entries(summary.categoryBreakdown).length === 0 ? (
              <p className="text-sm text-muted-foreground">No expenses this month</p>
            ) : (
              Object.entries(summary.categoryBreakdown)
                .sort(([, a], [, b]) => b - a)
                .map(([cat, amount]) => {
                  const info = getCategoryInfo(cat);
                  return (
                    <div key={cat} className="flex items-center justify-between text-sm">
                      <span>
                        {info.icon} {info.label}
                      </span>
                      <span className="font-medium">{formatCurrency(amount)}</span>
                    </div>
                  );
                })
            )}
          </CardContent>
        </Card>
      </div>

      {/* Expense List */}
      <Card>
        <CardHeader>
          <CardTitle>Expenses</CardTitle>
        </CardHeader>
        <CardContent>
          {expenses.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">
              No personal expenses yet
            </p>
          ) : (
            <div className="space-y-3">
              {expenses.map((expense) => {
                const cat = getCategoryInfo(expense.category);
                return (
                  <div
                    key={expense.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{cat.icon}</span>
                      <div>
                        <p className="font-medium text-sm">{cat.label}</p>
                        {expense.note && (
                          <p className="text-xs text-muted-foreground">
                            {expense.note}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <p className="font-semibold">
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
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
