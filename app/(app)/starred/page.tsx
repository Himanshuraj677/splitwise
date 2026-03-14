"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Star, Trash2 } from "lucide-react";
import { formatCurrency, formatDate, getCategoryInfo } from "@/lib/utils";
import Link from "next/link";

interface StarredExpense {
  id: string;
  title: string;
  amount: number;
  category: string;
  date: string;
  tags: string[];
  approvalStatus: string;
  paidBy: { id: string; name: string };
  group: { id: string; name: string; currency: string };
  starredAt: string;
}

export default function StarredPage() {
  const [starred, setStarred] = useState<StarredExpense[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStarred();
  }, []);

  async function loadStarred() {
    const res = await fetch("/api/starred");
    const data = await res.json();
    setStarred(data.starred || []);
    setLoading(false);
  }

  async function unstar(expenseId: string) {
    await fetch("/api/starred", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ expenseId }),
    });
    setStarred((prev) => prev.filter((e) => e.id !== expenseId));
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
        <h1 className="text-3xl font-bold">Starred Expenses</h1>
        <Badge variant="secondary">{starred.length} starred</Badge>
      </div>

      {starred.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="rounded-full bg-yellow-100 dark:bg-yellow-900 p-4 mb-4">
              <Star className="h-8 w-8 text-yellow-500" />
            </div>
            <h3 className="font-semibold">No starred expenses</h3>
            <p className="text-sm text-muted-foreground mt-1 text-center max-w-sm">
              Star important expenses from group pages or search results for quick access.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {starred.map((expense) => {
            const cat = getCategoryInfo(expense.category);
            return (
              <Card key={expense.id}>
                <CardContent className="flex items-center justify-between py-4">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="text-2xl">{cat.icon}</div>
                    <div className="min-w-0">
                      <Link
                        href={`/groups/${expense.group.id}`}
                        className="font-medium truncate hover:underline block"
                      >
                        {expense.title}
                      </Link>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                        <span>{expense.group.name}</span>
                        <span>·</span>
                        <span>Paid by {expense.paidBy.name}</span>
                        <span>·</span>
                        <span>{formatDate(expense.date)}</span>
                      </div>
                      {expense.tags.length > 0 && (
                        <div className="flex gap-1 mt-1">
                          {expense.tags.map((t) => (
                            <Badge key={t} variant="secondary" className="text-xs">
                              {t}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-4">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => unstar(expense.id)}
                    >
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    </Button>
                    <span className="font-semibold">
                      {formatCurrency(expense.amount, expense.group.currency)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
