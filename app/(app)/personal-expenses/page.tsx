"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Badge } from "@/components/ui/badge";
import {
  ArrowDownUp,
  ArrowUpRight,
  CalendarClock,
  Download,
  LayoutTemplate,
  Loader2,
  PiggyBank,
  Plus,
  Receipt,
  Target,
  Trash2,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import {
  GOAL_STATUSES,
  formatCurrency,
  formatRelativeDate,
  getCategoryInfo,
  EXPENSE_CATEGORIES,
  humanizeEnum,
  INCOME_TYPES,
  INVESTMENT_TYPES,
  LIABILITY_TYPES,
} from "@/lib/utils";

interface PersonalExpense {
  id: string;
  amount: number;
  category: string;
  date: string;
  note: string | null;
}

interface IncomeEntry {
  id: string;
  source: string;
  type: string;
  amount: number;
  recurring: boolean;
  receivedAt: string;
  note: string | null;
}

interface Investment {
  id: string;
  name: string;
  type: string;
  investedAmount: number;
  currentValue: number;
  investedAt: string;
  platform: string | null;
  note: string | null;
}

interface Liability {
  id: string;
  name: string;
  type: string;
  totalAmount: number;
  outstandingAmount: number;
  interestRate: number | null;
  minimumDue: number | null;
  dueDate: string | null;
  note: string | null;
}

interface SavingsGoal {
  id: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string | null;
  status: "ACTIVE" | "ACHIEVED" | "PAUSED";
  note: string | null;
}

interface BudgetData {
  budget: { monthlyLimit: number; categoryBudgets: Record<string, number> } | null;
  totalSpent: number;
  categorySpent: Record<string, number>;
  remaining: number | null;
  percentage: number | null;
}

interface FinanceOverview {
  incomeThisMonth: number;
  personalExpensesThisMonth: number;
  groupExpensesThisMonth: number;
  totalExpensesThisMonth: number;
  monthlyCashflow: number;
  totalInvested: number;
  totalInvestmentValue: number;
  totalInvestmentGainLoss: number;
  totalLiabilities: number;
  totalGoalSavings: number;
  totalGoalTarget: number;
  activeGoals: number;
  netWorth: number;
  trend: Array<{
    month: string;
    income: number;
    expenses: number;
    cashflow: number;
  }>;
}

const TRACKABLE_AREAS = [
  "Daily personal spending",
  "Group/shared expense portions",
  "Income from salary, freelance, business, and more",
  "Investment portfolio and gain/loss",
  "Loans, credit cards, and other liabilities",
  "Savings goals and progress",
  "Monthly cashflow and net worth",
  "Budget usage and category-wise control",
];

export default function PersonalExpensesPage() {
  const { toast } = useToast();
  const [expenses, setExpenses] = useState<PersonalExpense[]>([]);
  const [summary, setSummary] = useState({ total: 0, categoryBreakdown: {} as Record<string, number> });
  const [budgetData, setBudgetData] = useState<BudgetData | null>(null);
  const [overview, setOverview] = useState<FinanceOverview | null>(null);

  const [incomeEntries, setIncomeEntries] = useState<IncomeEntry[]>([]);
  const [incomeSummary, setIncomeSummary] = useState({ total: 0, recurringCount: 0, typeBreakdown: {} as Record<string, number> });

  const [investments, setInvestments] = useState<Investment[]>([]);
  const [investmentSummary, setInvestmentSummary] = useState({ totalInvested: 0, totalCurrentValue: 0, totalGainLoss: 0 });

  const [liabilities, setLiabilities] = useState<Liability[]>([]);
  const [liabilitySummary, setLiabilitySummary] = useState({ totalOutstanding: 0, totalOriginal: 0, paidOff: 0 });

  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [goalSummary, setGoalSummary] = useState({ totalTarget: 0, totalSaved: 0, completion: 0 });

  const [loading, setLoading] = useState(true);

  // Expense form
  const [addOpen, setAddOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("food");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [note, setNote] = useState("");

  // Income form
  const [incomeOpen, setIncomeOpen] = useState(false);
  const [incomeSource, setIncomeSource] = useState("");
  const [incomeType, setIncomeType] = useState("SALARY");
  const [incomeAmount, setIncomeAmount] = useState("");
  const [incomeDate, setIncomeDate] = useState(new Date().toISOString().split("T")[0]);
  const [incomeRecurring, setIncomeRecurring] = useState("no");
  const [incomeNote, setIncomeNote] = useState("");

  // Investment form
  const [investmentOpen, setInvestmentOpen] = useState(false);
  const [investmentName, setInvestmentName] = useState("");
  const [investmentType, setInvestmentType] = useState("STOCK");
  const [investedAmount, setInvestedAmount] = useState("");
  const [currentValue, setCurrentValue] = useState("");
  const [investedDate, setInvestedDate] = useState(new Date().toISOString().split("T")[0]);
  const [investmentPlatform, setInvestmentPlatform] = useState("");
  const [investmentNote, setInvestmentNote] = useState("");

  // Liability form
  const [liabilityOpen, setLiabilityOpen] = useState(false);
  const [liabilityName, setLiabilityName] = useState("");
  const [liabilityType, setLiabilityType] = useState("LOAN");
  const [liabilityTotal, setLiabilityTotal] = useState("");
  const [liabilityOutstanding, setLiabilityOutstanding] = useState("");
  const [liabilityInterest, setLiabilityInterest] = useState("");
  const [liabilityMinimumDue, setLiabilityMinimumDue] = useState("");
  const [liabilityDueDate, setLiabilityDueDate] = useState("");
  const [liabilityNote, setLiabilityNote] = useState("");

  // Goal form
  const [goalOpen, setGoalOpen] = useState(false);
  const [goalTitle, setGoalTitle] = useState("");
  const [goalTarget, setGoalTarget] = useState("");
  const [goalCurrent, setGoalCurrent] = useState("");
  const [goalDate, setGoalDate] = useState("");
  const [goalStatus, setGoalStatus] = useState("ACTIVE");
  const [goalNote, setGoalNote] = useState("");

  const [submitting, setSubmitting] = useState(false);

  // Budget form
  const [budgetOpen, setBudgetOpen] = useState(false);
  const [budgetLimit, setBudgetLimit] = useState("");
  const searchParams = useSearchParams();
  const allowedTabs = ["overview", "expenses", "income", "investments", "liabilities", "goals"];
  const urlTab = searchParams.get("tab") || "overview";
  const [activeTab, setActiveTab] = useState(
    allowedTabs.includes(urlTab) ? urlTab : "overview"
  );

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const next = searchParams.get("tab") || "overview";
    if (allowedTabs.includes(next)) {
      setActiveTab(next);
    }
  }, [searchParams]);

  async function loadData() {
    try {
      const [
        expRes,
        budRes,
        overviewRes,
        incomeRes,
        investmentRes,
        liabilityRes,
        goalRes,
      ] = await Promise.all([
        fetch(`/api/personal-expenses?month=${currentMonth}&year=${currentYear}`),
        fetch(`/api/budgets?month=${currentMonth}&year=${currentYear}`),
        fetch("/api/finance-overview"),
        fetch(`/api/income?month=${currentMonth}&year=${currentYear}`),
        fetch("/api/investments"),
        fetch("/api/liabilities"),
        fetch("/api/savings-goals"),
      ]);

      const [
        expData,
        budData,
        overviewData,
        incomeData,
        investmentData,
        liabilityData,
        goalData,
      ] = await Promise.all([
        expRes.json(),
        budRes.json(),
        overviewRes.json(),
        incomeRes.json(),
        investmentRes.json(),
        liabilityRes.json(),
        goalRes.json(),
      ]);

      setExpenses(expData.expenses || []);
      setSummary(expData.summary || { total: 0, categoryBreakdown: {} });
      setBudgetData(budData);
      setOverview(overviewData);

      setIncomeEntries(incomeData.entries || []);
      setIncomeSummary(
        incomeData.summary || { total: 0, recurringCount: 0, typeBreakdown: {} }
      );

      setInvestments(investmentData.investments || []);
      setInvestmentSummary(
        investmentData.summary || {
          totalInvested: 0,
          totalCurrentValue: 0,
          totalGainLoss: 0,
        }
      );

      setLiabilities(liabilityData.liabilities || []);
      setLiabilitySummary(
        liabilityData.summary || { totalOutstanding: 0, totalOriginal: 0, paidOff: 0 }
      );

      setGoals(goalData.goals || []);
      setGoalSummary(goalData.summary || { totalTarget: 0, totalSaved: 0, completion: 0 });
    } finally {
      setLoading(false);
    }
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

  async function addIncome() {
    if (!incomeSource || !incomeAmount) return;
    setSubmitting(true);

    const res = await fetch("/api/income", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source: incomeSource,
        type: incomeType,
        amount: parseFloat(incomeAmount),
        receivedAt: incomeDate,
        recurring: incomeRecurring === "yes",
        note: incomeNote || undefined,
      }),
    });

    if (res.ok) {
      toast({ title: "Income added" });
      setIncomeOpen(false);
      setIncomeSource("");
      setIncomeAmount("");
      setIncomeRecurring("no");
      setIncomeNote("");
      loadData();
    }
    setSubmitting(false);
  }

  async function addInvestment() {
    if (!investmentName || !investedAmount || !currentValue) return;
    setSubmitting(true);

    const res = await fetch("/api/investments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: investmentName,
        type: investmentType,
        investedAmount: parseFloat(investedAmount),
        currentValue: parseFloat(currentValue),
        investedAt: investedDate,
        platform: investmentPlatform || undefined,
        note: investmentNote || undefined,
      }),
    });

    if (res.ok) {
      toast({ title: "Investment added" });
      setInvestmentOpen(false);
      setInvestmentName("");
      setInvestedAmount("");
      setCurrentValue("");
      setInvestmentPlatform("");
      setInvestmentNote("");
      loadData();
    }
    setSubmitting(false);
  }

  async function addLiability() {
    if (!liabilityName || !liabilityTotal || !liabilityOutstanding) return;
    setSubmitting(true);

    const res = await fetch("/api/liabilities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: liabilityName,
        type: liabilityType,
        totalAmount: parseFloat(liabilityTotal),
        outstandingAmount: parseFloat(liabilityOutstanding),
        interestRate: liabilityInterest ? parseFloat(liabilityInterest) : undefined,
        minimumDue: liabilityMinimumDue ? parseFloat(liabilityMinimumDue) : undefined,
        dueDate: liabilityDueDate || undefined,
        note: liabilityNote || undefined,
      }),
    });

    if (res.ok) {
      toast({ title: "Liability added" });
      setLiabilityOpen(false);
      setLiabilityName("");
      setLiabilityTotal("");
      setLiabilityOutstanding("");
      setLiabilityInterest("");
      setLiabilityMinimumDue("");
      setLiabilityDueDate("");
      setLiabilityNote("");
      loadData();
    }
    setSubmitting(false);
  }

  async function addGoal() {
    if (!goalTitle || !goalTarget) return;
    setSubmitting(true);

    const res = await fetch("/api/savings-goals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: goalTitle,
        targetAmount: parseFloat(goalTarget),
        currentAmount: goalCurrent ? parseFloat(goalCurrent) : 0,
        targetDate: goalDate || undefined,
        status: goalStatus,
        note: goalNote || undefined,
      }),
    });

    if (res.ok) {
      toast({ title: "Goal added" });
      setGoalOpen(false);
      setGoalTitle("");
      setGoalTarget("");
      setGoalCurrent("");
      setGoalDate("");
      setGoalStatus("ACTIVE");
      setGoalNote("");
      loadData();
    }
    setSubmitting(false);
  }

  async function deleteExpense(id: string) {
    await fetch(`/api/personal-expenses/${id}`, { method: "DELETE" });
    toast({ title: "Expense deleted" });
    loadData();
  }

  async function deleteIncome(id: string) {
    await fetch(`/api/income/${id}`, { method: "DELETE" });
    toast({ title: "Income entry deleted" });
    loadData();
  }

  async function deleteInvestment(id: string) {
    await fetch(`/api/investments/${id}`, { method: "DELETE" });
    toast({ title: "Investment deleted" });
    loadData();
  }

  async function deleteLiability(id: string) {
    await fetch(`/api/liabilities/${id}`, { method: "DELETE" });
    toast({ title: "Liability deleted" });
    loadData();
  }

  async function deleteGoal(id: string) {
    await fetch(`/api/savings-goals/${id}`, { method: "DELETE" });
    toast({ title: "Goal deleted" });
    loadData();
  }

  async function addContribution(goal: SavingsGoal) {
    const raw = window.prompt("Add amount to this goal", "0");
    if (!raw) return;
    const amount = parseFloat(raw);
    if (Number.isNaN(amount) || amount <= 0) return;

    await fetch(`/api/savings-goals/${goal.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        currentAmount: goal.currentAmount + amount,
        status: goal.currentAmount + amount >= goal.targetAmount ? "ACHIEVED" : goal.status,
      }),
    });

    toast({ title: "Goal updated" });
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
      <div className="space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Finance Hub</h1>
            <p className="text-sm text-muted-foreground">
              Track all money movement: expenses, income, investments, debts, and savings goals.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Dialog open={addOpen} onOpenChange={setAddOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" /> Expense
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

            <Dialog open={incomeOpen} onOpenChange={setIncomeOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Plus className="mr-2 h-4 w-4" /> Income
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Income</DialogTitle>
                  <DialogDescription>Track every incoming money source.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Source</Label>
                    <Input
                      value={incomeSource}
                      onChange={(e) => setIncomeSource(e.target.value)}
                      placeholder="Salary from company"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select value={incomeType} onValueChange={setIncomeType}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {INCOME_TYPES.map((item) => (
                          <SelectItem key={item.value} value={item.value}>
                            {item.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Amount</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={incomeAmount}
                      onChange={(e) => setIncomeAmount(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Received Date</Label>
                    <Input type="date" value={incomeDate} onChange={(e) => setIncomeDate(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Recurring</Label>
                    <Select value={incomeRecurring} onValueChange={setIncomeRecurring}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="yes">Yes</SelectItem>
                        <SelectItem value="no">No</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Note (optional)</Label>
                    <Input value={incomeNote} onChange={(e) => setIncomeNote(e.target.value)} />
                  </div>
                  <Button
                    onClick={addIncome}
                    className="w-full"
                    disabled={!incomeSource || !incomeAmount || submitting}
                  >
                    {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Add Income
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={investmentOpen} onOpenChange={setInvestmentOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Plus className="mr-2 h-4 w-4" /> Investment
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Investment</DialogTitle>
                  <DialogDescription>Monitor portfolio and returns.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Name</Label>
                    <Input value={investmentName} onChange={(e) => setInvestmentName(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select value={investmentType} onValueChange={setInvestmentType}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {INVESTMENT_TYPES.map((item) => (
                          <SelectItem key={item.value} value={item.value}>
                            {item.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Invested</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={investedAmount}
                        onChange={(e) => setInvestedAmount(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Current Value</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={currentValue}
                        onChange={(e) => setCurrentValue(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Invested Date</Label>
                    <Input type="date" value={investedDate} onChange={(e) => setInvestedDate(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Platform (optional)</Label>
                    <Input value={investmentPlatform} onChange={(e) => setInvestmentPlatform(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Note (optional)</Label>
                    <Input value={investmentNote} onChange={(e) => setInvestmentNote(e.target.value)} />
                  </div>
                  <Button
                    onClick={addInvestment}
                    className="w-full"
                    disabled={!investmentName || !investedAmount || !currentValue || submitting}
                  >
                    {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Add Investment
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={liabilityOpen} onOpenChange={setLiabilityOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Plus className="mr-2 h-4 w-4" /> Liability
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Liability</DialogTitle>
                  <DialogDescription>Track loans, cards, and debt obligations.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Name</Label>
                    <Input value={liabilityName} onChange={(e) => setLiabilityName(e.target.value)} placeholder="Car loan" />
                  </div>
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select value={liabilityType} onValueChange={setLiabilityType}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {LIABILITY_TYPES.map((item) => (
                          <SelectItem key={item.value} value={item.value}>
                            {item.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Total Amount</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={liabilityTotal}
                        onChange={(e) => setLiabilityTotal(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Outstanding</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={liabilityOutstanding}
                        onChange={(e) => setLiabilityOutstanding(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Interest % (optional)</Label>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={liabilityInterest}
                        onChange={(e) => setLiabilityInterest(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Minimum Due (optional)</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={liabilityMinimumDue}
                        onChange={(e) => setLiabilityMinimumDue(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Due Date (optional)</Label>
                    <Input type="date" value={liabilityDueDate} onChange={(e) => setLiabilityDueDate(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Note (optional)</Label>
                    <Input value={liabilityNote} onChange={(e) => setLiabilityNote(e.target.value)} />
                  </div>
                  <Button
                    onClick={addLiability}
                    className="w-full"
                    disabled={!liabilityName || !liabilityTotal || !liabilityOutstanding || submitting}
                  >
                    {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Add Liability
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={goalOpen} onOpenChange={setGoalOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Plus className="mr-2 h-4 w-4" /> Goal
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Savings Goal</DialogTitle>
                  <DialogDescription>Create a target and track progress.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Goal Title</Label>
                    <Input value={goalTitle} onChange={(e) => setGoalTitle(e.target.value)} placeholder="Emergency Fund" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Target Amount</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={goalTarget}
                        onChange={(e) => setGoalTarget(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Current Saved</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={goalCurrent}
                        onChange={(e) => setGoalCurrent(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select value={goalStatus} onValueChange={setGoalStatus}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {GOAL_STATUSES.map((item) => (
                          <SelectItem key={item.value} value={item.value}>
                            {item.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Target Date (optional)</Label>
                    <Input type="date" value={goalDate} onChange={(e) => setGoalDate(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Note (optional)</Label>
                    <Input value={goalNote} onChange={(e) => setGoalNote(e.target.value)} />
                  </div>
                  <Button
                    onClick={addGoal}
                    className="w-full"
                    disabled={!goalTitle || !goalTarget || submitting}
                  >
                    {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Add Goal
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Income This Month</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(overview?.incomeThisMonth || 0)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Expenses This Month</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-destructive">
                {formatCurrency(overview?.totalExpensesThisMonth || 0)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Monthly Cashflow</CardTitle>
            </CardHeader>
            <CardContent>
              <p
                className={`text-2xl font-bold ${
                  (overview?.monthlyCashflow || 0) >= 0 ? "text-green-600" : "text-destructive"
                }`}
              >
                {formatCurrency(overview?.monthlyCashflow || 0)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Estimated Net Worth</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{formatCurrency(overview?.netWorth || 0)}</p>
            </CardContent>
          </Card>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 gap-2 md:grid-cols-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
          <TabsTrigger value="income">Income</TabsTrigger>
          <TabsTrigger value="investments">Investments</TabsTrigger>
          <TabsTrigger value="liabilities">Liabilities</TabsTrigger>
          <TabsTrigger value="goals">Goals</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Everything You Can Track</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2 md:grid-cols-2">
              {TRACKABLE_AREAS.map((area) => (
                <div key={area} className="rounded-lg border bg-card/60 px-3 py-2 text-sm">
                  {area}
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Portfolio Value</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                <div className="flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-muted-foreground" />
                  <p className="text-xl font-bold">
                    {formatCurrency(overview?.totalInvestmentValue || 0)}
                  </p>
                </div>
                <p
                  className={`text-xs ${
                    (overview?.totalInvestmentGainLoss || 0) >= 0
                      ? "text-green-600"
                      : "text-destructive"
                  }`}
                >
                  Gain/Loss: {formatCurrency(overview?.totalInvestmentGainLoss || 0)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Liabilities</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <TrendingDown className="h-4 w-4 text-destructive" />
                  <p className="text-xl font-bold text-destructive">
                    {formatCurrency(overview?.totalLiabilities || 0)}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Saved For Goals</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center gap-2">
                  <PiggyBank className="h-4 w-4 text-primary" />
                  <p className="text-xl font-bold">
                    {formatCurrency(overview?.totalGoalSavings || 0)}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">
                  Target: {formatCurrency(overview?.totalGoalTarget || 0)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Active Goals</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-muted-foreground" />
                  <p className="text-xl font-bold">{overview?.activeGoals || 0}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Cashflow Trend (Last 6 Months)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(overview?.trend || []).map((item) => (
                <div
                  key={item.month}
                  className="flex flex-col gap-2 rounded-lg border p-3 md:flex-row md:items-center md:justify-between"
                >
                  <p className="font-medium">{item.month}</p>
                  <div className="flex flex-wrap gap-4 text-sm">
                    <span className="text-green-600">Income: {formatCurrency(item.income)}</span>
                    <span className="text-destructive">Expenses: {formatCurrency(item.expenses)}</span>
                    <span className={item.cashflow >= 0 ? "text-green-600" : "text-destructive"}>
                      Cashflow: {formatCurrency(item.cashflow)}
                    </span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="pro-surface">
            <CardHeader>
              <CardTitle>Connected Tools</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
              <Link href="/recurring" className="rounded-xl border bg-background/70 p-3 transition-colors hover:border-primary/40 hover:bg-primary/5">
                <div className="mb-2 inline-flex rounded-md bg-primary/10 p-2 text-primary">
                  <CalendarClock className="h-4 w-4" />
                </div>
                <p className="font-semibold text-sm">Recurring Planner</p>
                <p className="text-xs text-muted-foreground">Automate repeated spending</p>
              </Link>
              <Link href="/templates" className="rounded-xl border bg-background/70 p-3 transition-colors hover:border-primary/40 hover:bg-primary/5">
                <div className="mb-2 inline-flex rounded-md bg-primary/10 p-2 text-primary">
                  <LayoutTemplate className="h-4 w-4" />
                </div>
                <p className="font-semibold text-sm">Template Vault</p>
                <p className="text-xs text-muted-foreground">Reuse split patterns quickly</p>
              </Link>
              <Link href="/reminders" className="rounded-xl border bg-background/70 p-3 transition-colors hover:border-primary/40 hover:bg-primary/5">
                <div className="mb-2 inline-flex rounded-md bg-primary/10 p-2 text-primary">
                  <TrendingUp className="h-4 w-4" />
                </div>
                <p className="font-semibold text-sm">Payment Reminders</p>
                <p className="text-xs text-muted-foreground">Follow up pending money</p>
              </Link>
              <Link href="/export-center" className="rounded-xl border bg-background/70 p-3 transition-colors hover:border-primary/40 hover:bg-primary/5">
                <div className="mb-2 inline-flex rounded-md bg-primary/10 p-2 text-primary">
                  <Download className="h-4 w-4" />
                </div>
                <p className="font-semibold text-sm">Export Center</p>
                <p className="text-xs text-muted-foreground">Download finance data</p>
              </Link>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="expenses" className="space-y-4">
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
                <div className="mt-2 flex justify-between text-sm text-muted-foreground">
                  <span>{Math.round(budgetPercentage)}% used</span>
                  <span>
                    {budgetData.remaining !== null && budgetData.remaining > 0
                      ? `${formatCurrency(budgetData.remaining)} remaining`
                      : "Budget exceeded!"}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}

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

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Personal Expense Entries</span>
                <Link href="/search" className="text-xs font-medium text-primary hover:underline inline-flex items-center gap-1">
                  Search all <ArrowUpRight className="h-3 w-3" />
                </Link>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {expenses.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="mb-4 rounded-full bg-primary/10 p-4">
                    <Receipt className="h-8 w-8 text-primary" />
                  </div>
                  <p className="font-medium">No personal expenses yet</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Track your daily spending by adding expenses above.
                  </p>
                </div>
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
                              <p className="text-xs text-muted-foreground">{expense.note}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <p className="font-semibold">{formatCurrency(expense.amount)}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatRelativeDate(expense.date)}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteExpense(expense.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="income" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Income (Month)</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(incomeSummary.total)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Recurring Sources</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{incomeSummary.recurringCount}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Top Source Type</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm font-semibold">
                  {Object.entries(incomeSummary.typeBreakdown).sort(([, a], [, b]) => b - a)[0]?.[0]
                    ? humanizeEnum(Object.entries(incomeSummary.typeBreakdown).sort(([, a], [, b]) => b - a)[0][0])
                    : "-"}
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Income Entries</CardTitle>
            </CardHeader>
            <CardContent>
              {incomeEntries.length === 0 ? (
                <p className="text-sm text-muted-foreground">No income entries this month.</p>
              ) : (
                <div className="space-y-3">
                  {incomeEntries.map((entry) => (
                    <div key={entry.id} className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <p className="font-medium">{entry.source}</p>
                        <p className="text-xs text-muted-foreground">
                          {humanizeEnum(entry.type)} • {formatRelativeDate(entry.receivedAt)}
                          {entry.recurring ? " • Recurring" : ""}
                        </p>
                        {entry.note && (
                          <p className="mt-1 text-xs text-muted-foreground">{entry.note}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <p className="font-semibold text-green-600">{formatCurrency(entry.amount)}</p>
                        <Button variant="ghost" size="icon" onClick={() => deleteIncome(entry.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="investments" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Invested</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{formatCurrency(investmentSummary.totalInvested)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Current Value</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{formatCurrency(investmentSummary.totalCurrentValue)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Gain / Loss</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center gap-2">
                {(investmentSummary.totalGainLoss || 0) >= 0 ? (
                  <TrendingUp className="h-4 w-4 text-green-600" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-destructive" />
                )}
                <p
                  className={`text-2xl font-bold ${
                    (investmentSummary.totalGainLoss || 0) >= 0
                      ? "text-green-600"
                      : "text-destructive"
                  }`}
                >
                  {formatCurrency(investmentSummary.totalGainLoss)}
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Investment Portfolio</CardTitle>
            </CardHeader>
            <CardContent>
              {investments.length === 0 ? (
                <p className="text-sm text-muted-foreground">No investments tracked yet.</p>
              ) : (
                <div className="space-y-3">
                  {investments.map((item) => {
                    const gain = item.currentValue - item.investedAmount;
                    return (
                      <div key={item.id} className="rounded-lg border p-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{item.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {humanizeEnum(item.type)} • {formatRelativeDate(item.investedAt)}
                              {item.platform ? ` • ${item.platform}` : ""}
                            </p>
                          </div>
                          <Button variant="ghost" size="icon" onClick={() => deleteInvestment(item.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                        <div className="mt-2 grid gap-2 text-sm md:grid-cols-3">
                          <p>Invested: <span className="font-semibold">{formatCurrency(item.investedAmount)}</span></p>
                          <p>Current: <span className="font-semibold">{formatCurrency(item.currentValue)}</span></p>
                          <p className={gain >= 0 ? "text-green-600" : "text-destructive"}>
                            P/L: <span className="font-semibold">{formatCurrency(gain)}</span>
                          </p>
                        </div>
                        {item.note && <p className="mt-2 text-xs text-muted-foreground">{item.note}</p>}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="liabilities" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Original Debt</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{formatCurrency(liabilitySummary.totalOriginal)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-destructive">
                  {formatCurrency(liabilitySummary.totalOutstanding)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Paid Off</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(liabilitySummary.paidOff)}
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Liabilities</CardTitle>
            </CardHeader>
            <CardContent>
              {liabilities.length === 0 ? (
                <p className="text-sm text-muted-foreground">No liabilities tracked yet.</p>
              ) : (
                <div className="space-y-3">
                  {liabilities.map((item) => (
                    <div key={item.id} className="rounded-lg border p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{item.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {humanizeEnum(item.type)}
                            {item.dueDate ? ` • Due ${formatRelativeDate(item.dueDate)}` : ""}
                          </p>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => deleteLiability(item.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                      <div className="mt-2 grid gap-2 text-sm md:grid-cols-4">
                        <p>Total: <span className="font-semibold">{formatCurrency(item.totalAmount)}</span></p>
                        <p>Outstanding: <span className="font-semibold text-destructive">{formatCurrency(item.outstandingAmount)}</span></p>
                        <p>Min Due: <span className="font-semibold">{formatCurrency(item.minimumDue || 0)}</span></p>
                        <p>Interest: <span className="font-semibold">{item.interestRate || 0}%</span></p>
                      </div>
                      {item.note && <p className="mt-2 text-xs text-muted-foreground">{item.note}</p>}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="goals" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Saved</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{formatCurrency(goalSummary.totalSaved)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Target</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{formatCurrency(goalSummary.totalTarget)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Completion</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-2xl font-bold">{Math.round(goalSummary.completion)}%</p>
                <Progress value={Math.min(goalSummary.completion, 100)} />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Savings Goals</CardTitle>
            </CardHeader>
            <CardContent>
              {goals.length === 0 ? (
                <p className="text-sm text-muted-foreground">No goals created yet.</p>
              ) : (
                <div className="space-y-3">
                  {goals.map((goal) => {
                    const pct = goal.targetAmount > 0 ? (goal.currentAmount / goal.targetAmount) * 100 : 0;
                    return (
                      <div key={goal.id} className="rounded-lg border p-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{goal.title}</p>
                            <div className="mt-1 flex items-center gap-2">
                              <Badge variant="secondary">{humanizeEnum(goal.status)}</Badge>
                              {goal.targetDate && (
                                <p className="text-xs text-muted-foreground">
                                  Target: {formatRelativeDate(goal.targetDate)}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="sm" onClick={() => addContribution(goal)}>
                              <ArrowDownUp className="mr-2 h-4 w-4" /> Add
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => deleteGoal(goal.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                        <div className="mt-2 space-y-1">
                          <p className="text-sm">
                            {formatCurrency(goal.currentAmount)} of {formatCurrency(goal.targetAmount)}
                          </p>
                          <Progress value={Math.min(pct, 100)} className="h-2" />
                          <p className="text-xs text-muted-foreground">{Math.round(pct)}% complete</p>
                        </div>
                        {goal.note && <p className="mt-2 text-xs text-muted-foreground">{goal.note}</p>}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
