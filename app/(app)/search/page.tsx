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
import { PageGuide } from "@/components/layout/page-guide";

type SearchDomain =
  | "group_expense"
  | "personal_expense"
  | "settlement"
  | "income"
  | "investment"
  | "liability"
  | "goal"
  | "lend"
  | "reminder"
  | "recurring"
  | "template"
  | "group"
  | "notification";

interface DomainMeta {
  key: SearchDomain;
  label: string;
  fields: string[];
  count?: number;
}

const DEFAULT_SEARCHABLE_DOMAINS: DomainMeta[] = [
  { key: "group_expense", label: "Group Expenses", fields: ["title", "note", "category", "group name", "payer name", "tags"] },
  { key: "personal_expense", label: "Personal Expenses", fields: ["note", "category", "amount", "date"] },
  { key: "settlement", label: "Settlements", fields: ["note", "payer", "receiver", "group"] },
  { key: "income", label: "Income Entries", fields: ["source", "type", "note", "amount"] },
  { key: "investment", label: "Investments", fields: ["name", "type", "platform", "note"] },
  { key: "liability", label: "Liabilities", fields: ["name", "type", "note", "due date"] },
  { key: "goal", label: "Savings Goals", fields: ["title", "status", "note", "target date"] },
  { key: "lend", label: "Lends", fields: ["friend name", "contact", "note", "status"] },
  { key: "reminder", label: "Reminders", fields: ["message", "status", "amount"] },
  { key: "recurring", label: "Recurring Expenses", fields: ["title", "category", "frequency", "amount"] },
  { key: "template", label: "Expense Templates", fields: ["name", "title", "category", "amount"] },
  { key: "group", label: "Groups", fields: ["name", "description", "group type"] },
  { key: "notification", label: "Notifications", fields: ["title", "message", "type"] },
];

interface SearchResult {
  id: string;
  domain: SearchDomain;
  title: string;
  subtitle?: string;
  amount?: number;
  currency?: string;
  category?: string;
  date: string;
  route?: string;
  status?: string;
  note?: string | null;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [domain, setDomain] = useState<string>("all");
  const [category, setCategory] = useState("");
  const [month, setMonth] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");
  const [status, setStatus] = useState("");
  const [tag, setTag] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [domains, setDomains] = useState<DomainMeta[]>(DEFAULT_SEARCHABLE_DOMAINS);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [searchError, setSearchError] = useState("");
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [starredIds, setStarredIds] = useState<Set<string>>(new Set());
  const [availableCategories, setAvailableCategories] = useState<Array<{ value: string; label: string; icon: string }>>(
    EXPENSE_CATEGORIES.map((item) => ({ value: item.value, label: item.label, icon: item.icon }))
  );

  useEffect(() => {
    // Load starred expenses
    fetch("/api/starred")
      .then((r) => r.json())
      .then((d) => {
        const ids = new Set<string>((d.starred || []).map((e: any) => e.id));
        setStarredIds(ids);
      })
      .catch(() => {});

    fetch("/api/personal-expenses/categories")
      .then((r) => r.json())
      .then((d) => {
        if (!Array.isArray(d.categories)) return;

        setAvailableCategories((prev) => {
          const map = new Map(prev.map((item) => [item.value, item]));
          for (const item of d.categories) {
            map.set(item.value, {
              value: item.value,
              label: item.label,
              icon: item.icon,
            });
          }
          return Array.from(map.values());
        });
      })
      .catch(() => {});
  }, []);

  async function doSearch(page = 1, silent = false) {
    setLoading(true);
    setSearchError("");
    if (!silent) setSearched(true);

    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (domain && domain !== "all") params.set("domains", domain);
    if (category && category !== "all") params.set("category", category);
    if (month) params.set("month", month);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    if (minAmount) params.set("minAmount", minAmount);
    if (maxAmount) params.set("maxAmount", maxAmount);
    if (status) params.set("status", status);
    if (tag) params.set("tag", tag);
    params.set("page", page.toString());
    params.set("limit", "24");

    try {
      const res = await fetch(`/api/search?${params}`);
      const raw = await res.text();
      const data = raw ? JSON.parse(raw) : {};

      if (!res.ok) {
        throw new Error(data?.error || "Search request failed");
      }

      setResults(data.results || []);
      setDomains(data.domainSummary || data.searchableDomains || []);
      setPagination(data.pagination || null);
      setSearched(true);
    } catch (error: any) {
      setResults([]);
      setPagination(null);
      setSearchError(error?.message || "Unable to fetch search results right now.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const hasAnyFilter =
      query.trim().length > 0 ||
      domain !== "all" ||
      category.length > 0 ||
      month.length > 0 ||
      dateFrom.length > 0 ||
      dateTo.length > 0 ||
      minAmount.length > 0 ||
      maxAmount.length > 0 ||
      status.length > 0 ||
      tag.length > 0;

    if (!hasAnyFilter) {
      setResults([]);
      setPagination(null);
      setSearchError("");
      setSearched(false);
      return;
    }

    const timer = setTimeout(() => {
      doSearch(1, true);
    }, 450);

    return () => clearTimeout(timer);
  }, [query, domain, category, month, dateFrom, dateTo, minAmount, maxAmount, status, tag]);

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
    setDomain("all");
    setCategory("");
    setMonth("");
    setDateFrom("");
    setDateTo("");
    setMinAmount("");
    setMaxAmount("");
    setStatus("");
    setTag("");
  }

