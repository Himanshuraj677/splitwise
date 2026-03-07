"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

const PIE_COLORS = [
  "#22c55e", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6",
  "#06b6d4", "#ec4899", "#f97316", "#14b8a6", "#6366f1",
];

interface MonthlyData {
  month: string;
  total: number;
}

interface CategoryData {
  category: string;
  total: number;
}

interface GroupData {
  groupId: string;
  groupName: string;
  total: number;
}

export default function AnalyticsPage() {
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [categoryData, setCategoryData] = useState<CategoryData[]>([]);
  const [groupData, setGroupData] = useState<GroupData[]>([]);
  const [loading, setLoading] = useState(true);
  const [groups, setGroups] = useState<{ id: string; name: string }[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string>("all");

  useEffect(() => {
    fetch("/api/groups")
      .then((r) => r.json())
      .then((d) => setGroups(d.groups || []));
    loadAnalytics();
  }, []);

  useEffect(() => {
    loadAnalytics();
  }, [selectedGroup]);

  async function loadAnalytics() {
    setLoading(true);
    const params = selectedGroup !== "all" ? `?groupId=${selectedGroup}` : "";
    const res = await fetch(`/api/analytics${params}`);
    const data = await res.json();
    setMonthlyData(data.monthlyData || []);
    setCategoryData(data.categoryBreakdown || []);
    setGroupData(data.groupBreakdown || []);
    setLoading(false);
  }

  const totalSpent = monthlyData.reduce((s, d) => s + d.total, 0);
  const avgMonthly = monthlyData.length > 0 ? totalSpent / monthlyData.length : 0;
  const topCategory =
    categoryData.length > 0
      ? categoryData.reduce((max, c) => (c.total > max.total ? c : max), categoryData[0])
      : null;

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
        <h1 className="text-3xl font-bold">Analytics</h1>
        <Select value={selectedGroup} onValueChange={setSelectedGroup}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All Groups" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Groups</SelectItem>
            {groups.map((g) => (
              <SelectItem key={g.id} value={g.id}>
                {g.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Spent (12 months)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(totalSpent)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Monthly Average
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(avgMonthly)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Top Category
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold capitalize">
              {topCategory?.category || "N/A"}
            </p>
            {topCategory && (
              <p className="text-sm text-muted-foreground">
                {formatCurrency(topCategory.total)}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Monthly Spending Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Monthly Spending Trend</CardTitle>
        </CardHeader>
        <CardContent>
          {monthlyData.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">
              No spending data available
            </p>
          ) : (
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" fontSize={12} />
                  <YAxis fontSize={12} tickFormatter={(v) => `₹${v}`} />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Bar dataKey="total" fill="hsl(142, 76%, 36%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Category Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Category Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            {categoryData.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-8">
                No data
              </p>
            ) : (
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryData}
                      dataKey="total"
                      nameKey="category"
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                    >
                      {categoryData.map((_, idx) => (
                        <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Group Breakdown */}
        {selectedGroup === "all" && (
          <Card>
            <CardHeader>
              <CardTitle>Spending by Group</CardTitle>
            </CardHeader>
            <CardContent>
              {groupData.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-8">
                  No data
                </p>
              ) : (
                <div className="space-y-3">
                  {groupData
                    .sort((a, b) => b.total - a.total)
                    .map((g, idx) => {
                      const maxTotal = groupData[0]?.total || 1;
                      const pct = (g.total / maxTotal) * 100;
                      return (
                        <div key={g.groupId}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="truncate">{g.groupName}</span>
                            <span className="font-medium shrink-0 ml-2">
                              {formatCurrency(g.total)}
                            </span>
                          </div>
                          <div className="h-2 rounded-full bg-secondary">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${pct}%`,
                                backgroundColor: PIE_COLORS[idx % PIE_COLORS.length],
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
