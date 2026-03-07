"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
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
import { getCategoryInfo } from "@/lib/utils";

const COLORS = [
  "#22c55e", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6",
  "#06b6d4", "#ec4899", "#f97316", "#14b8a6", "#6366f1",
];

interface AnalyticsData {
  monthlyData: { month: string; amount: number }[];
  categoryBreakdown: { name: string; value: number }[];
  memberContributions: { name: string; amount: number }[];
  totalSpending: number;
}

export function GroupAnalyticsCharts({ groupId }: { groupId: string }) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/analytics?groupId=${groupId}`)
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, [groupId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!data) return null;

  const categoryData = data.categoryBreakdown.map((d) => ({
    ...d,
    name: getCategoryInfo(d.name).label,
  }));

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card className="col-span-full">
        <CardHeader>
          <CardTitle>Monthly Group Expenses</CardTitle>
        </CardHeader>
        <CardContent>
          {data.monthlyData.every((d) => d.amount === 0) ? (
            <p className="text-center text-sm text-muted-foreground py-12">
              No data yet
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.monthlyData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
                <Bar dataKey="amount" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Category Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          {categoryData.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-12">
              No data yet
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {categoryData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Member Contributions</CardTitle>
        </CardHeader>
        <CardContent>
          {data.memberContributions.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-12">
              No data yet
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.memberContributions} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis type="number" className="text-xs" />
                <YAxis dataKey="name" type="category" className="text-xs" width={80} />
                <Tooltip />
                <Bar dataKey="amount" fill="#3b82f6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
