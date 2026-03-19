"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ArrowUpRight,
  Bell,
  CalendarClock,
  PieChart,
  Clock3,
  Download,
  DollarSign,
  HandCoins,
  LayoutTemplate,
  PiggyBank,
  TrendingDown,
  TrendingUp,
  UserRound,
  Users,
  Wallet,
  Plus,
  Repeat,
  Search,
  Star,
} from "lucide-react";
import { formatCurrency, formatRelativeDate, getCategoryInfo } from "@/lib/utils";
import { MonthlySpendingChart, CategoryPieChart, GroupSpendingChart } from "@/components/charts/dashboard-charts";

interface DashboardData {
  totalExpensesThisMonth: number;
  youOwe: number;
  youAreOwed: number;
  groupsCount: number;
  recentExpenses: any[];
  monthlySpending: { month: string; amount: number }[];
  categorySpending: { name: string; value: number }[];
  groupSpending: { name: string; amount: number }[];
}

interface FinanceOverview {
  incomeThisMonth: number;
  totalExpensesThisMonth: number;
  monthlyCashflow: number;
  netWorth: number;
}

const QUICK_ACTIONS = [
  { href: "/groups", label: "Add Group Expense", icon: Plus },
  { href: "/personal-expenses?tab=expenses", label: "Add Personal Expense", icon: Wallet },
  { href: "/personal-expenses?tab=income", label: "Add Income", icon: TrendingUp },
  { href: "/personal-expenses?tab=investments", label: "Track Investment", icon: PieChart },
  { href: "/personal-expenses?tab=goals", label: "Add Savings Goal", icon: PiggyBank },
  { href: "/settlements", label: "Settle Balances", icon: HandCoins },
];

