"use client";

import { useEffect, useState } from "react";
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
  Search,
  Filter,
  Loader2,
  ChevronLeft,
  ChevronRight,
  X,
  Star,
} from "lucide-react";
import { formatCurrency, formatDate, getCategoryInfo, EXPENSE_CATEGORIES } from "@/lib/utils";
import Link from "next/link";

interface SearchResult {
  id: string;
  title: string;
  amount: number;
  category: string;
  date: string;
  tags: string[];
  splitType: string;
  approvalStatus: string;
  paidBy: { id: string; name: string };
  group: { id: string; name: string; currency: string };
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");
  const [tag, setTag] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [starredIds, setStarredIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Load starred expenses
    fetch("/api/starred")
      .then((r) => r.json())
      .then((d) => {
        const ids = new Set<string>((d.starred || []).map((e: any) => e.id));
        setStarredIds(ids);
      })
      .catch(() => {});
  }, []);

  async function doSearch(page = 1) {
    setLoading(true);
    setSearched(true);

    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (category) params.set("category", category);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    if (minAmount) params.set("minAmount", minAmount);
    if (maxAmount) params.set("maxAmount", maxAmount);
    if (tag) params.set("tag", tag);
    params.set("page", page.toString());

    const res = await fetch(`/api/search?${params}`);
    const data = await res.json();

    setResults(data.expenses || []);
    setPagination(data.pagination || null);
    setLoading(false);
  }

  async function toggleStar(expenseId: string) {
    const res = await fetch("/api/starred", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ expenseId }),
    });
    const data = await res.json();
    setStarredIds((prev) => {
      const next = new Set(prev);
      if (data.starred) next.add(expenseId);
      else next.delete(expenseId);
      return next;
    });
  }

  function clearFilters() {
    setQuery("");
    setCategory("");
    setDateFrom("");
    setDateTo("");
    setMinAmount("");
    setMaxAmount("");
    setTag("");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Search Expenses</h1>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
        >
          <Filter className="h-4 w-4 mr-2" />
          {showFilters ? "Hide Filters" : "Show Filters"}
        </Button>
      </div>

      {/* Search bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search expenses by title or note..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-10"
            onKeyDown={(e) => e.key === "Enter" && doSearch()}
          />
        </div>
        <Button onClick={() => doSearch()}>Search</Button>
      </div>

      {/* Filters */}
      {showFilters && (
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="All categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    {EXPENSE_CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.icon} {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>From Date</Label>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>To Date</Label>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Tag</Label>
                <Input
                  placeholder="Filter by tag"
                  value={tag}
                  onChange={(e) => setTag(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Min Amount</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={minAmount}
                  onChange={(e) => setMinAmount(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Max Amount</Label>
                <Input
                  type="number"
                  placeholder="Any"
                  value={maxAmount}
                  onChange={(e) => setMaxAmount(e.target.value)}
                />
              </div>
              <div className="col-span-2 flex items-end gap-2">
                <Button onClick={() => doSearch()} className="flex-1">
                  Apply Filters
                </Button>
                <Button variant="outline" onClick={clearFilters}>
                  <X className="h-4 w-4 mr-1" /> Clear
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {loading && (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {!loading && searched && results.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Search className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-semibold">No expenses found</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Try adjusting your search or filters.
            </p>
          </CardContent>
        </Card>
      )}

      {!loading && results.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {pagination?.total} result{pagination?.total !== 1 ? "s" : ""} found
          </p>

          {results.map((expense) => {
            const cat = getCategoryInfo(expense.category);
            const isStarred = starredIds.has(expense.id);
            return (
              <Card key={expense.id}>
                <CardContent className="flex items-center justify-between py-4">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="text-2xl">{cat.icon}</div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/groups/${expense.group.id}`}
                          className="font-medium truncate hover:underline"
                        >
                          {expense.title}
                        </Link>
                        {expense.approvalStatus === "PENDING" && (
                          <Badge variant="outline" className="text-yellow-600">Pending</Badge>
                        )}
                        {expense.approvalStatus === "REJECTED" && (
                          <Badge variant="destructive">Rejected</Badge>
                        )}
                      </div>
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
                      onClick={() => toggleStar(expense.id)}
                    >
                      <Star
                        className={`h-4 w-4 ${isStarred ? "fill-yellow-400 text-yellow-400" : ""}`}
                      />
                    </Button>
                    <span className="font-semibold">
                      {formatCurrency(expense.amount, expense.group.currency)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => doSearch(pagination.page - 1)}
                disabled={pagination.page <= 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => doSearch(pagination.page + 1)}
                disabled={pagination.page >= pagination.totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