  function canStar(item: SearchResult) {
    return item.domain === "group_expense";
  }

  function getDomainLabel(domainKey: SearchDomain) {
    return domains.find((d) => d.key === domainKey)?.label || domainKey.replace(/_/g, " ");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Global Search</h1>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
        >
          <Filter className="h-4 w-4 mr-2" />
          {showFilters ? "Hide Filters" : "Show Filters"}
        </Button>
      </div>

      <PageGuide
        id="search-scope"
        title="What You Can Search Across The App"
        subtitle="See searchable modules and fields"
      >
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {domains.map((d) => (
            <div key={d.key} className="rounded-lg border p-3">
              <div className="flex items-center justify-between">
                <p className="font-medium text-sm">{d.label}</p>
                {typeof d.count === "number" && (
                  <Badge variant="secondary">{d.count}</Badge>
                )}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Search fields: {d.fields.join(", ")}
              </p>
            </div>
          ))}
          {domains.length === 0 && (
            <p className="text-sm text-muted-foreground">Run a search to load searchable modules and counts.</p>
          )}
        </div>
      </PageGuide>

      {/* Search bar */}
      <div className="flex flex-col md:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search notes, people, categories, groups, goals, reminders..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-10"
            onKeyDown={(e) => e.key === "Enter" && doSearch()}
          />
        </div>
        <div className="w-full md:w-60">
          <Select value={domain} onValueChange={setDomain}>
            <SelectTrigger>
              <SelectValue placeholder="All modules" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All modules</SelectItem>
              {domains.map((d) => (
                <SelectItem key={d.key} value={d.key}>
                  {d.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => doSearch()}>Search</Button>
      </div>

      <PageGuide
        id="search-tips"
        title="Search Tips"
        subtitle="Debounce, month filter, and faster results"
      >
        <p className="text-xs text-muted-foreground">
          Debounced search is enabled (450ms). Enter a month to quickly scan all matching records in that period.
        </p>
      </PageGuide>

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
                    {availableCategories.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.icon} {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Month</Label>
                <Input
                  type="month"
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                />
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
                <Label>Status / Type</Label>
                <Input
                  placeholder="e.g. PENDING, COMPLETED"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
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
            <h3 className="font-semibold">{searchError ? "Search failed" : "No results found"}</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {searchError || "Try adjusting your search or filters."}
            </p>
          </CardContent>
        </Card>
      )}

      {!loading && results.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {pagination?.total} result{pagination?.total !== 1 ? "s" : ""} found
          </p>

          {results.map((item) => {
            const cat = getCategoryInfo(item.category || "");
            const isStarred = starredIds.has(item.id);
            const content = (
              <>
                <div className="text-2xl">{cat.icon || "🔎"}</div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium truncate">{item.title}</span>
                    <Badge variant="outline" className="uppercase text-[10px]">
                      {getDomainLabel(item.domain)}
                    </Badge>
                    {item.status && (
                      <Badge variant="secondary" className="text-[10px]">
                        {item.status}
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5 flex-wrap">
                    {item.subtitle && <span>{item.subtitle}</span>}
                    {item.category && (
                      <>
                        <span>·</span>
                        <span>{item.category}</span>
                      </>
                    )}
                    <span>·</span>
                    <span>{formatDate(item.date)}</span>
                  </div>

                  {item.note && (
                    <p className="mt-1 text-xs text-muted-foreground truncate">{item.note}</p>
                  )}
                </div>
              </>
            );

            return (
              <Card key={`${item.domain}-${item.id}`}>
                <CardContent className="flex items-center justify-between py-4">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {item.route ? (
                      <Link href={item.route} className="flex items-center gap-3 min-w-0 flex-1 hover:opacity-90">
                        {content}
                      </Link>
                    ) : (
                      content
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-4">
                    {canStar(item) && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => toggleStar(item.id)}
                      >
                        <Star
                          className={`h-4 w-4 ${isStarred ? "fill-yellow-400 text-yellow-400" : ""}`}
                        />
                      </Button>
                    )}
                    {typeof item.amount === "number" && (
                      <span className="font-semibold">
                        {formatCurrency(item.amount, item.currency || "INR")}
                      </span>
                    )}
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