const MODULE_LINKS = [
  { href: "/search", title: "Search", subtitle: "Find any expense in seconds", icon: Search },
  { href: "/recurring", title: "Recurring", subtitle: "Automate repeat bills", icon: Repeat },
  { href: "/templates", title: "Templates", subtitle: "Reuse split patterns", icon: LayoutTemplate },
  { href: "/reminders", title: "Reminders", subtitle: "Follow up pending payments", icon: CalendarClock },
  { href: "/analytics", title: "Analytics", subtitle: "Visual trend insights", icon: PieChart },
  { href: "/export-center", title: "Export", subtitle: "Download finance reports", icon: Download },
  { href: "/starred", title: "Starred", subtitle: "Pinned important expenses", icon: Star },
  { href: "/notifications", title: "Notifications", subtitle: "Stay in sync in real-time", icon: Bell },
  { href: "/profile", title: "Profile", subtitle: "Manage account and settings", icon: UserRound },
];

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [finance, setFinance] = useState<FinanceOverview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/dashboard").then((r) => r.json()),
      fetch("/api/finance-overview").then((r) => r.json()),
    ])
      .then(([dashboard, overview]) => {
        setData(dashboard);
        setFinance(overview);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Command Center</h1>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse pro-surface">
              <CardContent className="p-6">
                <div className="h-16 bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/12 via-background to-amber-200/20 p-6 md:p-8">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-background/75 px-3 py-1 text-xs font-semibold text-primary">
          <Clock3 className="h-3.5 w-3.5" />
          Financial Command Center
        </div>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <h1 className="text-3xl font-bold md:text-4xl">Make smarter money decisions daily</h1>
            <p className="mt-2 text-sm text-muted-foreground md:text-base">
              Everything is connected now: personal expenses, shared splits, income, investments,
              liabilities, recurring flows, reminders, and reports.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/groups">
              <Button>
                <Plus className="mr-2 h-4 w-4" /> Add Group Expense
              </Button>
            </Link>
            <Link href="/personal-expenses?tab=income">
              <Button variant="outline">
                <TrendingUp className="mr-2 h-4 w-4" /> Add Income
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Core Metrics</h2>
        <Link href="/personal-expenses">
          <Button>
            <ArrowUpRight className="mr-2 h-4 w-4" /> Open Finance Hub
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="pro-surface">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Income This Month</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(finance?.incomeThisMonth || 0)}
            </div>
          </CardContent>
        </Card>

        <Card className="pro-surface">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(finance?.totalExpensesThisMonth || data.totalExpensesThisMonth)}
            </div>
          </CardContent>
        </Card>

        <Card className="pro-surface">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Cashflow</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${(finance?.monthlyCashflow || 0) >= 0 ? "text-green-600" : "text-destructive"}`}
            >
              {formatCurrency(finance?.monthlyCashflow || 0)}
            </div>
          </CardContent>
        </Card>

        <Card className="pro-surface">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Estimated Net Worth</CardTitle>
            <PieChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(finance?.netWorth || 0)}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="pro-surface">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">You Owe</CardTitle>
            <TrendingDown className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {formatCurrency(data.youOwe)}
            </div>
          </CardContent>
        </Card>

        <Card className="pro-surface">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">You Are Owed</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(data.youAreOwed)}
            </div>
          </CardContent>
        </Card>

        <Card className="pro-surface">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Groups</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.groupsCount}</div>
          </CardContent>
        </Card>

        <Card className="pro-surface">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Quick Settlements</CardTitle>
            <HandCoins className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <Link href="/settlements" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
              Open Settlements <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </CardContent>
        </Card>
      </div>

      <Card className="pro-surface">
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {QUICK_ACTIONS.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="group flex items-center justify-between rounded-2xl border bg-background/70 px-4 py-3 transition-all hover:border-primary/40 hover:bg-primary/5"
            >
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-primary/10 p-2 text-primary">
                  <action.icon className="h-4 w-4" />
                </div>
                <span className="text-sm font-medium">{action.label}</span>
              </div>
              <ArrowUpRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </Link>
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="col-span-1 lg:col-span-2 pro-surface">
          <CardHeader>
            <CardTitle>Monthly Spending</CardTitle>
          </CardHeader>
          <CardContent>
            <MonthlySpendingChart data={data.monthlySpending} />
          </CardContent>
        </Card>

        <Card className="pro-surface">
          <CardHeader>
            <CardTitle>Category Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <CategoryPieChart data={data.categorySpending} />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="pro-surface">
          <CardHeader>
            <CardTitle>Group Spending</CardTitle>
          </CardHeader>
          <CardContent>
            <GroupSpendingChart data={data.groupSpending} />
          </CardContent>
        </Card>

        <Card className="pro-surface">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Expenses</CardTitle>
            <Link href="/groups" className="text-sm text-primary hover:underline flex items-center gap-1">
              View all <ArrowUpRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent>
            {data.recentExpenses.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8">
                <div className="rounded-full bg-primary/10 p-3 mb-3">
                  <Plus className="h-5 w-5 text-primary" />
                </div>
                <p className="text-sm font-medium">No expenses yet</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Add your first expense in a group
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {data.recentExpenses.map((expense) => {
                  const cat = getCategoryInfo(expense.category);
                  return (
                    <div
                      key={expense.id}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{cat.icon}</span>
                        <div>
                          <p className="font-medium text-sm">{expense.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {expense.paidBy.name} &middot; {expense.group.name}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-sm">
                          {formatCurrency(expense.amount)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatRelativeDate(expense.date)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="pro-surface">
        <CardHeader>
          <CardTitle>Connected Modules</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {MODULE_LINKS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group rounded-2xl border bg-background/70 p-4 transition-all hover:border-primary/40 hover:bg-primary/5"
            >
              <div className="mb-3 inline-flex rounded-lg bg-primary/10 p-2 text-primary">
                <item.icon className="h-4 w-4" />
              </div>
              <p className="font-semibold">{item.title}</p>
              <p className="mt-1 text-xs text-muted-foreground">{item.subtitle}</p>
              <div className="mt-3 inline-flex items-center gap-1 text-xs text-primary">
                Open <ArrowUpRight className="h-3.5 w-3.5" />
              </div>
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
